import {
  decideAiOrderingProposalSchema,
  sendAiOrderingMessageSchema,
} from '@repo/shared';
import { requireGuest } from '@src/middlewares/guestAuth';
import { requireOpenStore } from '@src/middlewares/requireOpenStore';
import { validate } from '@src/middlewares/validate';
import { aiOrderingService } from '@src/services/aiOrdering.service';
import { Router } from 'express';

import { guestClaims } from './session';

import type {
  DecideAiOrderingProposalRequest,
  DecideAiOrderingProposalSuccessResponse,
  GetAiOrderingGuestConversationSuccessResponse,
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

/**
 * @openapi
 * /v1/public/guest/ai-ordering/conversation:
 *   get:
 *     tags:
 *       - Public / Guest AI Ordering
 *     summary: Read back this guest's assistant transcript
 *     description: >
 *       Returns the turns this guest has already exchanged in this cart, so a
 *       reopened or reloaded panel shows the conversation the assistant is still
 *       reading. Scoped to the token's own participant: a shared cart's other
 *       participants are never included.
 *
 *       Unlike the chat endpoint this does not require the assistant to be
 *       enabled or the store to be open — reading what you already said is not a
 *       turn.
 *     security:
 *       - guestToken: []
 *     responses:
 *       200:
 *         description: The guest's turns, oldest first; empty before their first turn
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
 *                     turns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [id, message, response, versionId, createdAt]
 *                         properties:
 *                           id:
 *                             type: string
 *                           message:
 *                             type: string
 *                           versionId:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           response:
 *                             type: object
 *                             description: >
 *                               One of `message`, `choices`, `proposal`, or
 *                               `unanswered`, discriminated by `type`.
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 enum: [message, choices, proposal, unanswered]
 *       401:
 *         description: Missing or invalid guest token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/conversation', async (req, res) => {
  const conversation = await aiOrderingService.getConversation(
    guestClaims(req),
  );

  const response: GetAiOrderingGuestConversationSuccessResponse = {
    status: 'success',
    data: conversation,
  };

  res.status(200).json(response);
});

/**
 * @openapi
 * /v1/public/guest/ai-ordering/proposals/decision:
 *   post:
 *     tags:
 *       - Public / Guest AI Ordering
 *     summary: Accept or dismiss a pending assistant proposal
 *     description: >
 *       Executes the operations the guest kept, in the order they were proposed,
 *       and records the outcome against the turn that proposed them. The request
 *       carries operation IDs only: what runs is rebuilt from the proposal the
 *       backend stored, so a caller can neither add an operation the assistant
 *       never proposed nor alter one it did. An empty `keptOperationIds` refuses
 *       the whole proposal and changes nothing. A proposal may be decided once.
 *     security:
 *       - guestToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [proposalId, keptOperationIds]
 *             properties:
 *               proposalId:
 *                 type: string
 *               keptOperationIds:
 *                 type: array
 *                 description: The operations the guest kept. Empty refuses all.
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: The per-operation results and the resulting cart
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
 *                     proposalId:
 *                       type: string
 *                     results:
 *                       type: array
 *                       description: >
 *                         One entry per operation in the proposal, including the
 *                         dismissed ones and any a failure left unattempted.
 *                       items:
 *                         type: object
 *                         required: [operationId, outcome]
 *                         properties:
 *                           operationId:
 *                             type: string
 *                           outcome:
 *                             type: string
 *                             enum: [accepted, rejected, no_action, failed]
 *                           failureCode:
 *                             type: string
 *                     cart:
 *                       type: object
 *                       description: The cart as it stands after execution.
 *                     reply:
 *                       type: string
 *                       description: >
 *                         The assistant's answer to what happened. Absent when
 *                         the closing model call failed; the cart change and the
 *                         recorded outcome are unaffected.
 *       400:
 *         description: Missing proposal id, or more kept ids than a proposal can hold
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
 *         description: The assistant is disabled, or no such proposal in this conversation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: >
 *           The proposal was already decided, or it expired before the guest
 *           answered. The two are distinct codes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit, or a request already in flight
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/proposals/decision',
  validate(decideAiOrderingProposalSchema),
  // The same store and cart checks the chat route carries: this one calls the
  // model AND changes the cart, so it is at least as privileged.
  requireOpenStore,
  async (req, res) => {
    const data = await aiOrderingService.decideProposal(
      guestClaims(req),
      req.body as DecideAiOrderingProposalRequest,
    );

    const response: DecideAiOrderingProposalSuccessResponse = {
      status: 'success',
      data,
    };

    res.status(200).json(response);
  },
);

export default router;
