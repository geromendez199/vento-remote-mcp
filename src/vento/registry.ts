import { z } from "zod";
import { Logger } from "pino";
import { VentoClient } from "./client.js";

const instancesSchema = z.record(
  z.object({
    url: z.string().url(),
    token: z.string().min(1),
  })
);

export type VentoInstances = z.infer<typeof instancesSchema>;

export const DEFAULT_INSTANCE = "default";

// Parses the VENTO_INSTANCES JSON env var. Returns an empty object when unset.
// Throws a descriptive error on malformed input so misconfiguration fails fast.
export function parseInstances(json: string | undefined): VentoInstances {
  if (!json || json.trim().length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("VENTO_INSTANCES is not valid JSON");
  }
  const result = instancesSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `VENTO_INSTANCES is invalid: ${result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }
  return result.data;
}

// Registry of Vento clients keyed by instance name. The primary instance
// (VENTO_API_URL/VENTO_TOKEN) is always available as "default"; extra
// instances come from VENTO_INSTANCES.
export class VentoRegistry {
  private clients = new Map<string, VentoClient>();

  constructor(
    logger: Logger,
    primary: { url: string; token: string },
    extra: VentoInstances = {}
  ) {
    this.clients.set(
      DEFAULT_INSTANCE,
      new VentoClient(logger, { baseUrl: primary.url, token: primary.token })
    );
    for (const [name, cfg] of Object.entries(extra)) {
      this.clients.set(
        name,
        new VentoClient(logger, { baseUrl: cfg.url, token: cfg.token })
      );
    }
  }

  getClient(instanceName?: string): VentoClient {
    const name = instanceName ?? DEFAULT_INSTANCE;
    const client = this.clients.get(name);
    if (!client) {
      const known = [...this.clients.keys()].join(", ");
      throw new Error(
        `Unknown Vento instance "${name}". Known instances: ${known}`
      );
    }
    return client;
  }

  get instanceNames(): string[] {
    return [...this.clients.keys()];
  }
}
