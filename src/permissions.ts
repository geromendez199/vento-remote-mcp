import { TOOL_REGISTRY, ToolDescriptor } from "./tools/registry.js";

export interface PermissionPolicy {
  allowedTools: Set<string> | null;
  allowDestructive: boolean;
}

// Builds the permission policy from environment-style inputs.
// allowedToolsCsv: comma-separated tool names; empty/undefined means "all tools".
// allowDestructive: when false, tools marked dangerLevel "danger" are hidden and blocked.
export function buildPolicy(
  allowedToolsCsv: string | undefined,
  allowDestructive: boolean
): PermissionPolicy {
  const trimmed = allowedToolsCsv?.trim();
  const allowedTools =
    trimmed && trimmed.length > 0
      ? new Set(
          trimmed
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        )
      : null;
  return { allowedTools, allowDestructive };
}

export function isToolAllowed(
  policy: PermissionPolicy,
  tool: ToolDescriptor
): boolean {
  if (policy.allowedTools && !policy.allowedTools.has(tool.name)) {
    return false;
  }
  if (tool.dangerLevel === "danger" && !policy.allowDestructive) {
    return false;
  }
  return true;
}

export function listAllowedTools(policy: PermissionPolicy): ToolDescriptor[] {
  return TOOL_REGISTRY.filter((tool) => isToolAllowed(policy, tool));
}
