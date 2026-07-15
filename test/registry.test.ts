import { describe, it, expect, beforeEach } from "vitest";
import pino from "pino";
import {
  parseInstances,
  VentoRegistry,
  DEFAULT_INSTANCE,
} from "../src/vento/registry.js";

const logger = pino({ level: "silent" });

describe("parseInstances", () => {
  it("returns empty object for undefined/empty input", () => {
    expect(parseInstances(undefined)).toEqual({});
    expect(parseInstances("")).toEqual({});
    expect(parseInstances("   ")).toEqual({});
  });

  it("parses a valid instances map", () => {
    const json = JSON.stringify({
      staging: { url: "https://staging.example.com", token: "tok-1" },
      production: { url: "https://prod.example.com", token: "tok-2" },
    });
    const result = parseInstances(json);
    expect(Object.keys(result)).toEqual(["staging", "production"]);
    expect(result.staging.url).toBe("https://staging.example.com");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseInstances("{not json")).toThrow(
      "VENTO_INSTANCES is not valid JSON"
    );
  });

  it("throws on invalid shape", () => {
    expect(() =>
      parseInstances(JSON.stringify({ bad: { url: "not-a-url", token: "" } }))
    ).toThrow("VENTO_INSTANCES is invalid");
  });
});

describe("VentoRegistry", () => {
  beforeEach(() => {
    process.env.VENTO_API_URL = "http://localhost:8000";
    process.env.VENTO_TOKEN = "test-token";
    process.env.MCP_AUTH_TOKEN =
      "test-mcp-token-very-long-string-to-be-at-least-32-chars";
  });

  it("always exposes the default instance", () => {
    const registry = new VentoRegistry(logger, {
      url: "http://localhost:8000",
      token: "tok",
    });
    expect(registry.instanceNames).toEqual([DEFAULT_INSTANCE]);
    expect(registry.getClient()).toBeDefined();
    expect(registry.getClient(DEFAULT_INSTANCE)).toBeDefined();
  });

  it("registers extra instances", () => {
    const registry = new VentoRegistry(
      logger,
      { url: "http://localhost:8000", token: "tok" },
      { staging: { url: "https://staging.example.com", token: "tok-2" } }
    );
    expect(registry.instanceNames).toContain("staging");
    expect(registry.getClient("staging")).toBeDefined();
  });

  it("throws a descriptive error for unknown instances", () => {
    const registry = new VentoRegistry(logger, {
      url: "http://localhost:8000",
      token: "tok",
    });
    expect(() => registry.getClient("nope")).toThrow(
      'Unknown Vento instance "nope"'
    );
  });
});
