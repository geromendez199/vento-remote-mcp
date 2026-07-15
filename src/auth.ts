import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getConfig } from "./config.js";
import { Logger } from "pino";
import { getMetrics } from "./observability/metrics.js";

// Constant-time token comparison. Hashing both sides first means
// timingSafeEqual always compares equal-length buffers, so neither
// token length nor content leaks through timing.
export function tokensMatch(provided: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createAuthMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const config = getConfig();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      getMetrics().authFailures.inc();
      logger.warn({ path: req.path, reqId: req.reqId }, "Missing authorization header");
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      getMetrics().authFailures.inc();
      logger.warn(
        { path: req.path, reqId: req.reqId },
        "Invalid authorization header format"
      );
      res
        .status(401)
        .json({ error: "Invalid authorization header format" });
      return;
    }

    const token = parts[1];
    if (!tokensMatch(token, config.MCP_AUTH_TOKEN)) {
      getMetrics().authFailures.inc();
      logger.warn({ path: req.path, reqId: req.reqId }, "Invalid auth token");
      res.status(401).json({ error: "Invalid auth token" });
      return;
    }

    next();
  };
}

export function createOptionalAuthMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        const config = getConfig();
        if (!tokensMatch(parts[1], config.MCP_AUTH_TOKEN)) {
          getMetrics().authFailures.inc();
          logger.warn({ path: req.path, reqId: req.reqId }, "Invalid auth token");
          res.status(401).json({ error: "Invalid auth token" });
          return;
        }
      }
    }

    next();
  };
}
