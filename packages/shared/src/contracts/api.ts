export type ValidationErrorDetail = {
  path: string;
  message: string;
};

export type ApiErrorResponse = {
  status: 'error';
  statusCode: number;
  code?: string;
  message: string;
  details?: unknown;
};

export type ApiSuccessResponse<TData> = {
  status: 'success';
  data: TData;
};
