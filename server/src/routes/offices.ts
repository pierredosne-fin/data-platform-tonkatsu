import { Router } from 'express';
import { z } from 'zod';
import type { Server } from 'socket.io';
import * as agentService from '../services/agentService.js';

export function createOfficesRouter(io: Server): Router {
  const router = Router();

  // GET /api/offices?teamId=xxx
  router.get('/', (req, res) => {
    const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : undefined;
    if (!teamId) {
      res.status(400).json({ error: 'teamId query param required' });
      return;
    }
    res.json({
      offices: agentService.getOfficesByTeam(teamId),
      officeGroups: agentService.getOfficeGroupsByTeam(teamId),
      officeLinks: agentService.getOfficeLinksByTeam(teamId),
    });
  });

  const LinkSchema = z.object({
    teamId: z.string().min(1),
    fromOfficeId: z.string().min(1),
    toOfficeId: z.string().min(1),
  });

  // POST /api/offices/links — must be before /:id to avoid route conflict
  router.post('/links', (req, res) => {
    const result = LinkSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { teamId, fromOfficeId, toOfficeId } = result.data;
    const link = agentService.createOfficeLink(teamId, fromOfficeId, toOfficeId);
    if (!link) {
      res.status(404).json({ error: 'One or both offices not found in this team' });
      return;
    }
    io.emit('office:linkCreated', { teamId, ...link });
    res.status(201).json(link);
  });

  // DELETE /api/offices/links — must be before /:id to avoid route conflict
  router.delete('/links', (req, res) => {
    const result = LinkSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { teamId, fromOfficeId, toOfficeId } = result.data;
    const deleted = agentService.deleteOfficeLink(teamId, fromOfficeId, toOfficeId);
    if (!deleted) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    io.emit('office:linkDeleted', { teamId, fromOfficeId, toOfficeId });
    res.status(204).send();
  });

  const CreateOfficeSchema = z.object({
    teamId: z.string().min(1),
    name: z.string().min(1).max(100),
    groupId: z.string().optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  });

  // POST /api/offices
  router.post('/', (req, res) => {
    const result = CreateOfficeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const office = agentService.createOffice(result.data);
    io.emit('office:created', office);
    res.status(201).json(office);
  });

  const PatchOfficeSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
  });

  // PATCH /api/offices/:id
  router.patch('/:id', (req, res) => {
    const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : (req.body.teamId as string | undefined);
    if (!teamId) {
      res.status(400).json({ error: 'teamId required (query param or body)' });
      return;
    }
    const result = PatchOfficeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const updated = agentService.updateOffice(req.params.id, teamId, result.data);
    if (!updated) {
      res.status(404).json({ error: 'Office not found' });
      return;
    }
    io.emit('office:updated', updated);
    res.json(updated);
  });

  // DELETE /api/offices/:id
  router.delete('/:id', (req, res) => {
    const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : (req.body.teamId as string | undefined);
    if (!teamId) {
      res.status(400).json({ error: 'teamId required (query param or body)' });
      return;
    }
    const outcome = agentService.deleteOffice(req.params.id, teamId);
    if (outcome === 'not_found') {
      res.status(404).json({ error: 'Office not found' });
      return;
    }
    if (outcome === 'has_agents') {
      res.status(409).json({ error: 'Office still has agents assigned to it' });
      return;
    }
    io.emit('office:deleted', { id: req.params.id, teamId });
    res.status(204).send();
  });

  return router;
}
