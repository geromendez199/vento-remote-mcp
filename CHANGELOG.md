# Changelog

All notable changes to the Vento Remote MCP Connector project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- OAuth 2.0 authentication flow for Vento authorization
  - Secure token exchange without API key sharing
  - Revocable access tokens
  - Scoped permissions (read:boards, write:actions)
- Railway one-click deploy button
- OAuth documentation and setup guide
- Quick setup guide for all deployment methods
- `/auth/vento/authorize`, `/auth/vento/callback`, `/auth/vento/token` endpoints
- Environment variables: `OAUTH_ENABLED`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`

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
