/**
 * The platform's read of a store's assistant conversations.
 *
 * Store-scoped like the merchant's, but under `/admin`, because access is
 * resolved by platform role instead of by organization membership. The
 * merchant's own paths stay in `store.paths.ts`.
 */
export const adminAiOrderingPaths = {
  conversations(storeId: string) {
    return `/v1/admin/ai-ordering/stores/${encodeURIComponent(storeId)}/conversations`;
  },
  conversation(storeId: string, conversationId: string) {
    return `/v1/admin/ai-ordering/stores/${encodeURIComponent(storeId)}/conversations/${encodeURIComponent(conversationId)}`;
  },
};
