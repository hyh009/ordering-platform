import { sendAiOrderingMessageSchema } from '@repo/shared';
import { requireGuest } from '@src/middlewares/guestAuth';
import { requireOpenStore } from '@src/middlewares/requireOpenStore';
import { validate } from '@src/middlewares/validate';
import { aiOrderingService } from '@src/services/aiOrdering.service';
import { Router } from 'express';

import { guestClaims } from './session';

import type {
  SendAiOrderingMessageRequest,
  SendAiOrderingMessageSuccessResponse,
} from '@repo/shared';

const router = Router();

router.use(requireGuest);

/**
 * @openapi
 * /v1/public/guest/ai-ordering/chat:
 *   post:
 *     tags:
 *       - Public / Guest AI Ordering
 *     summary: Send one message to the ordering assistant
 *     description: >
 *       Plans one assistant turn. This endpoint never modifies the cart: a
 *       proposed change is applied by the client through the guest cart API once
 *       the guest accepts it.
 *     security:
 *       - guestToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *               responseToPromptId:
 *                 type: string
 *                 description: Set when answering a previous `choices` response.
 *               selectedOptionId:
 *                 type: string
 *                 description: Absent when the guest typed instead of choosing.
 *               previousOutcome:
 *                 type: object
 *                 description: What became of the previous proposal.
 *                 required: [proposalId, results]
 *                 properties:
 *                   proposalId:
 *                     type: string
 *                   results:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required: [operationId, outcome]
 *                       properties:
 *                         operationId:
 *                           type: string
 *                         outcome:
 *                           type: string
 *                           enum: [accepted, rejected, no_action, failed]
 *                         failureCode:
 *                           type: string
 *     responses:
 *       200:
 *         description: One assistant turn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     versionId:
 *                       type: string
 *                     response:
 *                       type: object
 *                       description: >
 *                         One of `message`, `choices`, `proposal`, or
 *                         `unanswered`, discriminated by `type`.
 *                       properties:
 *                         type:
 *                           type: string
 *                           enum: [message, choices, proposal, unanswered]
 *       400:
 *         description: Empty or over-long message, or an unanswerable prompt id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid guest token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: The assistant is not enabled for this deployment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit, a request already in flight, or a full conversation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/chat',
  // Body shape is checked before the store is looked up: a malformed request is
  // a 400 whether or not the store is open, and rejecting it first avoids a read
  // for a request that cannot succeed either way.
  validate(sendAiOrderingMessageSchema),
  requireOpenStore,
  async (req, res) => {
    const data = await aiOrderingService.sendMessage(
      guestClaims(req),
      req.body as SendAiOrderingMessageRequest,
    );

    const response: SendAiOrderingMessageSuccessResponse = {
      status: 'success',
      data,
    };

    res.status(200).json(response);
  },
);

export default router;
