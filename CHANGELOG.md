# Changelog

All notable changes to the Vento Remote MCP Connector project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- OAuth 2.1 support for Anthropic directory submission
- Tool filtering and per-conversation permissions
- WebSocket transport support
- Multiple Vento instance support
- Board state caching and subscriptions
- Rate limiting metrics and monitoring
- Prometheus metrics export
- Persistent OAuth token storage with encryption
- OAuth scope management UI
- Token refresh before expiration
- OpenTelemetry distributed tracing
- Streamable HTTP transport (MCP SDK)
- Helm chart and AWS SAM templates

## [0.2.0] - 2026-07-15

### Fixed
- **MCP tool discovery**: the server never registered a `tools/list` handler
  and did not declare the `tools` capability — MCP clients could not discover
  any tools. Both are now implemented on stdio and HTTP transports.
- **MCP result shape**: `tools/call` returned a bare `TextContent` instead of
  the spec-compliant `{ content: [...] }` result envelope.
- **HTTP transport was initialize-only**: `/mcp` now implements the full
  JSON-RPC surface (`initialize`, `notifications/initialized`, `ping`,
  `tools/list`, `tools/call`).
- **Timing-unsafe auth**: bearer token comparison switched from `!==` to
  `crypto.timingSafeEqual` over SHA-256 digests.
- `npm test` no longer starts vitest in watch mode (`vitest run`; watch moved
  to `npm run test:watch`).

### Added
- OAuth 2.0 authorization flow (`/auth/vento/*` endpoints) with session
  tokens, CSRF-protected state, and revocation
- Prometheus metrics at `/metrics` (request duration histogram, Vento API
  call counters, tool execution counters, auth failures, rate-limited
  requests, cache hit/miss, in-flight gauge)
- Per-token rate limiting with burst control
  (`RATE_LIMIT_BURST_PER_SECOND`), keyed by token hash
- Board read caching with action-driven invalidation (`CACHE_TTL_SECONDS`)
- Multiple Vento instances via `VENTO_INSTANCES` JSON; tools accept an
  optional `instance` argument
- Tool permission policy: `ALLOWED_TOOLS` allowlist and
  `ALLOW_DESTRUCTIVE_TOOLS` read-only gate; tools carry danger levels
- Security headers middleware (HSTS, nosniff, DENY framing, CSP, no-store)
  with `CORS_ORIGINS` allowlist
- `X-Request-Id` correlation on all HTTP requests and logs
- Readiness endpoint `/health` (pings Vento, reports latency) and liveness
  endpoint `/health/live`
- 15-second timeout on all Vento API requests; path params URL-encoded
- Deploy configs: `render.yaml` (Render), `fly.toml` (Fly.io), Railway button
- Smart-home end-to-end example (`examples/smart-home/`)
- Docs: `docs/ARCHITECTURE.md`, `docs/TROUBLESHOOTING.md`,
  `docs/ANTHROPIC_SUBMISSION.md`, `FINDINGS.md` audit report
- Test suites for cache, rate limiter, permissions, instance registry,
  timing-safe auth, and the shared tool executor (5 → 42 tests)

## [0.1.0] - 2024-01-15

### Added
- Initial release of Vento Remote MCP Connector
- Core MCP server with 6 tools:
  - `vento_list_boards` - List available boards
  - `vento_get_board` - Get complete board state
  - `vento_get_card_value` - Read specific sensor values
  - `vento_list_devices` - Monitor connected devices
  - `vento_run_action` - Execute action cards
  - `vento_send_to_agent` - Communicate with AI agents
- Stdio transport for local development
- HTTP transport for remote deployment
- Bearer token authentication
- Support for multiple deployment platforms:
  - Docker
  - Railway
  - Render
  - Fly.io
  - VPS + Systemd
  - VPS + Cloudflare tunnel
- Comprehensive documentation:
  - README in English and Spanish
  - Deployment guides
  - API reference
  - Contribution guidelines
- GitHub Actions CI/CD pipeline
- Full test suite with Vitest
- ESLint and TypeScript strict mode
- Docker multi-stage build
- Development docker-compose environment
- Health check endpoint
- Structured logging with Pino
- Rate limiting support
- Environment validation with Zod

### Documentation
- Created main README with architecture diagram
- Created Spanish README translation
- Created Vento API reference documentation
- Created comprehensive deployment guide
- Created contribution guidelines
- Created GitHub issue and PR templates
- Created usage examples
- Created quick-start script

### Infrastructure
- GitHub Actions CI/CD with lint, type-check, test, build stages
- Docker image publishing to GHCR
- Systemd service file for VPS deployment
- Editor configuration (.editorconfig)
- Git attributes configuration
- Pre-commit hooks setup

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

## Release Schedule

- Patch releases: As needed for bug fixes
- Minor releases: Monthly for new features
- Major releases: As needed for breaking changes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Support

- **Issues**: [GitHub Issues](https://github.com/geromendez199/vento-remote-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/geromendez199/vento-remote-mcp/discussions)
- **Discord**: [Vento Discord](https://discord.gg/VpeZxMFfYW)
