export interface Board {
  id: string;
  name: string;
  description?: string;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  name: string;
  type: "value" | "action";
  boardId: string;
}

export interface ValueCard extends Card {
  type: "value";
  value: unknown;
  unit?: string;
  lastUpdated: string;
}

export interface ActionCard extends Card {
  type: "action";
  params?: Record<string, unknown>;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
  lastSeen: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  boardId?: string;
  status: "idle" | "running" | "error";
}

export interface AgentResponse {
  response: string;
  actions?: Array<{
    name: string;
    params?: Record<string, unknown>;
  }>;
}

export class VentoError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "VentoError";
    this.code = code;
    this.details = details;
  }
}
