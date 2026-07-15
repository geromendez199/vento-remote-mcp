import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Logger } from "pino";

export interface RateLimitOptions {
  requestsPerMinute: number;
  burstPerSecond: number;
}

interface ClientWindow {
  minuteWindowStart: number;
  minuteCount: number;
  secondWindowStart: number;
  secondCount: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: "minute_limit" | "burst_limit";
}

// Per-client fixed-window limiter with a short burst window.
// Clients are keyed by a hash of their bearer token (never the raw token),
// falling back to IP for unauthenticated endpoints.
export class RateLimiter {
  private options: RateLimitOptions;
  private clients = new Map<string, ClientWindow>();

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  check(clientKey: string, now = Date.now()): RateLimitDecision {
    let win = this.clients.get(clientKey);
    if (!win) {
      win = {
        minuteWindowStart: now,
        minuteCount: 0,
        secondWindowStart: now,
        secondCount: 0,
      };
      this.clients.set(clientKey, win);
    }

    if (now - win.minuteWindowStart >= 60_000) {
      win.minuteWindowStart = now;
      win.minuteCount = 0;
    }
    if (now - win.secondWindowStart >= 1_000) {
      win.secondWindowStart = now;
      win.secondCount = 0;
    }

    if (win.secondCount >= this.options.burstPerSecond) {
      return { allowed: false, retryAfterSeconds: 1, reason: "burst_limit" };
    }
    if (win.minuteCount >= this.options.requestsPerMinute) {
      const retryAfterSeconds = Math.ceil(
        (win.minuteWindowStart + 60_000 - now) / 1000
      );
      return {
        allowed: false,
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
        reason: "minute_limit",
      };
    }

    win.secondCount += 1;
    win.minuteCount += 1;
    return { allowed: true };
  }

  // Periodically prune clients idle for over 2 minutes to bound memory
  prune(now = Date.now()): void {
    for (const [key, win] of this.clients) {
      if (now - win.minuteWindowStart > 120_000) {
        this.clients.delete(key);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export function clientKeyFromRequest(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return crypto.createHash("sha256").update(authHeader).digest("hex").slice(0, 16);
  }
  return `ip:${req.ip ?? "unknown"}`;
}

export function createRateLimitMiddleware(
  limiter: RateLimiter,
  logger: Logger,
  onLimited?: () => void
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = clientKeyFromRequest(req);
    const decision = limiter.check(key);
    if (!decision.allowed) {
      onLimited?.();
      logger.warn(
        { clientKey: key, reason: decision.reason, path: req.path },
        "Rate limit exceeded"
      );
      res.setHeader("Retry-After", String(decision.retryAfterSeconds ?? 1));
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds: decision.retryAfterSeconds,
      });
      return;
    }
    next();
  };
}
