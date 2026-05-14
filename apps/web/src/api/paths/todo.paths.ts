export const todoPaths = {
  list: '/v1/todos',
  detail(todoId: string) {
    return `/v1/todos/${encodeURIComponent(todoId)}`;
  },
};
