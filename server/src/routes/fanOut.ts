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

    interface ResolvedTask {
      targetAgentId: string;
      prompt: string;
    }

    const resolvedTasks: ResolvedTask[] = proposal.tasks.flatMap((task) => {
      const target = agentService.findAgentByName(task.agent, proposal.teamId);
      if (!target) {
        console.warn(`[fan-out] agent "${task.agent}" not found at dispatch time — skipping`);
        return [];
      }
      return [{ targetAgentId: target.id, prompt: task.prompt }];
    });

    if (resolvedTasks.length === 0) {
      res.status(422).json({ error: 'No resolvable targets' });
      return;
    }

    const dispatchAll = async () => {
      for (let i = 0; i < resolvedTasks.length; i += CONCURRENCY_LIMIT) {
        const batch = resolvedTasks.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(
          batch.map(async ({ targetAgentId, prompt }) => {
            try {
              await runAgentTask(targetAgentId, io, prompt);
            } catch (err) {
              console.error(`[fan-out] task failed:`, err);
            }
          })
        );
      }
    };

    dispatchAll().catch((err) => {
      console.error('[fan-out] dispatchAll error:', err);
    });

    res.json({ dispatched: resolvedTasks.length });
  });

  router.post('/:proposalId/reject', (req, res) => {
    const existed = pendingFanOuts.delete(req.params.proposalId);
    res.json({ rejected: existed });
  });

  return router;
}
