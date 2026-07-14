import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "pino";
import { VentoClient } from "./vento/client.js";
import { handleListBoards } from "./tools/listBoards.js";
import { handleGetBoard } from "./tools/getBoard.js";
import { handleGetCardValue } from "./tools/getCardValue.js";
import { handleListDevices } from "./tools/listDevices.js";
import { handleRunAction } from "./tools/runAction.js";
import { handleSendToAgent } from "./tools/sendToAgent.js";

export function createMcpServer(
  logger: Logger,
  ventoClient: VentoClient
): Server {
  const server = new Server({
    name: "vento-remote",
    version: "0.1.0",
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;

    switch (name) {
      case "vento_list_boards":
        return await handleListBoards(ventoClient, logger);
      case "vento_get_board": {
        const args = toolArgs as Record<string, unknown>;
        return await handleGetBoard(args.boardId as string, ventoClient, logger);
      }
      case "vento_get_card_value": {
        const args = toolArgs as Record<string, unknown>;
        return await handleGetCardValue(
          args.boardId as string,
          args.cardId as string,
          ventoClient,
          logger
        );
      }
      case "vento_list_devices":
        return await handleListDevices(ventoClient, logger);
      case "vento_run_action": {
        const args = toolArgs as Record<string, unknown>;
        return await handleRunAction(
          args.boardId as string,
          args.cardId as string,
          args.params as Record<string, unknown> | undefined,
          ventoClient,
          logger
        );
      }
      case "vento_send_to_agent": {
        const args = toolArgs as Record<string, unknown>;
        return await handleSendToAgent(
          args.agentName as string,
          args.message as string,
          ventoClient,
          logger
        );
      }
      default:
        return {
          type: "text" as const,
          text: `Unknown tool: ${name}`,
        };
    }
  });

  return server;
}
