import express, { Application } from "express";
import pino from "pino";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig, validateConfig } from "./config.js";
import { VentoRegistry, parseInstances } from "./vento/registry.js";
import { createMcpServer } from "./server.js";
import { createAuthMiddleware, createOptionalAuthMiddleware } from "./auth.js";
import { createOAuthRouter } from "./routes/oauth.js";
import { createSecurityHeaders } from "./security/headers.js";
import { requestId } from "./middleware/requestId.js";
import { getMetrics } from "./observability/metrics.js";
import { RateLimiter, createRateLimitMiddleware } from "./rateLimit.js";
import { buildPolicy, listAllowedTools } from "./permissions.js";
import { executeTool } from "./tools/execute.js";

const MCP_PROTOCOL_VERSION = "2024-11-05";
const SERVER_VERSION = "0.2.0";
const startedAt = Date.now();

const isHttpMode = process.env.MCP_TRANSPORT === "http" || !process.stdin.isTTY;

const logger = pino(
  isHttpMode || process.env.NODE_ENV === "production"
    ? undefined
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      }
);

function buildRegistry(): VentoRegistry {
  const config = getConfig();
  const extra = parseInstances(config.VENTO_INSTANCES);
  return new VentoRegistry(
    logger,
    { url: config.VENTO_API_URL, token: config.VENTO_TOKEN },
    extra
  );
}

async function startStdioServer(): Promise<void> {
  try {
    validateConfig();
    const config = getConfig();
    logger.level = config.LOG_LEVEL;
    logger.info("Starting Vento MCP server with stdio transport");

    const registry = buildRegistry();
    const mcpServer = createMcpServer(logger, registry);

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    logger.info("Stdio MCP server connected");
  } catch (error) {
    logger.error({ error }, "Stdio server error");
    process.exit(1);
  }
}

async function startHttpServer(): Promise<void> {
  try {
    validateConfig();
    const config = getConfig();
    logger.level = config.LOG_LEVEL;

    const registry = buildRegistry();
    const policy = buildPolicy(
      config.ALLOWED_TOOLS,
      config.ALLOW_DESTRUCTIVE_TOOLS
    );
    const metrics = getMetrics();
    const authMiddleware = createAuthMiddleware(logger);

    const app: Application = express();
    app.disable("x-powered-by");
    app.set("trust proxy", true);
    app.use(express.json({ limit: "1mb" }));
    app.use(requestId());
    app.use(
      createSecurityHeaders({
        corsOrigins: config.CORS_ORIGINS
          ? config.CORS_ORIGINS.split(",").map((o) => o.trim())
          : [],
      })
    );
    app.use(metrics.middleware());

    if (config.RATE_LIMIT_ENABLED) {
      const limiter = new RateLimiter({
        requestsPerMinute: config.RATE_LIMIT_REQUESTS_PER_MINUTE,
        burstPerSecond: config.RATE_LIMIT_BURST_PER_SECOND,
      });
      setInterval(() => limiter.prune(), 60_000).unref();
      app.use(
        createRateLimitMiddleware(limiter, logger, () =>
          metrics.rateLimited.inc()
        )
      );
    }

    // Liveness: cheap, no upstream calls — safe for restart decisions
    app.get("/health/live", (_req, res) => {
      res.json({ status: "ok", uptimeMs: Date.now() - startedAt });
    });

    // Readiness: includes Vento connectivity + latency
    app.get("/health", async (_req, res) => {
      const vento = await registry.getClient().ping();
      const status = vento.connected ? "ok" : "degraded";
      res.status(vento.connected ? 200 : 503).json({
        status,
        uptimeMs: Date.now() - startedAt,
        vento: { connected: vento.connected, latencyMs: vento.latencyMs },
        version: SERVER_VERSION,
      });
    });

    app.get("/metrics", authMiddleware, async (_req, res) => {
      res.setHeader("Content-Type", "text/plain; version=0.0.4");
      res.send(await metrics.render());
    });

    // Full MCP JSON-RPC endpoint: initialize, tools/list, tools/call, ping
    app.post("/mcp", authMiddleware, async (req, res) => {
      const { jsonrpc, id, method, params } = req.body ?? {};
      const reqLogger = logger.child({ reqId: req.reqId, method });

      try {
        if (jsonrpc !== "2.0") {
          res.status(400).json({
            jsonrpc: "2.0",
            id: id ?? null,
            error: { code: -32600, message: "Invalid JSON-RPC version" },
          });
          return;
        }

        // Notifications carry no id and expect no response body
        if (method === "notifications/initialized") {
          res.status(202).end();
          return;
        }

        switch (method) {
          case "initialize": {
            res.json({
              jsonrpc: "2.0",
              id,
              result: {
                protocolVersion: MCP_PROTOCOL_VERSION,
                capabilities: { tools: {} },
                serverInfo: {
                  name: "vento-remote",
                  version: SERVER_VERSION,
                },
              },
            });
            return;
          }
          case "ping": {
            res.json({ jsonrpc: "2.0", id, result: {} });
            return;
          }
          case "tools/list": {
            res.json({
              jsonrpc: "2.0",
              id,
              result: {
                tools: listAllowedTools(policy).map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.inputSchema,
                })),
              },
            });
            return;
          }
          case "tools/call": {
            const name = params?.name;
            if (typeof name !== "string") {
              res.status(400).json({
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: "Missing tool name" },
              });
              return;
            }
            const args = (params?.arguments ?? {}) as Record<string, unknown>;
            const result = await executeTool(
              name,
              args,
              registry,
              policy,
              reqLogger
            );
            res.json({ jsonrpc: "2.0", id, result });
            return;
          }
          default: {
            reqLogger.warn("Unknown MCP method");
            res.status(400).json({
              jsonrpc: "2.0",
              id: id ?? null,
              error: { code: -32601, message: "Method not found" },
            });
            return;
          }
        }
      } catch (error) {
        reqLogger.error({ error }, "Error handling MCP request");
        res.status(500).json({
          jsonrpc: "2.0",
          id: id ?? null,
          error: { code: -32603, message: "Internal error" },
        });
      }
    });

    app.get("/info", createOptionalAuthMiddleware(logger), (_req, res) => {
      res.json({
        name: "vento-remote",
        version: SERVER_VERSION,
        description:
          "Remote MCP connector for Vento - AI control and automation platform",
        protocolVersion: MCP_PROTOCOL_VERSION,
        oauthEnabled: config.OAUTH_ENABLED,
        instances: registry.instanceNames,
        tools: listAllowedTools(policy).map((t) => ({
          name: t.name,
          dangerLevel: t.dangerLevel,
        })),
      });
    });

    if (config.OAUTH_ENABLED) {
      const oauthRouter = createOAuthRouter(config);
      app.use("/auth/vento", oauthRouter);
      logger.info("OAuth routes enabled at /auth/vento");
    }

    app.use(
      (
        err: unknown,
        req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        logger.error({ error: err, reqId: req.reqId }, "Unhandled error");
        res.status(500).json({ error: "Internal server error" });
      }
    );

    const port = config.PORT;
    app.listen(port, () => {
      logger.info(
        {
          port,
          ventoUrl: config.VENTO_API_URL,
          instances: registry.instanceNames,
          rateLimiting: config.RATE_LIMIT_ENABLED,
        },
        "Vento Remote MCP server started (HTTP mode)"
      );
    });
  } catch (error) {
    logger.error({ error }, "Failed to bootstrap HTTP server");
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  if (isHttpMode) {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

bootstrap().catch((error) => {
  logger.error({ error }, "Fatal error");
  process.exit(1);
});
