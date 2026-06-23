const API_BASE = import.meta.env.VITE_API_URL ?? ''

function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? ''
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': getInitData(),
  }
  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>)
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
