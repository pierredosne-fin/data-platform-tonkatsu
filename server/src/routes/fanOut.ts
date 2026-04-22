import { Router } from 'express';
import type { Server } from 'socket.io';
import { pendingFanOuts, runAgentTask } from '../services/claudeService.js';
import * as agentService from '../services/agentService.js';

const CONCURRENCY_LIMIT = 3;

export function createFanOutRouter(io: Server): Router {
  const router = Router();

  router.post('/:proposalId/confirm', (req, res) => {
    const proposal = pendingFanOuts.get(req.params.proposalId);
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found or expired' });
      return;
    }

    pendingFanOuts.delete(proposal.id);

    // Fire tasks in batches — cap concurrency to avoid API rate limits
    const dispatchAll = async () => {
      for (let i = 0; i < proposal.tasks.length; i += CONCURRENCY_LIMIT) {
        const batch = proposal.tasks.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(
          batch.map((task) => {
            const target = agentService.findAgentByName(task.agent, proposal.teamId);
            if (!target) {
              console.warn(`[fan-out] agent "${task.agent}" not found at dispatch time — skipping`);
              return Promise.resolve();
            }
            return runAgentTask(target.id, io, task.prompt);
          })
        );
      }
    };

    // Dispatch asynchronously — don't block the HTTP response
    dispatchAll().catch((err) => {
      console.error('[fan-out] dispatch error:', err);
    });

    res.json({ dispatched: proposal.tasks.length });
  });

  router.post('/:proposalId/reject', (req, res) => {
    const existed = pendingFanOuts.delete(req.params.proposalId);
    res.json({ rejected: existed });
  });

  return router;
}
