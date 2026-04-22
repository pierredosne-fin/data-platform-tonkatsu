import { useState, useRef, useEffect } from 'react';
import type { Room as RoomType, Agent } from '../types';
import { AgentAvatar } from './AgentAvatar';

export interface ExtraAction {
  key: string;
  title: string;
  label: string;
  className?: string;
  onClick: () => void;
}

interface Props {
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
  /** Additional action buttons rendered in the room-actions tray. */
  extraActions?: ExtraAction[];
  /** When true, renders a crown badge on the agent avatar. */
  leaderBadge?: boolean;
}

export function Room({
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
  extraActions,
  leaderBadge,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (agent) openTimer.current = setTimeout(() => onAgentClick(agent.id), 2000);
  };

  const handleMouseLeave = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startRename = () => {
    if (!agent) return;
    setEditName(agent.name);
    setEditing(true);
  };

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== agent?.name && agent) {
      onRenameAgent?.(agent.id, trimmed);
    }
    setEditing(false);
  };

  const cancelRename = () => setEditing(false);

  const classNames = [
    'room',
    agent ? `room--occupied room--${agent.status}` : 'room--vacant',
    isDragging ? 'room--dragging' : '',
    isDropTarget ? 'room--drop-target' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasActions = agent && (onEditAgent || onDeleteAgent || (extraActions && extraActions.length > 0));

  // Derive a human-readable label for the room slot
  // Room IDs may be prefixed with an officeId like "office123:room-01"
  const rawRoomSegment = room.id.includes(':') ? room.id.split(':').slice(1).join(':') : room.id;
  const roomLabel = `Room ${rawRoomSegment.replace('room-', '')}`;

  return (
    <div
      className={classNames}
      data-room-id={room.id}
      style={{ gridColumn: room.gridCol, gridRow: room.gridRow, cursor: !agent && onEmptyRoomClick ? 'pointer' : undefined }}
      onClick={!agent && onEmptyRoomClick ? onEmptyRoomClick : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="room-label">
        {agent ? (
          editing ? (
            <input
              ref={inputRef}
              className="room-label-rename-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                else if (e.key === 'Escape') cancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); startRename(); }}
              title="Double-click to rename"
            >
              {agent.name}
            </span>
          )
        ) : (
          roomLabel
        )}
      </div>
      <div className="room-content">
        {agent ? (
          <div
            className="room-draggable"
            style={{ position: 'relative' }}
            onMouseDown={(e) => onMouseDown(agent, e)}
          >
            <AgentAvatar agent={agent} onClick={() => onAgentClick(agent.id)} />
            {leaderBadge && (
              <span className="room-leader-crown" title="Leader">♛</span>
            )}
          </div>
        ) : (
          <span className="room-vacant-text">
            {onEmptyRoomClick ? '+' : ''}
          </span>
        )}
      </div>
      {hasActions && (
        <div className="room-actions">
          {extraActions?.map((action) => (
            <button
              key={action.key}
              className={['room-action-btn', action.className ?? ''].filter(Boolean).join(' ')}
              title={action.title}
              onClick={(e) => { e.stopPropagation(); action.onClick(); }}
            >{action.label}</button>
          ))}
          {onEditAgent && (
            <button
              className="room-action-btn"
              title="Edit agent"
              onClick={(e) => { e.stopPropagation(); onEditAgent(agent!.id); }}
            >✎</button>
          )}
          {onDeleteAgent && (
            <button
              className="room-action-btn room-action-btn--danger"
              title="Delete agent"
              onClick={(e) => { e.stopPropagation(); onDeleteAgent(agent!.id); }}
            >✕</button>
          )}
        </div>
      )}
      {agent?.status === 'pending' && (
        <div className="room-pending-badge">Needs input</div>
      )}
      {agent?.status === 'delegating' && (
        <div className="room-delegating-badge">Waiting for agent</div>
      )}
    </div>
  );
}
