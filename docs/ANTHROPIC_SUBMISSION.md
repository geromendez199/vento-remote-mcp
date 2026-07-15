# Anthropic MCP Directory Submission Checklist

Roadmap for getting Vento Remote MCP listed where users can enable it with one click.

## Where to submit

1. **Community servers list** — PR to https://github.com/modelcontextprotocol/servers
   (README "Community Servers" section). Low bar: working server + clear README.
2. **Anthropic Connectors Directory** (claude.ai) — requires a hosted, stable,
   OAuth-capable remote server. Submission via Anthropic's connector partner process.

## Readiness checklist

### Technical (required for both)
- [x] MCP protocol compliance: `initialize`, `tools/list`, `tools/call`, `ping`
- [x] Tools have JSON Schemas and clear natural-language descriptions
- [x] Destructive tools flagged and gate-able (`ALLOW_DESTRUCTIVE_TOOLS`)
- [x] Errors are sanitized, protocol-level failures use JSON-RPC error codes
- [x] Health endpoints for hosting (`/health`, `/health/live`)
- [x] Metrics for operations (`/metrics`)
- [ ] Streamable HTTP transport (current: plain JSON-RPC POST; SDK's
      `StreamableHTTPServerTransport` adoption is the next transport step)

### For the claude.ai Connectors Directory specifically
- [ ] Public, stable HTTPS URL (no localhost, no ephemeral hosts)
- [ ] OAuth 2.1 with Dynamic Client Registration (current OAuth is a session-token
      flow against the user's own Vento; directory-grade OAuth means the connector
      itself is the authorization server for Claude)
- [ ] Privacy policy + terms URL
- [ ] Support contact and SLA commitment
- [ ] Security review: token storage, scope minimization, audit logging

### Community servers PR (can do now)
- [x] Repo public with install instructions
- [x] Works with `claude mcp add`
- [x] Example configurations documented
- [ ] Open the PR: add one line under Community Servers:
      `- **[Vento](https://github.com/geromendez199/vento-remote-mcp)** - Control real-world devices, sensors and AI agents through Vento boards`

## Suggested submission copy

> **Vento Remote MCP** connects Claude to Vento, the open-source AI control
> platform for devices, machines and spaces. Claude can read live sensor
> values, monitor device fleets, execute physical actions (lights, locks,
> pumps) and delegate goals to Vento's on-premise AI agents — with per-tool
> permission gating, rate limiting, and full observability built in.

## Post-listing commitments

- Respond to directory-reported issues within 72h.
- Keep the MCP SDK dependency within one major version of latest.
- Never expand tool scopes without a version bump and changelog entry.
