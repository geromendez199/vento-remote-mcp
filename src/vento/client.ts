import { getConfig } from "../config.js";
import {
  Board,
  ValueCard,
  Device,
  Agent,
  AgentResponse,
  VentoError as VentoErrorClass,
} from "./types.js";
import { Logger } from "pino";

export class VentoClient {
  private baseUrl: string;
  private token: string;
  private logger: Logger;

  constructor(logger: Logger) {
    const config = getConfig();
    this.baseUrl = config.VENTO_API_URL.replace(/\/$/, "");
    this.token = config.VENTO_TOKEN;
    this.logger = logger;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new VentoErrorClass(
          `Vento API error: ${response.status} ${response.statusText}`,
          `HTTP_${response.status}`,
          errorData
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof VentoErrorClass) {
        throw error;
      }
      throw new VentoErrorClass(
        `Failed to connect to Vento API at ${url}`,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async listBoards(): Promise<Board[]> {
    try {
      const boards = await this.request<Board[]>("GET", "/api/boards/v1");
      this.logger.debug({ boards }, "Listed boards");
      return boards;
    } catch (error) {
      this.logger.error(
        { error, endpoint: "/api/boards/v1" },
        "Failed to list boards"
      );
      throw error;
    }
  }

  async getBoard(boardId: string): Promise<Board> {
    try {
      const board = await this.request<Board>(
        "GET",
        `/api/boards/v1/${boardId}`
      );
      this.logger.debug({ boardId, board }, "Retrieved board");
      return board;
    } catch (error) {
      this.logger.error({ error, boardId }, "Failed to get board");
      throw error;
    }
  }

  async getCardValue(boardId: string, cardId: string): Promise<ValueCard> {
    try {
      const card = await this.request<ValueCard>(
        "GET",
        `/api/boards/v1/${boardId}/cards/${cardId}`
      );
      this.logger.debug({ boardId, cardId, card }, "Retrieved card value");
      return card;
    } catch (error) {
      this.logger.error(
        { error, boardId, cardId },
        "Failed to get card value"
      );
      throw error;
    }
  }

  async runAction(
    boardId: string,
    cardId: string,
    params?: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown }> {
    try {
      const result = await this.request<{ success: boolean; result?: unknown }>(
        "POST",
        `/api/boards/v1/${boardId}/actions/${cardId}`,
        { params }
      );
      this.logger.info(
        { boardId, cardId, params, result },
        "Action executed"
      );
      return result;
    } catch (error) {
      this.logger.error({ error, boardId, cardId }, "Failed to run action");
      throw error;
    }
  }

  async listDevices(): Promise<Device[]> {
    try {
      const devices = await this.request<Device[]>("GET", "/api/devices/v1");
      this.logger.debug({ devices }, "Listed devices");
      return devices;
    } catch (error) {
      this.logger.error(
        { error, endpoint: "/api/devices/v1" },
        "Failed to list devices"
      );
      throw error;
    }
  }

  async listAgents(): Promise<Agent[]> {
    try {
      const agents = await this.request<Agent[]>("GET", "/api/agents/v1");
      this.logger.debug({ agents }, "Listed agents");
      return agents;
    } catch (error) {
      this.logger.error(
        { error, endpoint: "/api/agents/v1" },
        "Failed to list agents"
      );
      throw error;
    }
  }

  async sendToAgent(
    agentName: string,
    message: string
  ): Promise<AgentResponse> {
    try {
      const response = await this.request<AgentResponse>(
        "POST",
        `/api/agents/v1/${agentName}/agent_input`,
        { message }
      );
      this.logger.info(
        { agentName, message, response },
        "Message sent to agent"
      );
      return response;
    } catch (error) {
      this.logger.error(
        { error, agentName },
        "Failed to send message to agent"
      );
      throw error;
    }
  }
}
