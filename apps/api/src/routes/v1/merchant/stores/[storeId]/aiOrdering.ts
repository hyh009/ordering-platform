import {
  aiOrderingConversationParamsSchema,
  listAiOrderingConversationsQuerySchema,
  listAiOrderingUnansweredQuerySchema,
} from '@repo/shared';
import { requireAuth, requireOrgRole } from '@src/middlewares/auth';
import { validate } from '@src/middlewares/validate';
import { aiOrderingReviewService } from '@src/services/aiOrderingReview.service';
import { Router } from 'express';

import type {
  AiOrderingConversationParams,
  GetAiOrderingConversationSuccessResponse,
  ListAiOrderingConversationsSuccessResponse,
  ListAiOrderingUnansweredSuccessResponse,
} from '@repo/shared';

const router = Router({ mergeParams: true });

type StoreParams = { storeId: string };

/**
 * @openapi
 * components:
 *   schemas:
 *     AiOrderingConversationSummary:
 *       type: object
 *       required:
 *         - id
 *         - cartId
 *         - participantId
 *         - turnCount
 *         - unansweredCount
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           example: ai-conversation-123
 *         cartId:
 *           type: string
 *         participantId:
 *           type: string
 *         turnCount:
 *           type: integer
 *           example: 6
 *         unansweredCount:
 *           type: integer
 *           description: Turns the assistant could not answer. What the list is scanned for.
 *           example: 1
 *         lastTurnAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AiOrderingReviewTurn:
 *       type: object
 *       required:
 *         - id
 *         - message
 *         - response
 *         - versionId
 *         - versionFingerprint
 *         - provider
 *         - modelName
 *         - repairAttempted
 *         - droppedOperationCount
 *         - ownershipViolationCount
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *         message:
 *           type: string
 *           description: What the guest sent.
 *         response:
 *           type: object
 *           description: The response the guest saw (message / choices / proposal / unanswered).
 *         versionId:
 *           type: string
 *           example: v1-2026-09-30
 *         versionFingerprint:
 *           type: string
 *           description: >-
 *             Hash of the prompt and limits that produced this turn. A draft
 *             version may be edited between two turns sharing a versionId; this
 *             is what tells them apart.
 *           example: 3f9a1c2d4e5b
 *         provider:
 *           type: string
 *           example: gemini
 *         modelName:
 *           type: string
 *         repairAttempted:
 *           type: boolean
 *         repairSucceeded:
 *           type: boolean
 *         droppedOperationCount:
 *           type: integer
 *         ownershipViolationCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *     AiOrderingUnansweredEntry:
 *       type: object
 *       required:
 *         - conversationId
 *         - turnId
 *         - participantId
 *         - message
 *         - reply
 *         - reason
 *         - createdAt
 *       properties:
 *         conversationId:
 *           type: string
 *         turnId:
 *           type: string
 *         participantId:
 *           type: string
 *         message:
 *           type: string
 *         reply:
 *           type: string
 *         reason:
 *           type: string
 *           enum:
 *             - missing_product_info
 *             - out_of_scope
 *             - unclear_request
 *         productId:
 *           type: string
 *           description: Present only when the reason is missing_product_info and the product is known.
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/ai-ordering/conversations:
 *   get:
 *     tags:
 *       - Merchant / AI Ordering
 *     summary: List the store's assistant conversations
 *     description: >-
 *       Newest first. Readable whether or not the assistant is currently
 *       enabled: conversations are retained for review long after a deployment
 *       turns the assistant off.
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
 *         description: Not authorized for this store's organization
 */
router.get<StoreParams, ListAiOrderingConversationsSuccessResponse>(
  '/conversations',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
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
 * /v1/merchant/stores/{storeId}/ai-ordering/unanswered:
 *   get:
 *     tags:
 *       - Merchant / AI Ordering
 *     summary: List questions the assistant could not answer
 *     description: >-
 *       One entry per unanswered TURN, not per conversation, because two
 *       unanswered questions in one conversation are two things to fix. Entries
 *       whose reason is missing_product_info carry the product when the
 *       assistant could name it, which makes this a list of products whose
 *       description needs work.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum:
 *             - missing_product_info
 *             - out_of_scope
 *             - unclear_request
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
 *         description: A page of unanswered questions
 *       403:
 *         description: Not authorized for this store's organization
 */
router.get<StoreParams, ListAiOrderingUnansweredSuccessResponse>(
  '/unanswered',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  async (req, res) => {
    const query = listAiOrderingUnansweredQuerySchema.parse(req.query);
    const result = await aiOrderingReviewService.listUnanswered(
      req.params.storeId,
      query,
    );

    res.json({ status: 'success', data: result });
  },
);

/**
 * @openapi
 * /v1/merchant/stores/{storeId}/ai-ordering/conversations/{conversationId}:
 *   get:
 *     tags:
 *       - Merchant / AI Ordering
 *     summary: Read one assistant conversation
 *     description: >-
 *       Every stored turn, including turns whose model output was rejected by
 *       validation — those carry the quality signals that explain why a prompt
 *       version needs work. The raw provider output is never exposed.
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
 *         description: The conversation and its turns
 *       404:
 *         description: No such conversation in this store
 */
router.get<AiOrderingConversationParams, GetAiOrderingConversationSuccessResponse>(
  '/conversations/:conversationId',
  requireAuth,
  requireOrgRole('org_owner', 'org_admin', 'staff'),
  validate(aiOrderingConversationParamsSchema, 'params'),
  async (req, res) => {
    const conversation = await aiOrderingReviewService.getConversation(
      req.params.storeId,
      req.params.conversationId,
    );

    res.json({ status: 'success', data: { conversation } });
  },
);

export default router;
