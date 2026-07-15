import { describe, it, expect } from "vitest";
import {
  buildPolicy,
  isToolAllowed,
  listAllowedTools,
} from "../src/permissions.js";
import { TOOL_REGISTRY, getToolDescriptor } from "../src/tools/registry.js";

describe("permissions", () => {
  it("allows all tools with an empty policy", () => {
    const policy = buildPolicy(undefined, true);
    expect(listAllowedTools(policy)).toHaveLength(TOOL_REGISTRY.length);
  });

  it("restricts to the allowed-tools list", () => {
    const policy = buildPolicy("vento_list_boards, vento_get_board", true);
    const allowed = listAllowedTools(policy).map((t) => t.name);
    expect(allowed).toEqual(["vento_list_boards", "vento_get_board"]);
  });

  it("hides danger-level tools when destructive tools are disallowed", () => {
    const policy = buildPolicy(undefined, false);
    const allowed = listAllowedTools(policy).map((t) => t.name);
    expect(allowed).not.toContain("vento_run_action");
    // warning-level tools stay available
    expect(allowed).toContain("vento_send_to_agent");
  });

  it("blocks a destructive tool even if explicitly listed", () => {
    const policy = buildPolicy("vento_run_action", false);
    const runAction = getToolDescriptor("vento_run_action");
    expect(runAction).toBeDefined();
    expect(isToolAllowed(policy, runAction!)).toBe(false);
  });

  it("handles whitespace and empty segments in the CSV", () => {
    const policy = buildPolicy(" vento_list_boards ,, ", true);
    const allowed = listAllowedTools(policy).map((t) => t.name);
    expect(allowed).toEqual(["vento_list_boards"]);
  });
});

describe("tool registry", () => {
  it("declares all six tools with schemas", () => {
    expect(TOOL_REGISTRY).toHaveLength(6);
    for (const tool of TOOL_REGISTRY) {
      expect(tool.name).toMatch(/^vento_/);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema.type).toBe("object");
      expect(["info", "warning", "danger"]).toContain(tool.dangerLevel);
    }
  });

  it("marks run_action as danger", () => {
    expect(getToolDescriptor("vento_run_action")?.dangerLevel).toBe("danger");
  });

  it("returns undefined for unknown tools", () => {
    expect(getToolDescriptor("nope")).toBeUndefined();
  });
});
