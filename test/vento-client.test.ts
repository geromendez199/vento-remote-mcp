import { describe, it, expect, beforeEach, vi } from "vitest";
import pino from "pino";
import { VentoClient } from "../src/vento/client.js";

const logger = pino({ level: "silent" });

describe("VentoClient", () => {
  beforeEach(() => {
    process.env.VENTO_API_URL = "http://localhost:8000";
    process.env.VENTO_TOKEN = "test-token";
    process.env.MCP_AUTH_TOKEN = "test-mcp-token-very-long-string-to-be-at-least-32-chars";
    // Clear any cached config
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("listBoards", () => {
    it("should list boards successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "board-1",
            name: "Test Board",
            description: "A test board",
            cards: [],
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z",
          },
        ],
      });

      global.fetch = mockFetch;

      const client = new VentoClient(logger);
      const boards = await client.listBoards();

      expect(boards).toHaveLength(1);
      expect(boards[0].name).toBe("Test Board");
    });

    it("should handle API errors", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({}),
      });

      global.fetch = mockFetch;

      const client = new VentoClient(logger);

      await expect(client.listBoards()).rejects.toThrow(
        "Vento API error: 401 Unauthorized"
      );
    });

    it("should handle network errors", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

      global.fetch = mockFetch;

      const client = new VentoClient(logger);

      await expect(client.listBoards()).rejects.toThrow(
        "Failed to connect to Vento API"
      );
    });
  });

  describe("runAction", () => {
    it("should execute action with parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: { executedAt: "2024-01-15T10:05:30Z" },
        }),
      });

      global.fetch = mockFetch;

      const client = new VentoClient(logger);
      const result = await client.runAction("board-1", "card-1", {
        duration: 300,
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/boards/v1/board-1/actions/card-1"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("sendToAgent", () => {
    it("should send message to agent", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: "Agent response",
          actions: [{ name: "action_1", params: {} }],
        }),
      });

      global.fetch = mockFetch;

      const client = new VentoClient(logger);
      const response = await client.sendToAgent("my-agent", "Hello");

      expect(response.response).toBe("Agent response");
      expect(response.actions).toHaveLength(1);
    });
  });
});
