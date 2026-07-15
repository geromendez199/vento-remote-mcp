# Smart Home Example

A complete, runnable scenario: Claude controlling a smart home through Vento.

## The Scenario

Your house has one Vento board called **Casa** with:

| Card | Type | What it does |
|------|------|--------------|
| `temperatura` | Value card | Living room temperature (°C) |
| `luz_ambiente` | Value card | Ambient light level (lux) |
| `puerta_entrada` | Value card | Front door state (open/closed) |
| `prender_luz` | Action card | Turns the living room light on/off |
| `abrir_puerta` | Action card | Unlocks the front door |
| `activar_alarma` | Action card | Arms the alarm system |

Plus one Vento agent, **asistente-casa**, that can reason about the house state.

## Run It

```bash
cd examples/smart-home
cp .env.example .env
# Edit .env: set MCP_AUTH_TOKEN (openssl rand -hex 32) and your Vento credentials
docker compose up
```

This starts the connector on `http://localhost:3000` pointed at your Vento instance.
Then configure the board in your Vento UI using `vento-board.json` as the reference layout.

## Connect Claude

**Claude Code:**
```bash
claude mcp add --transport http vento http://localhost:3000/mcp \
  --header "Authorization: Bearer YOUR_MCP_AUTH_TOKEN"
```

**Claude.ai / Desktop:** Settings → Connectors → Add → URL `http://localhost:3000` + your token.

## Example Conversations

See [claude-prompts.md](claude-prompts.md) for full transcripts. Highlights:

### Temperature-driven heating
> **You:** ¿Qué temperatura hay en casa? Si está bajo 18°C, prendé la calefacción.
>
> Claude reads `temperatura` via `vento_get_card_value`, sees 16.5°C, and runs
> the heating action with `vento_run_action` — then confirms what it did.

### Leaving home
> **You:** Me voy de casa. Dejá todo seguro.
>
> Claude checks `puerta_entrada` (closed ✓), turns off `prender_luz`, and arms
> `activar_alarma` — asking you to confirm before arming, because `vento_run_action`
> is flagged as a dangerous tool.

### Delegating to the Vento agent
> **You:** Decile al asistente de la casa que optimice el consumo esta noche.
>
> Claude uses `vento_send_to_agent` to hand the goal to `asistente-casa`, which
> schedules the changes locally — even when Claude is offline.

## Safety Notes

- `vento_run_action` is marked `dangerLevel: danger` in the tool registry.
  For a demo with guests, set `ALLOW_DESTRUCTIVE_TOOLS=false` to make the
  connector read-only.
- Use a dedicated Vento token for the connector with only this board's scope.
