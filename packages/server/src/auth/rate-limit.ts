const CODE_MAX_ATTEMPTS = 5;
const CODE_WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkCodeRateLimit(email: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && now > entry.resetAt) {
    attempts.delete(key);
  }

  const current = attempts.get(key);

  if (!current) {
    attempts.set(key, { count: 1, resetAt: now + CODE_WINDOW_MS });
    return { allowed: true };
  }

  if (current.count >= CODE_MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(retryAfterSec, 1) };
  }

  current.count += 1;
  return { allowed: true };
}
