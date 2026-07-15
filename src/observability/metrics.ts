import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from "prom-client";
import { Request, Response, NextFunction } from "express";

export class Metrics {
  readonly registry: Registry;
  readonly httpRequestDuration: Histogram<string>;
  readonly ventoApiCalls: Counter<string>;
  readonly toolExecutions: Counter<string>;
  readonly authFailures: Counter<string>;
  readonly rateLimited: Counter<string>;
  readonly cacheHits: Counter<string>;
  readonly cacheMisses: Counter<string>;
  readonly activeConnections: Gauge<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_ms",
      help: "HTTP request duration in milliseconds",
      labelNames: ["method", "route", "status"],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry],
    });

    this.ventoApiCalls = new Counter({
      name: "vento_api_calls_total",
      help: "Total calls made to the Vento API",
      labelNames: ["endpoint", "outcome"],
      registers: [this.registry],
    });

    this.toolExecutions = new Counter({
      name: "mcp_tool_executions_total",
      help: "Total MCP tool executions",
      labelNames: ["tool", "outcome"],
      registers: [this.registry],
    });

    this.authFailures = new Counter({
      name: "auth_failures_total",
      help: "Total authentication failures",
      registers: [this.registry],
    });

    this.rateLimited = new Counter({
      name: "rate_limited_requests_total",
      help: "Total requests rejected by rate limiting",
      registers: [this.registry],
    });

    this.cacheHits = new Counter({
      name: "cache_hits_total",
      help: "Total cache hits",
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: "cache_misses_total",
      help: "Total cache misses",
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: "active_connections",
      help: "Number of in-flight HTTP requests",
      registers: [this.registry],
    });
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = process.hrtime.bigint();
      this.activeConnections.inc();
      res.on("finish", () => {
        this.activeConnections.dec();
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        // Use req.path (not originalUrl) to avoid unbounded label cardinality from query strings
        const route = req.path.startsWith("/auth/vento/")
          ? "/auth/vento/*"
          : req.path;
        this.httpRequestDuration
          .labels(req.method, route, String(res.statusCode))
          .observe(durationMs);
      });
      next();
    };
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }
}

let metrics: Metrics | null = null;

export function getMetrics(): Metrics {
  if (!metrics) {
    metrics = new Metrics();
  }
  return metrics;
}

export function resetMetricsForTests(): void {
  metrics = null;
}
