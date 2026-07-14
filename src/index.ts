import express, { Application } from "express";
import pino from "pino";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig, validateConfig } from "./config.js";
import { VentoClient } from "./vento/client.js";
import { createMcpServer } from "./server.js";
import { createAuthMiddleware, createOptionalAuthMiddleware } from "./auth.js";

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

async function startStdioServer(): Promise<void> {
  try {
    validateConfig();
    logger.info("Starting Vento MCP server with stdio transport");

    const ventoClient = new VentoClient(logger);
    const mcpServer = createMcpServer(logger, ventoClient);

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

    const app: Application = express();
    app.use(express.json());

    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    const ventoClient = new VentoClient(logger);

    const authMiddleware = createAuthMiddleware(logger);

    app.post(
      "/mcp",
      authMiddleware,
      async (req, res) => {
        try {
          const { jsonrpc, id, method, params } = req.body;

          if (jsonrpc !== "2.0") {
            return res.status(400).json({ error: "Invalid JSON-RPC version" });
          }

          const mcpServer = createMcpServer(logger, ventoClient);

          if (method === "initialize") {
            const result = await mcpServer.initialize({
              protocolVersion: params?.protocolVersion || "2024-11-05",
              capabilities: params?.capabilities || {},
              clientInfo: params?.clientInfo || {},
            });

            return res.json({
              jsonrpc: "2.0",
              id,
              result,
            });
          }

          logger.warn({ method }, "Unknown MCP method");
          return res.status(400).json({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: "Method not found" },
          });
        } catch (error) {
          logger.error({ error }, "Error handling MCP request");
          return res.status(500).json({
            jsonrpc: "2.0",
            id: req.body.id,
            error: {
              code: -32603,
              message: "Internal error",
            },
          });
        }
      }
    );

    app.get(
      "/info",
      createOptionalAuthMiddleware(logger),
      (req, res) => {
        res.json({
          name: "vento-remote",
          version: "0.1.0",
          description:
            "Remote MCP connector for Vento - AI control and automation platform",
          ventoUrl: config.VENTO_API_URL,
        });
      }
    );

    app.use(
      (
        err: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        logger.error({ error: err }, "Unhandled error");
        res.status(500).json({ error: "Internal server error" });
      }
    );

    const port = config.PORT;
    app.listen(port, () => {
      logger.info(
        { port, ventoUrl: config.VENTO_API_URL },
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
