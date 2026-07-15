# Smart Home — Example Claude Conversations

Real prompts you can try once the connector is running and the `Casa` board exists.

## 1. Morning check

**You:**
> Buen día. ¿Cómo está la casa?

**Claude (behind the scenes):** calls `vento_get_board` with `boardId: "casa"`.

**Claude:**
> ¡Buen día! Todo en orden:
> - 🌡️ Temperatura: 21.3°C — agradable
> - 💡 Luz ambiente: 620 lux — hay buena luz natural
> - 🚪 Puerta de entrada: cerrada
>
> No hace falta prender nada por ahora.

## 2. Conditional action

**You:**
> ¿Qué temperatura hay? Si está bajo 18°C prendé la calefacción.

**Claude:** calls `vento_get_card_value` (`casa` / `temperatura`) → 16.5°C, then
`vento_run_action` on the heating action.

> Está a 16.5°C, por debajo de tu umbral. Prendí la calefacción ✅.
> Te aviso que el termostato apunta a 21°C por las reglas del agente de la casa.

## 3. Leaving home (destructive actions need confirmation)

**You:**
> Me voy. Dejá todo seguro.

**Claude:**
> Reviso la casa:
> - Puerta de entrada: cerrada ✓
> - Luz del living: prendida → la apago
>
> Para armar la alarma en modo "away" necesito tu confirmación: ¿la activo?

**You:** Sí, activala.

**Claude:** runs `vento_run_action` (`activar_alarma`, `{"mode": "away"}`).
> Listo: luz apagada y alarma armada en modo away. ¡Buen viaje! 🔒

## 4. Delegate to the Vento agent

**You:**
> Decile al asistente de la casa que optimice el consumo eléctrico esta noche.

**Claude:** calls `vento_send_to_agent` (`asistente-casa`).

> Le pasé el objetivo al asistente de la casa. Respondió:
> "Programado: bajaré la calefacción a 19°C entre 00:00 y 06:00 y apagaré
> los standby de la TV y consola. Ahorro estimado: 1.2 kWh."

## 5. Multi-instance (if you configured VENTO_INSTANCES)

**You:**
> Compará la temperatura de casa con la de la oficina.

**Claude:** calls `vento_get_card_value` twice — once with default instance,
once with `instance: "oficina"` — and summarizes both.

## Tips

- Ask "¿qué podés hacer con mi casa?" — Claude lists the tools it discovered
  via `tools/list`, including which ones are dangerous.
- With `ALLOW_DESTRUCTIVE_TOOLS=false`, Claude will explain it can only read.
