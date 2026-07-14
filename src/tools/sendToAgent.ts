import { Tool, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoClient } from "../vento/client.js";
import { Logger } from "pino";

export function createSendToAgentTool(
  ventoClient: VentoClient,
  logger: Logger
): Tool {
  return {
    name: "vento_send_to_agent",
    description:
      "Send a message to a Vento AI agent. The agent will process the message using its LLM and may execute actions based on its decision. Useful for triggering automation flows or querying agent intelligence.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentName: {
          type: "string",
          description: "The name of the agent to send the message to",
        },
        message: {
          type: "string",
          description: "The message to send to the agent",
        },
      },
      required: ["agentName", "message"],
    },
  };
}

export async function handleSendToAgent(
  agentName: string,
  message: string,
  ventoClient: VentoClient,
  logger: Logger
): Promise<TextContent> {
  try {
    logger.info(
      { agentName, message: "***" },
      "Sending message to agent"
    );

    const response = await ventoClient.sendToAgent(agentName, message);

    let text = `**Agent Response:**\n${response.response}\n`;

    if (response.actions && response.actions.length > 0) {
      text += `\n**Actions Executed:** (${response.actions.length})\n`;
      response.actions.forEach((action) => {
        text += `- ${action.name}`;
        if (action.params) {
          text += ` (params: ${JSON.stringify(action.params)})`;
        }
        text += "\n";
      });
    }

    return {
      type: "text",
      text,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    logger.error(
      { error, agentName },
      "Failed to send message to agent"
    );
    return {
      type: "text",
      text: `Error sending message to agent "${agentName}": ${errorMsg}`,
    };
  }
}
