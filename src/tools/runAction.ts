import { Tool, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoClient } from "../vento/client.js";
import { Logger } from "pino";

export function createRunActionTool(
  _ventoClient: VentoClient,
  _logger: Logger
): Tool {
  return {
    name: "vento_run_action",
    description:
      "Execute an action card on a Vento board. WARNING: This performs real actions on physical devices (e.g., turning on pumps, motors, sending messages). Use with caution. Returns the result of the action execution.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "string",
          description: "The ID of the board containing the action card",
        },
        cardId: {
          type: "string",
          description: "The ID of the action card to execute",
        },
        params: {
          type: "object",
          description: "Optional parameters for the action card",
          additionalProperties: true,
        },
      },
      required: ["boardId", "cardId"],
    },
  };
}

export async function handleRunAction(
  boardId: string,
  cardId: string,
  params: Record<string, unknown> | undefined,
  ventoClient: VentoClient,
  logger: Logger
): Promise<TextContent> {
  try {
    logger.warn(
      { boardId, cardId, params: "***" },
      "Action execution requested"
    );

    const result = await ventoClient.runAction(boardId, cardId, params);

    if (!result.success) {
      return {
        type: "text",
        text: `Action execution failed for card ${cardId}${result.result ? `: ${result.result}` : ""}`,
      };
    }

    let text = `✅ Action "${cardId}" executed successfully\n`;
    if (result.result) {
      text += `Result: ${JSON.stringify(result.result, null, 2)}`;
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
      "Failed to execute action"
    );
    return {
      type: "text",
      text: `Error executing action ${cardId} on board ${boardId}: ${errorMsg}`,
    };
  }
}
