import {
  aiOrderingConversationParamsSchema,
  listAiOrderingConversationsQuerySchema,
} from '@repo/shared';
import { requireAuth, requireSuperAdmin } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { aiOrderingReviewService } from '@src/services/aiOrderingReview.service';
import { Router } from 'express';

import type {
  AiOrderingConversationParams,
  GetAiOrderingConversationSuccessResponse,
  ListAiOrderingConversationsSuccessResponse,
} from '@repo/shared';

/**
 * The platform's own read of stored conversations.
 *
 * It exists next to the merchant's because the two answer to different
 * authorities: a merchant reads their own store through their organization
 * membership, and the platform reads any store through `isSuperAdmin`. The
 * detail here also carries the prompt, which is the platform's text and not a
 * merchant's to read — the reason this is a route of its own rather than a
 * branch inside the merchant handler.
 */
const router = Router();

type StoreParams = { storeId: string };

/**
 * @openapi
 * /api/v1/admin/ai-ordering/stores/{storeId}/conversations:
 *   get:
 *     tags:
 *       - Admin / AI Ordering
 *     summary: List a store's assistant conversations
 *     description: >-
 *       The same page the store's own staff read, reachable for any store
 *       without an organization membership.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: A page of conversations
 *       403:
 *         description: Not a platform super admin
 */
router.get<StoreParams, ListAiOrderingConversationsSuccessResponse>(
  '/stores/:storeId/conversations',
  requireAuth,
  requireSuperAdmin(),
  async (req, res) => {
    const query = listAiOrderingConversationsQuerySchema.parse(req.query);
    const result = await aiOrderingReviewService.listConversations(
      req.params.storeId,
      query,
    );

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /api/v1/admin/ai-ordering/stores/{storeId}/conversations/{conversationId}:
 *   get:
 *     tags:
 *       - Admin / AI Ordering
 *     summary: Read one conversation with the prompt it was answered under
 *     description: >-
 *       Carries `promptPreludes`: the core instructions, tool definitions and
 *       store data as they were sent, kept once per distinct text. A turn names
 *       the one it used through `modelTrace.preludeHash`. Turns recorded before
 *       preludes were stored have none, and the list is then empty.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The conversation, its turns, and the prompt behind them
 *       403:
 *         description: Not a platform super admin
 *       404:
 *         description: No such conversation in this store
 */
router.get<
  AiOrderingConversationParams,
  GetAiOrderingConversationSuccessResponse
>(
  '/stores/:storeId/conversations/:conversationId',
  requireAuth,
  requireSuperAdmin(),
  validate(aiOrderingConversationParamsSchema, 'params'),
  async (req, res) => {
    const conversation =
      await aiOrderingReviewService.getConversationWithPrompt(
        req.params.storeId,
        req.params.conversationId,
      );

    res.json({ status: 'success', data: { conversation } });
  },
);

export default router;
