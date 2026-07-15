# Architecture

## System Context (C4 Level 1)

```
┌────────────┐   MCP (stdio/HTTP)   ┌─────────────────────┐   REST + Bearer   ┌───────────┐
│   Claude    │ ───────────────────► │  Vento Remote MCP   │ ────────────────► │   Vento    │
│ (any client)│ ◄─────────────────── │     Connector       │ ◄──────────────── │  instance  │
└────────────┘                      └─────────────────────┘                   └───────────┘
                                                                                    │ MQTT
                                                                                    ▼
                                                                              Physical world
```

## Containers (C4 Level 2)

The connector is a single Node.js process with two entry transports sharing one
tool-execution core:

```
                       ┌───────────────────────────────────────────┐
 stdio (local dev) ───►│  MCP SDK Server (server.ts)               │
                       │    ├── tools/list handler                 │
                       │    └── tools/call handler ──┐             │
                       │                             ▼             │
 HTTP (production) ───►│  Express (index.ts)   executeTool()       │
   /mcp JSON-RPC       │    ├── requestId      (tools/execute.ts)  │
   /health, /metrics   │    ├── security headers     │             │
   /info, /auth/vento  │    ├── metrics              ▼             │
                       │    ├── rate limiter   VentoRegistry       │
                       │    └── bearer auth    (multi-instance)    │
                       │                             │             │
                       │                       VentoClient         │
                       │                       (cache + timeout)   │
                       └───────────────────────────────────────────┘
```

## Key Design Decisions

### 1. One execution path for two transports
`executeTool()` in `src/tools/execute.ts` is the single funnel for tool calls.
Both the MCP SDK server (stdio) and the HTTP JSON-RPC endpoint delegate to it,
so permissions, metrics, and error sanitization can never drift between
transports.

### 2. Permission policy is declarative and env-driven
`ALLOWED_TOOLS` (allowlist CSV) and `ALLOW_DESTRUCTIVE_TOOLS` (danger gate)
build a `PermissionPolicy` once at startup. Tools carry a `dangerLevel`
(`info` / `warning` / `danger`) in the registry; the policy filters both what
is *listed* (discovery) and what is *executable* (defense in depth — a client
that skips discovery still cannot call a hidden tool).

### 3. Multi-instance via registry, not client rewiring
`VentoRegistry` maps instance names to `VentoClient`s. The primary instance
(`VENTO_API_URL`) is always `default`; extras come from `VENTO_INSTANCES`
JSON. Tools accept an optional `instance` argument, so a single conversation
can span production and staging Vento instances.

### 4. Cache with action-driven invalidation
Board reads are cached (default 30s TTL). Executing an action immediately
invalidates that board's cached reads plus the board list, so Claude never
reasons about stale state right after changing it. Live sensor reads
(`getCardValue`) intentionally bypass the cache.

### 5. Security posture
- Timing-safe bearer comparison (SHA-256 + `crypto.timingSafeEqual`).
- Rate limiting keyed by token hash (falls back to IP), minute window + burst.
- Response headers: HSTS, nosniff, DENY framing, no-store, restrictive CSP.
- Errors returned to clients are sanitized messages — never stack traces.
- Path parameters are URL-encoded before interpolation into Vento URLs.

### 6. Observability
- `prom-client` metrics at `/metrics` (auth-protected): request duration
  histogram, Vento call counters by endpoint/outcome, tool execution counters,
  auth failures, rate-limited requests, cache hit/miss, in-flight gauge.
- `X-Request-Id` correlation on every HTTP request, propagated into logs.
- `/health` = readiness (pings Vento, reports latency); `/health/live` =
  liveness (no upstream calls). Map these to K8s probes directly.

### 7. What is deliberately NOT here (yet)
- OpenTelemetry tracing: the middleware seams exist (metrics middleware,
  executeTool funnel); adding a tracer is additive, not a refactor.
- Redis: `TtlCache` is interface-compatible with a Redis adapter.
- Native mTLS: terminate at a reverse proxy (nginx/Caddy) in front.

## Module Map

| Path | Responsibility |
|------|----------------|
| `src/index.ts` | Bootstrap, transport selection, HTTP pipeline |
| `src/server.ts` | MCP SDK server (stdio transport) |
| `src/tools/registry.ts` | Tool descriptors: schemas + danger levels |
| `src/tools/execute.ts` | Shared tool execution funnel |
| `src/tools/*.ts` | Individual tool handlers (formatting + calls) |
| `src/vento/client.ts` | Vento REST client: timeout, cache, metrics |
| `src/vento/registry.ts` | Multi-instance client registry |
| `src/permissions.ts` | Permission policy engine |
| `src/auth.ts` | Bearer auth (timing-safe) |
| `src/rateLimit.ts` | Per-client rate limiter |
| `src/cache.ts` | TTL cache |
| `src/observability/metrics.ts` | Prometheus metrics |
| `src/security/headers.ts` | Security headers + CORS allowlist |
| `src/middleware/requestId.ts` | Request correlation |
| `src/routes/oauth.ts`, `src/oauth.ts` | OAuth 2.0 session flow |
| `src/config.ts` | Zod-validated environment config |
