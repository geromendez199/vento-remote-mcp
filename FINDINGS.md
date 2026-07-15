# Codebase Audit Findings

Audit date: 2026-07-15 · Scope: full `src/`, `test/`, CI, Docker, docs.

## What is done well

- TypeScript strict mode enabled and passing with zero errors.
- Clean separation: config (Zod-validated), Vento client, tools, auth, transports.
- Dual transport (stdio for local, HTTP for remote) detected automatically.
- Multi-stage Docker build with non-root runtime and healthcheck.
- CI covers lint, type-check, test, build, and Docker publish to GHCR.
- Secrets never logged; auth failures logged without token material.
- Documentation breadth (EN/ES README, deploy guides, OAuth, security policy).

## Defects found (fixed in v0.2.0)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | **High** | MCP server never registered a `tools/list` handler, so MCP clients could not discover the 6 tools. Server capabilities were also not declared. | Added tool registry with JSON Schemas, `ListToolsRequestSchema` handler, and declared `tools` capability. |
| 2 | **High** | Bearer token comparison used `!==`, which leaks timing information (character-by-character early exit). | Replaced with `crypto.timingSafeEqual` over SHA-256 digests. |
| 3 | Medium | No rate limiting was actually enforced despite `RATE_LIMIT_*` config existing. | Implemented per-token sliding-window limiter with burst control, wired into HTTP pipeline. |
| 4 | Medium | No security headers on HTTP responses (HSTS, nosniff, frame options). | Added security headers middleware. |
| 5 | Medium | `/health` reported `ok` even when Vento was unreachable — useless as a readiness probe. | Health endpoint now pings Vento and reports latency; `/health/live` stays cheap for liveness. |
| 6 | Low | `npm test` ran vitest in watch mode locally (hangs scripts/CI shells without TTY detection). | `test` is now `vitest run`; watch moved to `test:watch`. |
| 7 | Low | No request correlation: logs from concurrent requests were indistinguishable. | Added `X-Request-Id` middleware; id propagated into logs. |
| 8 | Low | Every request re-read board state from Vento; no caching layer. | Added TTL cache (default 30s) for board reads, invalidated on action execution. |

## Gaps identified (addressed where noted)

- **Observability**: no metrics of any kind. → Added Prometheus `/metrics` via prom-client (request histograms, Vento call counters, auth failure counter). Distributed tracing (OpenTelemetry) remains on the roadmap; the metrics module is structured so a tracer can hook the same middleware points.
- **Tool permissions**: all tools always exposed, including destructive ones. → Added `ALLOWED_TOOLS` / `ALLOW_DESTRUCTIVE_TOOLS` policy engine with per-tool danger levels.
- **Multi-instance**: single Vento instance hardcoded. → Added `VENTO_INSTANCES` JSON registry; tools accept optional `instance` argument.
- **Deploy coverage**: only Railway config existed. → Added `render.yaml` and `fly.toml`. Helm/K8s and AWS SAM remain on the roadmap.
- **Test coverage**: only the Vento client had tests. → Added unit suites for cache, rate limiter, permissions, instance registry, tool registry, and timing-safe auth.
- **mTLS**: not implemented in-process. Documented the recommended pattern (terminate mTLS at a reverse proxy — nginx/Caddy/Cloudflare — in front of the connector) in `SECURITY.md`; native support stays on the roadmap.

## Residual risks / honest caveats

- Vento API endpoint paths were derived from the Protofy README, not a running instance. Integration tests against a live Vento are still the missing confidence layer (`examples/smart-home` provides the harness for this).
- OAuth session tokens live in memory and are lost on restart — acceptable for single-instance deploys, not for horizontal scaling. Redis-backed store is the planned fix.
- The `npm audit` report shows vulnerabilities in dev-only tooling (`@typescript-eslint` v6 chain via `minimatch`); they do not ship in the production image. Upgrading to typescript-eslint v8 is a breaking change tracked for the next major tooling bump.
