import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare module "express-serve-static-core" {
  interface Request {
    reqId?: string;
  }
}

// Assigns a correlation id to every request. Honors an incoming X-Request-Id
// (from a reverse proxy) only if it looks safe; otherwise generates a UUID.
export function requestId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.headers["x-request-id"];
    const candidate = typeof incoming === "string" ? incoming : undefined;
    const safe =
      candidate && /^[A-Za-z0-9-]{8,64}$/.test(candidate)
        ? candidate
        : crypto.randomUUID();
    req.reqId = safe;
    res.setHeader("X-Request-Id", safe);
    next();
  };
}
