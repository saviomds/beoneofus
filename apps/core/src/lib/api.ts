// Thin fetch client for the BeOneOfUs API. All calls send the session cookie.
// Server errors arrive as { error: { code, message } } and are rethrown as
// ApiError so pages can show a message and guards can react to 401/403.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const BASE = '/api'

function qs(params?: Record<string, unknown>): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (!entries.length) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string; details?: unknown } })?.error
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? res.statusText, err?.details)
  }
  return (payload as { data: T })?.data as T
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) => request<T>('GET', path + qs(params)),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
}
