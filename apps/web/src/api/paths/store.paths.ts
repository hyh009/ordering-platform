export const merchantStorePaths = {
  list: '/v1/merchant/stores',
  detail(storeId: string) {
    return `/v1/merchant/stores/${encodeURIComponent(storeId)}`;
  },
  images(storeId: string) {
    return `/v1/merchant/stores/${encodeURIComponent(storeId)}/images`;
  },
  aiOrderingConversations(storeId: string) {
    return `/v1/merchant/stores/${encodeURIComponent(storeId)}/ai-ordering/conversations`;
  },
  aiOrderingConversation(storeId: string, conversationId: string) {
    return `/v1/merchant/stores/${encodeURIComponent(storeId)}/ai-ordering/conversations/${encodeURIComponent(conversationId)}`;
  },
  aiOrderingUnanswered(storeId: string) {
    return `/v1/merchant/stores/${encodeURIComponent(storeId)}/ai-ordering/unanswered`;
  },
};
