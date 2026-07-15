export type DangerLevel = "info" | "warning" | "danger";

export interface ToolDescriptor {
  name: string;
  description: string;
  dangerLevel: DangerLevel;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const instanceProperty = {
  instance: {
    type: "string",
    description:
      "Optional Vento instance name (from VENTO_INSTANCES). Defaults to the primary instance.",
  },
};

export const TOOL_REGISTRY: ToolDescriptor[] = [
  {
    name: "vento_list_boards",
    description:
      "List all boards available in the Vento instance, with their names and descriptions. Use this first to discover what can be monitored or controlled.",
    dangerLevel: "info",
    inputSchema: {
      type: "object",
      properties: { ...instanceProperty },
    },
  },
  {
    name: "vento_get_board",
    description:
      "Get the complete state of a board: all sensor values (value cards) and available actions (action cards).",
    dangerLevel: "info",
    inputSchema: {
      type: "object",
      properties: {
        boardId: {
          type: "string",
          description: "The board ID (from vento_list_boards)",
        },
        ...instanceProperty,
      },
      required: ["boardId"],
    },
  },
  {
    name: "vento_get_card_value",
    description:
      "Read the current value of a specific sensor (value card) on a board, including unit and last-update timestamp.",
    dangerLevel: "info",
    inputSchema: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "The board ID" },
        cardId: { type: "string", description: "The value card ID" },
        ...instanceProperty,
      },
      required: ["boardId", "cardId"],
    },
  },
  {
    name: "vento_list_devices",
    description:
      "List all devices connected to the Vento network with their online/offline status and last-seen timestamps.",
    dangerLevel: "info",
    inputSchema: {
      type: "object",
      properties: { ...instanceProperty },
    },
  },
  {
    name: "vento_run_action",
    description:
      "Execute an action card on a board. This performs a REAL action in the physical world (turn on lights, open doors, activate pumps). Confirm with the user before executing anything irreversible.",
    dangerLevel: "danger",
    inputSchema: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "The board ID" },
        cardId: { type: "string", description: "The action card ID" },
        params: {
          type: "object",
          description: "Optional parameters for the action",
        },
        ...instanceProperty,
      },
      required: ["boardId", "cardId"],
    },
  },
  {
    name: "vento_send_to_agent",
    description:
      "Send a message to a Vento AI agent. The agent may take autonomous actions in response, so treat this as potentially state-changing.",
    dangerLevel: "warning",
    inputSchema: {
      type: "object",
      properties: {
        agentName: { type: "string", description: "The agent name" },
        message: { type: "string", description: "The message to send" },
        ...instanceProperty,
      },
      required: ["agentName", "message"],
    },
  },
];

export function getToolDescriptor(name: string): ToolDescriptor | undefined {
  return TOOL_REGISTRY.find((t) => t.name === name);
}
