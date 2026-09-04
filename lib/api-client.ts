/**
 * lib/api-client.ts
 * Central API client — uses NEXT_PUBLIC_API_URL in production so the
 * static frontend (Hostinger) can talk to the backend (Render).
 * Falls back to relative paths in local dev / SSR.
 */

const API_BASE =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || ''
    : process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Thin wrapper around fetch that prepends the configured API base URL.
 * Automatically forwards browser cookies (credentials: 'include').
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  return fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

/**
 * GET helper — returns parsed JSON.
 */
export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * POST helper — sends JSON body, returns parsed JSON.
 */
export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * PUT helper — sends JSON body, returns parsed JSON.
 */
export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * DELETE helper — returns parsed JSON.
 */
export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export default apiFetch;
