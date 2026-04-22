import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAgentStore } from '../store/agentStore';
import { useSocketStore } from '../store/socketStore';
import { Room } from './Room';
import type { Agent, Office, Room as RoomType } from '../types';

const GRID_COLS = 5;
const GRID_ROWS = 3;

// Width/height of a single office box in canvas-space (px)
const OFFICE_WIDTH  = 560;
const OFFICE_HEIGHT = 300;

function makeRoomsForOffice(officeId: string): RoomType[] {
  return Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => ({
    id: `${officeId}:room-${String(i + 1).padStart(2, '0')}`,
    agentId: null,
    gridCol: (i % GRID_COLS) + 1,
    gridRow: Math.floor(i / GRID_COLS) + 1,
  }));
}

// Fallback office used when no offices are configured in the backend yet,
// so the map still shows something useful.
const FALLBACK_OFFICE: Office = {
  id: '__default__',
  teamId: '',
  name: 'Office',
  position: { x: 0, y: 0 },
};

interface Props {
  onAgentClick: (agentId: string) => void;
  onEmptyRoomClick?: (roomId: string) => void;
  onEditAgent?: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
}

interface DelegationLine {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

interface OfficeLinkLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

interface DragState {
  agent: Agent;
  sourceRoomId: string;
  x: number;
  y: number;
}

interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export function OfficeMap({ onAgentClick, onEmptyRoomClick, onEditAgent, onDeleteAgent }: Props) {
  const agents             = useAgentStore((s) => s.agents);
  const currentTeamId      = useAgentStore((s) => s.currentTeamId);
  const activeDelegations  = useAgentStore((s) => s.activeDelegations);
  const swapAgentRooms     = useAgentStore((s) => s.swapAgentRooms);
  const moveAgentRoom      = useSocketStore((s) => s.moveAgentRoom);
  const storeOffices       = useAgentStore((s) => s.offices);
  const officeLinks        = useAgentStore((s) => s.officeLinks);

  // ── Rename agent ──────────────────────────────────────────────────────────

  const handleRenameAgent = async (agentId: string, name: string) => {
    await fetch(`/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  };

  // ── Role toggle ────────────────────────────────────────────────────────────

  const handleToggleRole = async (agentId: string, currentRole: 'leader' | 'member' | undefined) => {
    const nextRole = currentRole === 'leader' ? 'member' : 'leader';
    await fetch(`/api/agents/${agentId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });
  };

  // ── Add office ─────────────────────────────────────────────────────────────

  const handleAddOffice = async () => {
    if (!currentTeamId) return;
    const existingForTeam = storeOffices.filter((o) => o.teamId === currentTeamId);
    const offsetX = existingForTeam.length * (OFFICE_WIDTH + 60);
    await fetch('/api/offices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: currentTeamId,
        name: 'New Office',
        position: { x: offsetX, y: 0 },
      }),
    });
  };

  // ── Drag ──────────────────────────────────────────────────────────────────

  const [drag, setDrag]           = useState<DragState | null>(null);
  const [hoverRoomId, setHoverRoomId] = useState<string | null>(null);
  const [delegationLines, setDelegationLines] = useState<DelegationLine[]>([]);
  const [officeLinkLines, setOfficeLinkLines] = useState<OfficeLinkLine[]>([]);

  const hoverRoomRef    = useRef<string | null>(null);
  const agentByRoomRef  = useRef<Map<string, Agent>>(new Map());
  const dragRef         = useRef<DragState | null>(null);
  const canvasRef       = useRef<HTMLDivElement>(null);
  const outerRef        = useRef<HTMLDivElement>(null);

  // ── Zoom / pan ────────────────────────────────────────────────────────────

  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  const isPanning      = useRef(false);
  const panStart       = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const transformRef   = useRef<CanvasTransform>(transform);
  transformRef.current = transform;

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const ZOOM_SPEED = 0.001;
    const MIN_SCALE  = 0.3;
    const MAX_SCALE  = 2.0;

    const outer = outerRef.current;
    if (!outer) return;
    const rect = outer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => {
      const delta  = -e.deltaY * ZOOM_SPEED;
      const factor = Math.exp(delta * 2);
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      // Zoom around the cursor position
      const scaleRatio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: mouseX - scaleRatio * (mouseX - prev.x),
        y: mouseY - scaleRatio * (mouseY - prev.y),
      };
    });
  }, []);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDownCanvas = useCallback((e: React.MouseEvent) => {
    // Only pan on middle-button or when Alt/Space is held, OR on the background itself
    const target = e.target as HTMLElement;
    const isBackground = target === canvasRef.current || target === outerRef.current;
    if (!isBackground && e.button !== 1) return;
    if (e.button === 0 && !isBackground) return;

    isPanning.current = true;
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
    };
    document.body.classList.add('is-panning');
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setTransform((prev) => ({
        ...prev,
        x: panStart.current.tx + dx,
        y: panStart.current.ty + dy,
      }));
    };
    const onUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        document.body.classList.remove('is-panning');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const teamAgents = useMemo(
    () => (currentTeamId ? agents.filter((a) => a.teamId === currentTeamId) : agents),
    [agents, currentTeamId],
  );

  // Offices to show: either those belonging to current team, or a single fallback
  const teamOffices: Office[] = useMemo(() => {
    const filtered = storeOffices.filter((o) => o.teamId === currentTeamId);
    if (filtered.length > 0) return filtered;
    // Fallback: one virtual office so the grid is always visible
    return [{ ...FALLBACK_OFFICE, teamId: currentTeamId ?? '' }];
  }, [storeOffices, currentTeamId]);

  // Map roomId → agent (for rooms that include an officeId prefix)
  const agentByRoom = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const agent of teamAgents) {
      // roomId may be plain "room-01" or prefixed "officeId:room-01"
      m.set(agent.roomId, agent);
      // Also index by the full prefixed form for whichever office the agent belongs to
      if (agent.officeId) {
        m.set(`${agent.officeId}:${agent.roomId}`, agent);
      }
    }
    return m;
  }, [teamAgents]);
  agentByRoomRef.current = agentByRoom;

  // ── Delegation & office-link lines ────────────────────────────────────────

  const computeLines = useCallback(() => {
    if (!canvasRef.current) { setDelegationLines([]); setOfficeLinkLines([]); return; }
    const canvasEl = canvasRef.current;

    // Delegation lines
    const dlResult: DelegationLine[] = [];
    if (activeDelegations.size > 0) {
      for (const [fromAgentId, toAgentId] of activeDelegations.entries()) {
        const fromAgent = teamAgents.find((a) => a.id === fromAgentId);
        const toAgent   = teamAgents.find((a) => a.id === toAgentId);
        if (!fromAgent || !toAgent) continue;
        // Query using the data-room-id attribute which is set on the room div
        const fromEl = canvasEl.querySelector<HTMLElement>(`[data-room-id="${CSS.escape(fromAgent.roomId)}"]`);
        const toEl   = canvasEl.querySelector<HTMLElement>(`[data-room-id="${CSS.escape(toAgent.roomId)}"]`);
        if (!fromEl || !toEl) continue;
        const canvasRect = canvasEl.getBoundingClientRect();
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        // Convert from viewport coords to canvas-space, accounting for transform
        const s = transformRef.current.scale;
        dlResult.push({
          x1: (fr.left - canvasRect.left + fr.width  / 2) / s,
          y1: (fr.top  - canvasRect.top  + fr.height / 2) / s,
          x2: (tr.left - canvasRect.left + tr.width  / 2) / s,
          y2: (tr.top  - canvasRect.top  + tr.height / 2) / s,
          color: fromAgent.avatarColor,
        });
      }
    }
    setDelegationLines(dlResult);

    // Office link lines (computed from office positions, not DOM)
    const olResult: OfficeLinkLine[] = [];
    for (const link of officeLinks) {
      const from = teamOffices.find((o) => o.id === link.fromOfficeId);
      const to   = teamOffices.find((o) => o.id === link.toOfficeId);
      if (!from || !to) continue;
      olResult.push({
        x1: from.position.x + OFFICE_WIDTH  / 2,
        y1: from.position.y + OFFICE_HEIGHT / 2,
        x2: to.position.x   + OFFICE_WIDTH  / 2,
        y2: to.position.y   + OFFICE_HEIGHT / 2,
      });
    }
    setOfficeLinkLines(olResult);
  }, [activeDelegations, teamAgents, officeLinks, teamOffices]);

  useEffect(() => { computeLines(); }, [computeLines]);
  useEffect(() => {
    window.addEventListener('resize', computeLines);
    return () => window.removeEventListener('resize', computeLines);
  }, [computeLines]);

  // Also recompute after transform changes (so delegation lines stay aligned)
  useEffect(() => { computeLines(); }, [transform, computeLines]);

  // ── Agent drag ────────────────────────────────────────────────────────────

  const startDrag = useCallback((agent: Agent, sourceRoomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const state = { agent, sourceRoomId, x: e.clientX, y: e.clientY };
    dragRef.current = state;
    setDrag(state);
    document.body.classList.add('is-dragging');
  }, []);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      const next = { ...dragRef.current!, x: e.clientX, y: e.clientY };
      dragRef.current = next;
      setDrag(next);

      const ghostEl = document.querySelector('.drag-ghost') as HTMLElement | null;
      if (ghostEl) ghostEl.style.display = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (ghostEl) ghostEl.style.display = '';

      const id = el?.closest('[data-room-id]')?.getAttribute('data-room-id') ?? null;
      hoverRoomRef.current = id;
      setHoverRoomId(id);
    };

    const onUp = () => {
      const d  = dragRef.current;
      const hr = hoverRoomRef.current;
      if (d && hr && hr !== d.sourceRoomId) {
        const targetAgent = agentByRoomRef.current.get(hr) ?? null;
        swapAgentRooms(d.agent.id, targetAgent?.id ?? null, d.sourceRoomId, hr);
        moveAgentRoom(d.agent.id, hr);
      }
      dragRef.current   = null;
      hoverRoomRef.current = null;
      setDrag(null);
      setHoverRoomId(null);
      document.body.classList.remove('is-dragging');
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag?.agent.id, swapAgentRooms, moveAgentRoom]);

  // ── Canvas bounds for SVG overlay ─────────────────────────────────────────

  // The SVG overlay needs to cover the full extents of all offices in canvas coords.
  // We add generous padding so lines between far-apart offices don't get clipped.
  const canvasBounds = useMemo(() => {
    if (teamOffices.length === 0) return { width: OFFICE_WIDTH + 120, height: OFFICE_HEIGHT + 120 };
    let maxX = 0; let maxY = 0;
    for (const o of teamOffices) {
      maxX = Math.max(maxX, o.position.x + OFFICE_WIDTH);
      maxY = Math.max(maxY, o.position.y + OFFICE_HEIGHT);
    }
    return { width: maxX + 120, height: maxY + 120 };
  }, [teamOffices]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const cssTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

  return (
    <div className="office-map" ref={outerRef} onMouseDown={handleMouseDownCanvas}>
      {/* Zoom/pan canvas */}
      <div
        className="office-canvas"
        ref={canvasRef}
        style={{
          transform: cssTransform,
          transformOrigin: '0 0',
          width: canvasBounds.width,
          height: canvasBounds.height,
        }}
      >
        {/* SVG overlay for office-link and delegation lines */}
        <svg
          className="office-canvas-svg"
          style={{ width: canvasBounds.width, height: canvasBounds.height }}
          aria-hidden="true"
        >
          <defs>
            {delegationLines.map((line, i) => (
              <marker key={i} id={`arrow-${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill={line.color} opacity="0.8" />
              </marker>
            ))}
          </defs>

          {/* Office link lines — static grey dashed */}
          {officeLinkLines.map((line, i) => (
            <line
              key={`ol-${i}`}
              x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
              stroke="#4b5563" strokeWidth="2" strokeDasharray="10 6"
              strokeLinecap="round" opacity="0.6"
            />
          ))}

          {/* Delegation lines — colored + animated */}
          {delegationLines.map((line, i) => (
            <line
              key={`dl-${i}`}
              x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
              stroke={line.color} strokeWidth="2" strokeDasharray="8 5"
              strokeLinecap="round" opacity="0.75"
              markerEnd={`url(#arrow-${i})`}
              className="delegation-dash-line"
            />
          ))}
        </svg>

        {/* Office boxes */}
        {teamOffices.map((office) => (
          <OfficeBox
            key={office.id}
            office={office}
            agentByRoom={agentByRoom}
            dragSourceRoomId={drag?.sourceRoomId ?? null}
            hoverRoomId={hoverRoomId}
            onAgentClick={onAgentClick}
            onEmptyRoomClick={onEmptyRoomClick}
            onEditAgent={onEditAgent}
            onDeleteAgent={onDeleteAgent}
            onRenameAgent={handleRenameAgent}
            onToggleRole={handleToggleRole}
            onStartDrag={startDrag}
          />
        ))}
      </div>

      {/* Zoom controls + Add Office button — fixed, outside the canvas transform */}
      <div className="office-map-controls">
        <button
          className="office-map-control-btn"
          title="Zoom in"
          onClick={() => setTransform((p) => ({ ...p, scale: Math.min(2, p.scale * 1.2) }))}
        >+</button>
        <button
          className="office-map-control-btn"
          title="Zoom out"
          onClick={() => setTransform((p) => ({ ...p, scale: Math.max(0.3, p.scale / 1.2) }))}
        >−</button>
        <button
          className="office-map-control-btn"
          title="Reset view"
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
        >⊡</button>
        {onEmptyRoomClick && (
          <button
            className="office-map-control-btn office-map-add-office-btn"
            title="Add office"
            onClick={handleAddOffice}
          >+ Office</button>
        )}
      </div>

      {/* Floating drag ghost */}
      {drag && (
        <div
          className="drag-ghost"
          style={{
            left: drag.x,
            top: drag.y,
            backgroundColor: drag.agent.avatarColor,
          }}
        >
          <span className="drag-ghost-initial">{drag.agent.name.charAt(0).toUpperCase()}</span>
          <span className="drag-ghost-name">{drag.agent.name}</span>
        </div>
      )}
    </div>
  );
}

// ── OfficeBox ─────────────────────────────────────────────────────────────────

interface OfficeBoxProps {
  office: Office;
  agentByRoom: Map<string, Agent>;
  dragSourceRoomId: string | null;
  hoverRoomId: string | null;
  onAgentClick: (agentId: string) => void;
  onEmptyRoomClick?: (roomId: string) => void;
  onEditAgent?: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
  onRenameAgent: (agentId: string, name: string) => void;
  onToggleRole: (agentId: string, currentRole: 'leader' | 'member' | undefined) => void;
  onStartDrag: (agent: Agent, sourceRoomId: string, e: React.MouseEvent) => void;
}

function OfficeBox({
  office,
  agentByRoom,
  dragSourceRoomId,
  hoverRoomId,
  onAgentClick,
  onEmptyRoomClick,
  onEditAgent,
  onDeleteAgent,
  onRenameAgent,
  onToggleRole,
  onStartDrag,
}: OfficeBoxProps) {
  const rooms = useMemo(() => makeRoomsForOffice(office.id), [office.id]);

  return (
    <div
      className="office-box"
      style={{
        left: office.position.x,
        top:  office.position.y,
        width: OFFICE_WIDTH,
        height: OFFICE_HEIGHT,
      }}
    >
      <div className="office-box-header">{office.name}</div>

      <div className="office-box-grid">
        {rooms.map((room) => {
          // Look up agent by full prefixed room ID first, then by raw room id segment
          const roomSegment = room.id.split(':').slice(1).join(':') || room.id;
          const agent =
            agentByRoom.get(room.id) ??
            agentByRoom.get(roomSegment) ??
            undefined;

          return (
            <RoomWithRole
              key={room.id}
              room={room}
              agent={agent}
              onAgentClick={onAgentClick}
              onEmptyRoomClick={!agent && onEmptyRoomClick ? () => onEmptyRoomClick(room.id) : undefined}
              isDragging={dragSourceRoomId === room.id}
              isDropTarget={hoverRoomId === room.id && dragSourceRoomId !== room.id}
              onMouseDown={(a, e) => onStartDrag(a, room.id, e)}
              onRenameAgent={onRenameAgent}
              onEditAgent={onEditAgent}
              onDeleteAgent={onDeleteAgent}
              onToggleRole={onToggleRole}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── RoomWithRole ──────────────────────────────────────────────────────────────
// Thin wrapper around Room that adds the leader crown badge and role toggle button.

interface RoomWithRoleProps {
  room: RoomType;
  agent?: Agent;
  onAgentClick: (agentId: string) => void;
  onEmptyRoomClick?: () => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onMouseDown: (agent: Agent, e: React.MouseEvent) => void;
  onRenameAgent?: (agentId: string, name: string) => void;
  onEditAgent?: (agentId: string) => void;
  onDeleteAgent?: (agentId: string) => void;
  onToggleRole: (agentId: string, currentRole: 'leader' | 'member' | undefined) => void;
}

function RoomWithRole({
  room,
  agent,
  onAgentClick,
  onEmptyRoomClick,
  isDragging,
  isDropTarget,
  onMouseDown,
  onRenameAgent,
  onEditAgent,
  onDeleteAgent,
  onToggleRole,
}: RoomWithRoleProps) {
  return (
    <Room
      room={room}
      agent={agent}
      onAgentClick={onAgentClick}
      onEmptyRoomClick={onEmptyRoomClick}
      isDragging={isDragging}
      isDropTarget={isDropTarget}
      onMouseDown={onMouseDown}
      onRenameAgent={onRenameAgent}
      onEditAgent={onEditAgent}
      onDeleteAgent={onDeleteAgent}
      extraActions={
        agent
          ? [
              {
                key: 'role',
                title: agent.role === 'leader' ? 'Make Member' : 'Make Leader',
                label: agent.role === 'leader' ? '♟' : '♛',
                className: agent.role === 'leader' ? '' : 'room-action-btn--leader',
                onClick: () => onToggleRole(agent.id, agent.role),
              },
            ]
          : []
      }
      leaderBadge={agent?.role === 'leader'}
    />
  );
}
