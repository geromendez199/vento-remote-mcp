import { Tool, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoClient } from "../vento/client.js";
import { Logger } from "pino";

export function createListDevicesTool(
  ventoClient: VentoClient,
  logger: Logger
): Tool {
  return {
    name: "vento_list_devices",
    description:
      "List all connected devices in the Vento network. Includes ESP32 boards, Android devices, and other connected agents with their online status.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  };
}

export async function handleListDevices(
  ventoClient: VentoClient,
  logger: Logger
): Promise<TextContent> {
  try {
    const devices = await ventoClient.listDevices();

    if (devices.length === 0) {
      return {
        type: "text",
        text: "No devices found in Vento network.",
      };
    }

    const online = devices.filter((d) => d.status === "online");
    const offline = devices.filter((d) => d.status === "offline");

    let text = `Found ${devices.length} device(s) in Vento network:\n\n`;

    if (online.length > 0) {
      text += `## Online (${online.length})\n`;
      online.forEach((device) => {
        text += `- **${device.name}** (${device.type})\n`;
        text += `  ID: ${device.id}\n`;
        text += `  Last seen: ${device.lastSeen}\n`;
      });
      text += "\n";
    }

    if (offline.length > 0) {
      text += `## Offline (${offline.length})\n`;
      offline.forEach((device) => {
        text += `- **${device.name}** (${device.type})\n`;
        text += `  ID: ${device.id}\n`;
        text += `  Last seen: ${device.lastSeen}\n`;
      });
    }

    return {
      type: "text",
      text,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    logger.error({ error }, "Failed to list devices");
    return {
      type: "text",
      text: `Error listing devices: ${errorMsg}`,
    };
  }
}
