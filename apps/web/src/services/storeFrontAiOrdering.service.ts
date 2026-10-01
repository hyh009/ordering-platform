import { publicPaths } from '@/api/paths/public.paths';
import { storeFrontApiJson } from '@/api/storeFrontApiJson';
import { aiOrderingModel } from '@/models/aiOrdering';

import type {
  AiOrderingTurn,
  SendAiOrderingMessageRequest,
  SendAiOrderingMessageSuccessResponse,
} from '@/models/aiOrdering';

export const storeFrontAiOrderingService = {
  /**
   * Sends one guest turn and returns the assistant's answer as a model.
   *
   * Nothing here applies anything: a `proposal` comes back as data, and the cart
   * only changes if the guest accepts it and the apply flow calls the cart
   * commands. The assistant endpoint never mutates the cart.
   */
  async sendMessage(
    guestToken: string,
    request: SendAiOrderingMessageRequest,
  ): Promise<AiOrderingTurn> {
    const response =
      await storeFrontApiJson<SendAiOrderingMessageSuccessResponse>(
        publicPaths.storeFrontAiOrderingChat(),
        guestToken,
        { method: 'POST', body: JSON.stringify(request) },
      );

    return aiOrderingModel.deserializeTurn(response.data);
  },
};
