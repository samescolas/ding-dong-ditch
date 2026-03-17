export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as Record<string, string>).error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
