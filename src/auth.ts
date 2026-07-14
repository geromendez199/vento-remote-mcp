import { Request, Response, NextFunction } from "express";
import { getConfig } from "./config.js";
import { Logger } from "pino";

export function createAuthMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = getConfig();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn({ path: req.path }, "Missing authorization header");
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logger.warn(
        { path: req.path, authHeader: "***" },
        "Invalid authorization header format"
      );
      return res
        .status(401)
        .json({ error: "Invalid authorization header format" });
    }

    const token = parts[1];
    if (token !== config.MCP_AUTH_TOKEN) {
      logger.warn({ path: req.path }, "Invalid auth token");
      return res.status(401).json({ error: "Invalid auth token" });
    }

    next();
  };
}

export function createOptionalAuthMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        const config = getConfig();
        if (parts[1] !== config.MCP_AUTH_TOKEN) {
          logger.warn({ path: req.path }, "Invalid auth token");
          return res.status(401).json({ error: "Invalid auth token" });
        }
      }
    }

    next();
  };
}
