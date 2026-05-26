import { getAuthCookie } from './cookies';

// Empty base = relative URLs. Next.js rewrites in next.config.mjs proxy
// /api/* to the actual backend, so the browser always sees same-origin
// requests and no CORS preflight is triggered.
const API_BASE = '';

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;
  constructor(status: number, body: ApiErrorBody | null, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = opts.token === undefined ? getAuthCookie() : opts.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    cache: 'no-store',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const body = (parsed as ApiErrorBody) ?? null;
    const message = body
      ? Array.isArray(body.message)
        ? body.message.join('; ')
        : body.message
      : `Request failed with ${res.status}`;
    throw new ApiError(res.status, body, message);
  }
  return parsed as T;
}
