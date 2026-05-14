import {
  normalizeApiError,
  normalizeInvalidApiResponse,
  normalizeNetworkError,
} from './apiError';

const defaultBaseUrl = 'http://localhost:9000';
const apiPathPrefix = '/api';

type ApiTokenProvider = () => string | null | undefined;

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl;

let apiTokenProvider: ApiTokenProvider = () => null;

export function setApiTokenProvider(provider: ApiTokenProvider) {
  apiTokenProvider = provider;
}

function joinApiPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${apiPathPrefix}${normalizedPath}`;
}

export function apiUrl(path: string) {
  return new URL(joinApiPath(path), apiBaseUrl).toString();
}

async function parseJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

function shouldUseJsonContentType(body: RequestInit['body']) {
  return typeof body === 'string';
}

function createApiHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = apiTokenProvider();

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (
    init?.body !== undefined &&
    shouldUseJsonContentType(init.body) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export async function apiJson<TData>(
  path: string,
  init?: RequestInit,
): Promise<TData> {
  try {
    const response = await fetch(apiUrl(path), {
      credentials: 'include',
      ...init,
      headers: createApiHeaders(init),
    });
    let body: unknown;

    try {
      body = await parseJson(response);
    } catch (error) {
      throw normalizeInvalidApiResponse({
        response,
        cause: error,
      });
    }

    if (!response.ok) {
      throw normalizeApiError({
        response,
        body,
      });
    }

    return body as TData;
  } catch (error) {
    throw normalizeNetworkError(error);
  }
}
