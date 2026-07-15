import { Logger } from "pino";
import { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoRegistry } from "../vento/registry.js";
import { PermissionPolicy, isToolAllowed } from "../permissions.js";
import { getToolDescriptor } from "./registry.js";
import { getMetrics } from "../observability/metrics.js";
import { handleListBoards } from "./listBoards.js";
import { handleGetBoard } from "./getBoard.js";
import { handleGetCardValue } from "./getCardValue.js";
import { handleListDevices } from "./listDevices.js";
import { handleRunAction } from "./runAction.js";
import { handleSendToAgent } from "./sendToAgent.js";

export interface ToolResult {
  content: TextContent[];
  isError?: boolean;
  [key: string]: unknown;
}

// Single execution path for both transports (stdio MCP server and HTTP JSON-RPC),
// so permissions, metrics, and error sanitization behave identically everywhere.
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  registry: VentoRegistry,
  policy: PermissionPolicy,
  logger: Logger
): Promise<ToolResult> {
  const metrics = getMetrics();

  const descriptor = getToolDescriptor(name);
  if (!descriptor) {
    metrics.toolExecutions.labels(name, "unknown").inc();
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  if (!isToolAllowed(policy, descriptor)) {
    metrics.toolExecutions.labels(name, "denied").inc();
    logger.warn({ tool: name }, "Tool execution denied by permission policy");
    return {
      content: [
        {
          type: "text",
          text: `Tool "${name}" is disabled by the connector's permission policy (ALLOWED_TOOLS / ALLOW_DESTRUCTIVE_TOOLS).`,
        },
      ],
      isError: true,
    };
  }

  try {
    const ventoClient = registry.getClient(args.instance as string | undefined);

    let content: TextContent;
    switch (name) {
      case "vento_list_boards":
        content = await handleListBoards(ventoClient, logger);
        break;
      case "vento_get_board":
        content = await handleGetBoard(
          args.boardId as string,
          ventoClient,
          logger
        );
        break;
      case "vento_get_card_value":
        content = await handleGetCardValue(
          args.boardId as string,
          args.cardId as string,
          ventoClient,
          logger
        );
        break;
      case "vento_list_devices":
        content = await handleListDevices(ventoClient, logger);
        break;
      case "vento_run_action":
        content = await handleRunAction(
          args.boardId as string,
          args.cardId as string,
          args.params as Record<string, unknown> | undefined,
          ventoClient,
          logger
        );
        break;
      case "vento_send_to_agent":
        content = await handleSendToAgent(
          args.agentName as string,
          args.message as string,
          ventoClient,
          logger
        );
        break;
      default:
        // Unreachable: descriptor lookup above covers registry membership
        throw new Error(`Unhandled tool: ${name}`);
    }

    metrics.toolExecutions.labels(name, "success").inc();
    return { content: [content] };
  } catch (error) {
    metrics.toolExecutions.labels(name, "error").inc();
    logger.error({ error, tool: name }, "Tool execution failed");
    // Sanitized error: no stack traces or internal paths leave the server
    const message =
      error instanceof Error ? error.message : "Tool execution failed";
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}
