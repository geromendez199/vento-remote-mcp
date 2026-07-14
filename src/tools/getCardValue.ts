import { Tool, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoClient } from "../vento/client.js";
import { Logger } from "pino";

export function createGetCardValueTool(
  ventoClient: VentoClient,
  logger: Logger
): Tool {
  return {
    name: "vento_get_card_value",
    description:
      "Get the current value of a specific value card from a Vento board. Useful for monitoring individual sensors or checking current state.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "string",
          description: "The ID of the board containing the card",
        },
        cardId: {
          type: "string",
          description: "The ID of the card to retrieve the value from",
        },
      },
      required: ["boardId", "cardId"],
    },
  };
}

export async function handleGetCardValue(
  boardId: string,
  cardId: string,
  ventoClient: VentoClient,
  logger: Logger
): Promise<TextContent> {
  try {
    const card = await ventoClient.getCardValue(boardId, cardId);

    let text = `**${card.name}**\n`;
    if (card.value !== undefined) {
      text += `Value: ${card.value}`;
      if ((card as any).unit) {
        text += ` ${(card as any).unit}`;
      }
      text += "\n";
    }
    if ((card as any).lastUpdated) {
      text += `Last Updated: ${(card as any).lastUpdated}\n`;
    }

    return {
      type: "text",
      text,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    logger.error(
      { error, boardId, cardId },
      "Failed to get card value"
    );
    return {
      type: "text",
      text: `Error retrieving card ${cardId} from board ${boardId}: ${errorMsg}`,
    };
  }
}
