import { McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "pino";
import { VentoClient } from "./vento/client.js";
import {
  createListBoardsTool,
  handleListBoards,
} from "./tools/listBoards.js";
import { createGetBoardTool, handleGetBoard } from "./tools/getBoard.js";
import {
  createGetCardValueTool,
  handleGetCardValue,
} from "./tools/getCardValue.js";
import {
  createListDevicesTool,
  handleListDevices,
} from "./tools/listDevices.js";
import { createRunActionTool, handleRunAction } from "./tools/runAction.js";
import {
  createSendToAgentTool,
  handleSendToAgent,
} from "./tools/sendToAgent.js";

export function createMcpServer(
  logger: Logger,
  ventoClient: VentoClient
): McpServer {
  const server = new McpServer({
    name: "vento-remote",
    version: "0.1.0",
  });

  const listBoardsTool = createListBoardsTool(ventoClient, logger);
  const getBoardTool = createGetBoardTool(ventoClient, logger);
  const getCardValueTool = createGetCardValueTool(ventoClient, logger);
  const listDevicesTool = createListDevicesTool(ventoClient, logger);
  const runActionTool = createRunActionTool(ventoClient, logger);
  const sendToAgentTool = createSendToAgentTool(ventoClient, logger);

  server.tool(listBoardsTool.name, listBoardsTool.description, listBoardsTool.inputSchema,
    async () => handleListBoards(ventoClient, logger)
  );

  server.tool(getBoardTool.name, getBoardTool.description, getBoardTool.inputSchema,
    async (request: CallToolRequest) => {
      const boardId = (request.params.arguments as Record<string, unknown>).boardId as string;
      return handleGetBoard(boardId, ventoClient, logger);
    }
  );

  server.tool(getCardValueTool.name, getCardValueTool.description, getCardValueTool.inputSchema,
    async (request: CallToolRequest) => {
      const args = request.params.arguments as Record<string, unknown>;
      return handleGetCardValue(
        args.boardId as string,
        args.cardId as string,
        ventoClient,
        logger
      );
    }
  );

  server.tool(listDevicesTool.name, listDevicesTool.description, listDevicesTool.inputSchema,
    async () => handleListDevices(ventoClient, logger)
  );

  server.tool(runActionTool.name, runActionTool.description, runActionTool.inputSchema,
    async (request: CallToolRequest) => {
      const args = request.params.arguments as Record<string, unknown>;
      return handleRunAction(
        args.boardId as string,
        args.cardId as string,
        args.params as Record<string, unknown> | undefined,
        ventoClient,
        logger
      );
    }
  );

  server.tool(sendToAgentTool.name, sendToAgentTool.description, sendToAgentTool.inputSchema,
    async (request: CallToolRequest) => {
      const args = request.params.arguments as Record<string, unknown>;
      return handleSendToAgent(
        args.agentName as string,
        args.message as string,
        ventoClient,
        logger
      );
    }
  );

  return server;
}
