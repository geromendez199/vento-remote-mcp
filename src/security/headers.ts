import { Request, Response, NextFunction } from "express";

export interface SecurityHeadersOptions {
  corsOrigins?: string[];
}

// Hardened response headers. HSTS is safe to always send: browsers ignore it
// over plain HTTP, and any production deployment must be behind TLS anyway.
export function createSecurityHeaders(options: SecurityHeadersOptions = {}) {
  const corsOrigins = options.corsOrigins ?? [];

  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.setHeader("Cache-Control", "no-store");

    const origin = req.headers.origin;
    if (origin && corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
