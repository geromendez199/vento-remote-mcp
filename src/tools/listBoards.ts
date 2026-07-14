import { Tool, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoClient } from "../vento/client.js";
import { Logger } from "pino";

export function createListBoardsTool(
  _ventoClient: VentoClient,
  _logger: Logger
): Tool {
  return {
    name: "vento_list_boards",
    description:
      "List all available Vento boards. Returns board IDs, names, and descriptions. Use this to discover what boards are available before getting board details or running actions.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  };
}

export async function handleListBoards(
  ventoClient: VentoClient,
  logger: Logger
): Promise<TextContent> {
  try {
    const boards = await ventoClient.listBoards();

    if (boards.length === 0) {
      return {
        type: "text",
        text: "No boards found in Vento.",
      };
    }

    const boardsList = boards
      .map(
        (board) =>
          `- **${board.name}** (ID: ${board.id})${board.description ? "\n  " + board.description : ""}`
      )
      .join("\n");

    return {
      type: "text",
      text: `Found ${boards.length} board(s):\n\n${boardsList}`,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    logger.error({ error }, "Failed to list boards");
    return {
      type: "text",
      text: `Error listing boards: ${errorMsg}`,
    };
  }
}
