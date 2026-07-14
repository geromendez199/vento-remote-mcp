import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  MCP_AUTH_TOKEN: z.string().min(32, "MCP_AUTH_TOKEN must be at least 32 characters"),
  VENTO_API_URL: z.string().url().default("http://localhost:8000"),
  VENTO_TOKEN: z.string().min(1, "VENTO_TOKEN is required"),
  VENTO_DEFAULT_BOARD: z.string().optional(),
  VENTO_DEFAULT_AGENT: z.string().optional(),
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .default("true"),
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .default(60),
});

export type Config = z.infer<typeof envSchema>;

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new Error(`Configuration validation failed:\n${errors}`);
    }
    config = result.data;
  }
  return config;
}

export function validateConfig(): void {
  getConfig();
}
