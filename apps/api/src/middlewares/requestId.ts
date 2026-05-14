import { randomUUID } from 'node:crypto';

import { RequestHandler } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

function isSafeRequestId(value: string | undefined): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    SAFE_REQUEST_ID_PATTERN.test(value)
  );
}

export const requestId: RequestHandler = (req, res, next) => {
  const incomingRequestId = req.get(REQUEST_ID_HEADER);
  const requestId = isSafeRequestId(incomingRequestId)
    ? incomingRequestId
    : randomUUID();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};
