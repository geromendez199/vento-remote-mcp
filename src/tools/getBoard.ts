import { Tool, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoClient } from "../vento/client.js";
import { Logger } from "pino";

export function createGetBoardTool(
  ventoClient: VentoClient,
  logger: Logger
): Tool {
  return {
    name: "vento_get_board",
    description:
      "Get the complete state of a Vento board, including all cards and their current values. Returns value cards with sensor data and action cards available for execution.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "string",
          description: "The ID of the board to retrieve",
        },
      },
      required: ["boardId"],
    },
  };
}

export async function handleGetBoard(
  boardId: string,
  ventoClient: VentoClient,
  logger: Logger
): Promise<TextContent> {
  try {
    const board = await ventoClient.getBoard(boardId);

    if (!board.cards || board.cards.length === 0) {
      return {
        type: "text",
        text: `Board "${board.name}" has no cards.`,
      };
    }

    const valueCards = board.cards.filter((c) => c.type === "value");
    const actionCards = board.cards.filter((c) => c.type === "action");

    let details = `# Board: ${board.name}\n`;
    if (board.description) {
      details += `**Description:** ${board.description}\n\n`;
    }

    if (valueCards.length > 0) {
      details += `## Sensor Values (${valueCards.length})\n`;
      valueCards.forEach((card) => {
        const valueCard = card as any;
        details += `- **${card.name}** (ID: ${card.id})`;
        if (valueCard.value !== undefined) {
          details += `: ${valueCard.value}`;
          if (valueCard.unit) {
            details += ` ${valueCard.unit}`;
          }
        }
        if (valueCard.lastUpdated) {
          details += ` (updated: ${valueCard.lastUpdated})`;
        }
        details += "\n";
      });
      details += "\n";
    }

    if (actionCards.length > 0) {
      details += `## Available Actions (${actionCards.length})\n`;
      actionCards.forEach((card) => {
        const actionCard = card as any;
        details += `- **${card.name}** (ID: ${card.id})`;
        if (actionCard.params) {
          details += ` - Params: ${JSON.stringify(actionCard.params)}`;
        }
        details += "\n";
      });
    }

    return {
      type: "text",
      text: details,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    logger.error({ error, boardId }, "Failed to get board");
    return {
      type: "text",
      text: `Error retrieving board ${boardId}: ${errorMsg}`,
    };
  }
}
