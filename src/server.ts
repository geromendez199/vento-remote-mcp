import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "pino";
import { VentoRegistry } from "./vento/registry.js";
import { getConfig } from "./config.js";
import { buildPolicy, listAllowedTools } from "./permissions.js";
import { executeTool } from "./tools/execute.js";

export function createMcpServer(
  logger: Logger,
  registry: VentoRegistry
): Server {
  const config = getConfig();
  const policy = buildPolicy(
    config.ALLOWED_TOOLS,
    config.ALLOW_DESTRUCTIVE_TOOLS
  );

  const server = new Server(
    {
      name: "vento-remote",
      version: "0.2.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listAllowedTools(policy).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    const args = (toolArgs ?? {}) as Record<string, unknown>;
    return executeTool(name, args, registry, policy, logger);
  });

  return server;
}
