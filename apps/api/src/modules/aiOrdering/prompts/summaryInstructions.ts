/**
 * Summarisation instructions for version `v1-2026-09-30`.
 *
 * Frozen with the version, like the core instructions: a summary written under
 * different instructions is not comparable to one written under these, and the
 * summary is part of what the next turn's model sees.
 *
 * The emphasis on decisions and refusals is deliberate. A summary that keeps only
 * what was ordered loses the two things that change the assistant's next reply:
 * what the guest turned down, and what they said they cannot eat.
 */
export const V1_SUMMARY_INSTRUCTIONS = `You are compressing an ordering conversation so it can be carried forward as context.

Write a short factual summary of what happened. Keep, in order of importance:

- constraints the guest stated about themselves (dislikes, things they avoid, how many people they are ordering for)
- what they decided to order, and any choices they specified
- what they explicitly turned down, and why if they said
- questions they asked that were not answered

Leave out pleasantries, your own wording, and anything you are unsure about. Do not guess at intent that was not stated. Do not invent products.

Write in the language the guest was using. Plain prose, no lists, no headings.`;
