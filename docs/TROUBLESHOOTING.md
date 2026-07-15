# Troubleshooting

Quick answers to the most common problems, grouped by symptom.

## Connection & Startup

**Q: The server exits immediately with "Configuration validation failed".**
A: A required env var is missing or invalid. The error lists exactly which. Most common: `MCP_AUTH_TOKEN` shorter than 32 chars, or `VENTO_API_URL` not a valid URL.

**Q: `Error: VENTO_INSTANCES is not valid JSON`.**
A: The env var must be a single-line JSON object: `{"staging":{"url":"https://...","token":"..."}}`. Watch for shell quoting — wrap the whole value in single quotes.

**Q: The server starts in stdio mode when I wanted HTTP.**
A: Set `MCP_TRANSPORT=http` explicitly. Auto-detection uses TTY state, which containers can confuse.

**Q: `/health` returns 503 with `"status": "degraded"`.**
A: The connector is up but can't reach Vento. Check `VENTO_API_URL` is reachable *from where the connector runs* (a Docker container can't see your host's `localhost` — use `host.docker.internal`).

## Authentication

**Q: Claude gets 401 from the connector.**
A: In order: (1) the header must be exactly `Authorization: Bearer <token>`; (2) the token must match `MCP_AUTH_TOKEN` byte-for-byte — re-copy it, watch for trailing whitespace/newlines; (3) if you rotated the token, restart the connector.

**Q: The connector gets 401 from Vento (`Vento API error: 401`).**
A: `VENTO_TOKEN` is wrong or expired. Test directly: `curl -H "Authorization: Bearer $VENTO_TOKEN" $VENTO_API_URL/api/boards/v1`.

**Q: I get 429 Too Many Requests.**
A: Rate limiting fired. Defaults: 60 req/min, 10 req/sec burst per token. Raise `RATE_LIMIT_REQUESTS_PER_MINUTE` / `RATE_LIMIT_BURST_PER_SECOND`, or disable with `RATE_LIMIT_ENABLED=false` for local dev.

## Tools

**Q: Claude says it has no Vento tools.**
A: Check `GET /info` — the `tools` array shows what the connector exposes. Empty? Your `ALLOWED_TOOLS` filter excludes everything, or `ALLOW_DESTRUCTIVE_TOOLS=false` hid the only tools you listed.

**Q: `vento_run_action` is missing but read tools work.**
A: `ALLOW_DESTRUCTIVE_TOOLS=false` is set. That's the read-only mode working as designed.

**Q: Tool calls return "Unknown Vento instance".**
A: The `instance` argument doesn't match a key in `VENTO_INSTANCES`. The error lists known instances. The primary instance is always named `default`.

**Q: Claude sees stale board values right after an action.**
A: Shouldn't happen — actions invalidate that board's cache. If it does, the change may have been made outside the connector (Vento UI, MQTT). Lower `CACHE_TTL_SECONDS` or set it to `0` to disable read caching.

## Deployment

**Q: Docker build fails with `tsc: not found`.**
A: You're on an old Dockerfile. The builder stage must run `npm ci` (all deps) before `npm run build`, then prune. Current `Dockerfile` in main does this.

**Q: Railway/Render deploy succeeds but requests hang.**
A: Confirm the platform routes to port 3000 (or set `PORT` to the platform-provided value) and `MCP_TRANSPORT=http` is set.

**Q: Fly.io health checks fail on cold start.**
A: `/health` pings Vento, which can be slow on wake. Point platform checks at `/health/live` (liveness) as `fly.toml` in this repo already does.

**Q: How do I scrape metrics with Prometheus?**
A: `/metrics` requires the bearer token:
```yaml
scrape_configs:
  - job_name: vento-remote-mcp
    authorization:
      type: Bearer
      credentials: <MCP_AUTH_TOKEN>
    static_configs:
      - targets: ["your-connector:3000"]
```

## OAuth

**Q: `/auth/vento/authorize` returns 503 "OAuth not configured".**
A: `OAUTH_ENABLED=true` alone isn't enough — `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, and `OAUTH_REDIRECT_URI` must all be set.

**Q: Callback fails with "Invalid or expired state".**
A: The state expires after 10 minutes and is single-use. Restart the flow from `/authorize`. Also ensure both requests hit the *same* connector instance (state is in-memory).

**Q: OAuth session tokens stop working after a restart/deploy.**
A: Session tokens are in-memory by design in v0.2.x. Re-authorize after restarts, or use the static `MCP_AUTH_TOKEN` for long-lived setups.

## Logs & Debugging

**Q: How do I correlate a Claude error with server logs?**
A: Every HTTP response carries `X-Request-Id`. Grep the logs for that id — all log lines for that request include `reqId`.

**Q: How do I see what the connector sends to Vento?**
A: Set `LOG_LEVEL=debug`. Debug logs include endpoints and result counts, never tokens.

**Q: Can I test tools without Claude?**
A: Yes, via plain JSON-RPC:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"vento_list_boards","arguments":{}}}'
```
Or use the MCP Inspector for stdio mode: `npm run inspector`.

Still stuck? Open an issue with your `X-Request-Id`, sanitized logs, and `/info` output: https://github.com/geromendez199/vento-remote-mcp/issues
