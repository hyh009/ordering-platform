/**
 * What the guest is told when the model proposed changes, none survived
 * validation, and the model could not be asked to explain instead.
 *
 * A last resort. The ordinary path is the model saying, in the guest's own
 * language, what could not be done and why; this is what is left when that call
 * failed, ran out of time, or came back unusable.
 *
 * Fixed text rather than the model's earlier reply. That reply was written to
 * introduce a list — "please confirm the following changes:" — and the list is
 * gone, so showing it tells the guest something was offered when nothing was.
 * It also sits in the history afterwards, where the model reads it back as its
 * own word that the change was made.
 */

import type { SupportedLocale } from '@repo/shared';

/**
 * Worded as a system notice, with no "I". A line in the assistant's voice reads
 * as something the model said, and this is precisely the case where it said
 * nothing usable.
 *
 * It also does not assume the guest asked for a change. The model proposed one,
 * but the guest may only have asked a question that it misread as an order.
 */
export const AI_ORDERING_EMPTY_PROPOSAL_REPLY: Record<SupportedLocale, string> =
  {
    en: 'This request could not be processed. Please try again later, or rephrase it.',
    'zh-TW': '無法處理這個請求。請稍後再試，或換個方式描述。',
  };

/**
 * The language to answer in, read from what the guest just typed.
 *
 * This line is spoken to the guest and is the only thing they read that turn,
 * so it follows their language rather than the store's — unlike an operation
 * label, which is menu data and reads in the menu's language.
 *
 * Only as fine as the lines above: any Han character reads as Chinese, any
 * Latin letter as English. A message with neither — a number, an emoji, a
 * script there is no line for — falls back to the store's default locale.
 */
export function resolveAiOrderingEmptyProposalReply(
  guestMessage: string,
  storeLocale: SupportedLocale,
): string {
  if (/\p{Script=Han}/u.test(guestMessage)) {
    return AI_ORDERING_EMPTY_PROPOSAL_REPLY['zh-TW'];
  }

  if (/\p{Script=Latin}/u.test(guestMessage)) {
    return AI_ORDERING_EMPTY_PROPOSAL_REPLY.en;
  }

  return AI_ORDERING_EMPTY_PROPOSAL_REPLY[storeLocale];
}
