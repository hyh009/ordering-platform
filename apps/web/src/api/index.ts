import {
  normalizeApiError,
  normalizeInvalidApiResponse,
  normalizeNetworkError,
} from './apiError';

const defaultBaseUrl = 'http://localhost:9000';
const apiPathPrefix = '/api';

type ApiTokenProvider = () => string | null | undefined;
type ApiRefreshHandler = () => Promise<boolean>;
type Api403Handler = () => Promise<void>;

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl;

let apiTokenProvider: ApiTokenProvider = () => null;
let apiRefreshHandler: ApiRefreshHandler = () => Promise.resolve(false);
let api403Handler: Api403Handler = () => Promise.resolve();
let pendingRefresh: Promise<boolean> | null = null;
let pendingRevalidate: Promise<void> | null = null;

export function setApiTokenProvider(provider: ApiTokenProvider) {
  apiTokenProvider = provider;
}

export function setApiRefreshHandler(handler: ApiRefreshHandler) {
  apiRefreshHandler = handler;
}

// Invoked once per burst of 403s to re-validate the user's memberships so the
// UI can self-correct after a permission change. Does not retry the request.
export function setApi403Handler(handler: Api403Handler) {
  api403Handler = handler;
}

function deduplicatedRefresh(): Promise<boolean> {
  if (!pendingRefresh) {
    pendingRefresh = apiRefreshHandler().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

function deduplicatedRevalidate(): Promise<void> {
  if (!pendingRevalidate) {
    pendingRevalidate = api403Handler()
      .catch(() => undefined)
      .finally(() => {
        pendingRevalidate = null;
      });
  }
  return pendingRevalidate;
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

type ApiJsonOptions = {
  skipRefresh?: boolean;
  skipRevalidate?: boolean;
};

export async function apiJson<TData>(
  path: string,
  init?: RequestInit,
  options?: ApiJsonOptions,
): Promise<TData> {
  return apiJsonInternal<TData>(path, init, {
    isRetry: false,
    skipRefresh: options?.skipRefresh ?? false,
    skipRevalidate: options?.skipRevalidate ?? false,
  });
}

async function apiJsonInternal<TData>(
  path: string,
  init: RequestInit | undefined,
  {
    isRetry,
    skipRefresh,
    skipRevalidate,
  }: { isRetry: boolean; skipRefresh: boolean; skipRevalidate: boolean },
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
      if (response.status === 401 && !isRetry && !skipRefresh) {
        const refreshed = await deduplicatedRefresh();

        if (refreshed) {
          return apiJsonInternal<TData>(path, init, {
            isRetry: true,
            skipRefresh: false,
            skipRevalidate,
          });
        }
      }

      // Permission changed server-side: re-validate memberships so the UI can
      // self-correct. Fire-and-forget — the original action stays forbidden, so
      // we do not retry it.
      if (response.status === 403 && !skipRevalidate) {
        void deduplicatedRevalidate();
      }

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
