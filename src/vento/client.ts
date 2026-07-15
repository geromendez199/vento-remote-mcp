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
import { TtlCache } from "../cache.js";
import { getMetrics } from "../observability/metrics.js";

const REQUEST_TIMEOUT_MS = 15_000;

export interface VentoClientOptions {
  baseUrl?: string;
  token?: string;
  cacheTtlMs?: number;
}

export class VentoClient {
  private baseUrl: string;
  private token: string;
  private logger: Logger;
  private cache: TtlCache<unknown>;

  constructor(logger: Logger, options: VentoClientOptions = {}) {
    const config = getConfig();
    this.baseUrl = (options.baseUrl ?? config.VENTO_API_URL).replace(/\/$/, "");
    this.token = options.token ?? config.VENTO_TOKEN;
    this.logger = logger;
    this.cache = new TtlCache<unknown>(
      options.cacheTtlMs ?? config.CACHE_TTL_SECONDS * 1000
    );
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const metrics = getMetrics();
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        metrics.ventoApiCalls.labels(endpoint, "http_error").inc();
        const errorData = await response.json().catch(() => ({}));
        throw new VentoErrorClass(
          `Vento API error: ${response.status} ${response.statusText}`,
          `HTTP_${response.status}`,
          errorData
        );
      }

      metrics.ventoApiCalls.labels(endpoint, "success").inc();
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof VentoErrorClass) {
        throw error;
      }
      metrics.ventoApiCalls.labels(endpoint, "network_error").inc();
      throw new VentoErrorClass(
        `Failed to connect to Vento API at ${url}`,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async cachedRequest<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    const metrics = getMetrics();
    const hit = this.cache.get(cacheKey);
    if (hit !== undefined) {
      metrics.cacheHits.inc();
      return hit as T;
    }
    metrics.cacheMisses.inc();
    const value = await fn();
    this.cache.set(cacheKey, value);
    return value;
  }

  // Lightweight connectivity probe used by the /health endpoint.
  async ping(): Promise<{ connected: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.request<unknown>("GET", "/api/boards/v1");
      return { connected: true, latencyMs: Date.now() - start };
    } catch {
      return { connected: false, latencyMs: Date.now() - start };
    }
  }

  async listBoards(): Promise<Board[]> {
    try {
      const boards = await this.cachedRequest("boards:list", () =>
        this.request<Board[]>("GET", "/api/boards/v1")
      );
      this.logger.debug({ count: boards.length }, "Listed boards");
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
      const board = await this.cachedRequest(`boards:${boardId}`, () =>
        this.request<Board>("GET", `/api/boards/v1/${encodeURIComponent(boardId)}`)
      );
      this.logger.debug({ boardId }, "Retrieved board");
      return board;
    } catch (error) {
      this.logger.error({ error, boardId }, "Failed to get board");
      throw error;
    }
  }

  async getCardValue(boardId: string, cardId: string): Promise<ValueCard> {
    try {
      // Card values are live sensor reads: never cached
      const card = await this.request<ValueCard>(
        "GET",
        `/api/boards/v1/${encodeURIComponent(boardId)}/cards/${encodeURIComponent(cardId)}`
      );
      this.logger.debug({ boardId, cardId }, "Retrieved card value");
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
        `/api/boards/v1/${encodeURIComponent(boardId)}/actions/${encodeURIComponent(cardId)}`,
        { params }
      );
      // Actions mutate board state: drop cached reads for this board
      this.cache.delete("boards:list");
      this.cache.deletePrefix(`boards:${boardId}`);
      this.logger.info({ boardId, cardId, params }, "Action executed");
      return result;
    } catch (error) {
      this.logger.error({ error, boardId, cardId }, "Failed to run action");
      throw error;
    }
  }

  async listDevices(): Promise<Device[]> {
    try {
      const devices = await this.request<Device[]>("GET", "/api/devices/v1");
      this.logger.debug({ count: devices.length }, "Listed devices");
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
      this.logger.debug({ count: agents.length }, "Listed agents");
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
        `/api/agents/v1/${encodeURIComponent(agentName)}/agent_input`,
        { message }
      );
      this.logger.info({ agentName }, "Message sent to agent");
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
