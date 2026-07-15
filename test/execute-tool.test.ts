import { describe, it, expect, beforeEach, vi } from "vitest";
import pino from "pino";
import { executeTool } from "../src/tools/execute.js";
import { VentoRegistry } from "../src/vento/registry.js";
import { buildPolicy } from "../src/permissions.js";

const logger = pino({ level: "silent" });

function makeRegistry(): VentoRegistry {
  return new VentoRegistry(logger, {
    url: "http://localhost:8000",
    token: "test-token",
  });
}

describe("executeTool", () => {
  beforeEach(() => {
    process.env.VENTO_API_URL = "http://localhost:8000";
    process.env.VENTO_TOKEN = "test-token";
    process.env.MCP_AUTH_TOKEN =
      "test-mcp-token-very-long-string-to-be-at-least-32-chars";
    vi.clearAllMocks();
  });

  it("returns isError for unknown tools", async () => {
    const result = await executeTool(
      "not_a_tool",
      {},
      makeRegistry(),
      buildPolicy(undefined, true),
      logger
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("denies tools blocked by the permission policy", async () => {
    const result = await executeTool(
      "vento_run_action",
      { boardId: "b", cardId: "c" },
      makeRegistry(),
      buildPolicy(undefined, false),
      logger
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("permission policy");
  });

  it("executes an allowed tool end to end", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "board-1",
          name: "Test Board",
          description: "desc",
          cards: [],
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z",
        },
      ],
    });

    const result = await executeTool(
      "vento_list_boards",
      {},
      makeRegistry(),
      buildPolicy(undefined, true),
      logger
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Test Board");
  });

  it("returns a sanitized error for unknown instances", async () => {
    const result = await executeTool(
      "vento_list_boards",
      { instance: "nope" },
      makeRegistry(),
      buildPolicy(undefined, true),
      logger
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown Vento instance");
  });
});
