/**
 * In local dev, fetch() to `http://localhost:8000` often resolves `localhost` to IPv6 (::1)
 * while uvicorn commonly listens on IPv4 only — browser shows "Failed to fetch".
 * Using 127.0.0.1 avoids that mismatch without changing user-facing Next.js URL (3000 vs 3001 is fine).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_AI_API_URL;
  if (!raw) return '';
  const trimmed = raw.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'development') return trimmed;
  if (typeof window === 'undefined') return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      return u.toString().replace(/\/$/, '');
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
