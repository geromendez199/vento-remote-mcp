# Conector Vento Remote MCP

<div align="center">

[![Estado CI](https://github.com/geromendez199/vento-remote-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/geromendez199/vento-remote-mcp/actions)
[![Licencia](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

**Conecta Claude, Claude Desktop y Cursor a cualquier instancia de Vento mediante Model Context Protocol**

</div>

Vento Remote MCP es un servidor remoto production-ready que conecta Claude (claude.ai, app móvil, Claude Desktop, Claude Code y la API de Anthropic) con cualquier instancia de Vento (self-hosted o cloud.vento.build). Permite que asistentes IA lean valores de sensores, monitoreen el estado de dispositivos y ejecuten acciones en el mundo real a través de boards y agentes de Vento.

## ¿Qué es Vento?

[Vento](https://github.com/protofy-xyz/protofy) es una plataforma de control e automatización con IA para dispositivos, máquinas y espacios:

- **Boards**: Tableros visuales compuestos por cards que representan sensores (value cards) y actuadores (action cards)
- **Agentes IA**: Bucles de decisión impulsados por LLMs que observan, deciden y actúan
- **Integración de Dispositivos**: Soporte nativo para ESP32/ESPHome, teléfonos Android, agentes Go/Python y dispositivos MQTT personalizados
- **Control en Tiempo Real**: Comunicación instantánea basada en MQTT con dispositivos físicos y sensores

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      ECOSISTEMA CLAUDE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Claude.ai   │  │Claude Desktop│  │   Claude Code      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────────┘    │
│         └────────────┬────────────────────────┘                 │
│                      │                                          │
│                      ▼                                          │
│         ┌─────────────────────────────┐                        │
│         │ API Anthropic / Cliente MCP │                        │
│         └────────────┬────────────────┘                        │
└──────────────────────┼─────────────────────────────────────────┘
                       │
                       │ HTTP (Autenticación Bearer)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│    CONECTOR VENTO REMOTE MCP (Este Proyecto)                   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ • Registro de Herramientas (6 tools MCP)                   ││
│  │ • Manejador del Protocolo MCP                              ││
│  │ • Cliente de API de Vento                                  ││
│  │ • Autenticación y Rate Limiting                            ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ REST (Autenticación Bearer)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│        API CORE DE VENTO (Tu Instancia de Vento)               │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ • /api/boards/v1 - Gestión de Boards y Cards             ││
│  │ • /api/agents/v1 - Agentes IA                            ││
│  │ • /api/devices/v1 - Registro de Dispositivos            ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
          ┌──────────────────────────────┐
          │  MUNDO FÍSICO (Acciones Real)│
          │  • Dispositivos IoT (ESP32)  │
          │  • Motores y Sensores        │
          │  • Teléfonos Android         │
          │  • Red MQTT                  │
          └──────────────────────────────┘
```

## Inicio Rápido

### Requisitos Previos

- Node.js 20+ o Docker
- Una instancia de Vento en ejecución (local o remota)
- Token de API de Vento
- Clave de API de Anthropic (para integración con claude.ai)

### Instalación

#### Opción 1: Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp

# Configurar entorno
cp .env.example .env
# Edita .env con tus credenciales de Vento

# Iniciar el conector
docker compose up
```

#### Opción 2: Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env
# Edita .env con tus credenciales de Vento

# Iniciar en modo desarrollo
npm run dev

# O compilar y ejecutar en producción
npm run build
npm start
```

#### Opción 3: Desplegar en la Nube

**Railway**

[![Desplegar en Railway](https://railway.app/button.svg)](https://railway.app/new?template=https://github.com/geromendez199/vento-remote-mcp&envs=MCP_AUTH_TOKEN,VENTO_API_URL,VENTO_TOKEN)

**Render**

[![Desplegar a Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/geromendez199/vento-remote-mcp)

**Fly.io**

```bash
fly launch --repo https://github.com/geromendez199/vento-remote-mcp
fly secrets set MCP_AUTH_TOKEN=tu-token
fly secrets set VENTO_API_URL=https://tu-instancia-vento.com
fly secrets set VENTO_TOKEN=tu-token-api-vento
fly deploy
```

**VPS + Cloudflared**

```bash
# Desplegar en VPS
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp
npm install && npm run build

# Instalar servicio systemd
sudo cp systemd/vento-remote-mcp.service /etc/systemd/system/
sudo systemctl enable vento-remote-mcp
sudo systemctl start vento-remote-mcp

# Exponer vía túnel Cloudflared
cloudflared tunnel create vento-mcp
cloudflared tunnel route dns vento-mcp tu-dominio.com
cloudflared tunnel run --token $TUNNEL_TOKEN
```

## Uso con Claude

### Claude.ai o Aplicación Móvil de Claude

1. Ve a [claude.ai/app](https://claude.ai/app)
2. Haz clic en **Configuración** → **Conectores Personalizados**
3. Haz clic en **Agregar Conector Personalizado**
4. Ingresa:
   - **Nombre**: Vento
   - **URL del Servidor**: `https://tu-url-conector.com`
5. En la sección de encabezados de solicitud, agrega:
   - **Clave**: `Authorization`
   - **Valor**: `Bearer TU_MCP_AUTH_TOKEN`
6. Guarda

Ahora puedes pedirle a Claude que "liste mis boards de Vento" o "encienda la bomba".

### Claude Desktop

Agrega a `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "vento": {
      "url": "https://tu-url-conector.com",
      "auth": {
        "type": "bearer",
        "token": "TU_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

### Cursor

Agrega a `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vento": {
      "url": "https://tu-url-conector.com",
      "auth": {
        "type": "bearer",
        "token": "TU_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

## Herramientas Disponibles

| Herramienta | Descripción | Caso de Uso |
|-------------|-------------|------------|
| `vento_list_boards` | Lista todos los boards | Descubrir boards disponibles |
| `vento_get_board` | Obtén el estado completo de un board | Monitorea datos de sensores |
| `vento_get_card_value` | Obtén el valor actual de una card de sensor | Verifica lectura de sensor única |
| `vento_list_devices` | Lista dispositivos conectados | Monitorea estado de red |
| `vento_run_action` | **Ejecuta** una acción ⚠️ | Controla bombas, motores, GPIO |
| `vento_send_to_agent` | Envía mensaje a agente IA | Activa flujos de automatización |

## Seguridad

⚠️ **Importante**: Este conector controla dispositivos físicos reales. Úsalo con precaución.

### Autenticación

1. **Claude ↔ Conector**: Token Bearer en encabezados HTTP
   - Establece `MCP_AUTH_TOKEN` a un valor aleatorio fuerte (mín. 32 caracteres)
   - Genera: `openssl rand -hex 32`
   - Nunca confirmes tokens en control de versiones

2. **Conector ↔ Vento**: Token de API en variables de entorno
   - Almacena `VENTO_TOKEN` en variables de entorno, no en código
   - Usa tokens separados para dev/prod
   - Rota regularmente

## Desarrollo

### Estructura del Proyecto

```
vento-remote-mcp/
├── src/
│   ├── index.ts              # Bootstrap del servidor
│   ├── server.ts             # Registro de herramientas MCP
│   ├── config.ts             # Validación de entorno (zod)
│   ├── auth.ts               # Middleware de token Bearer
│   ├── vento/
│   │   ├── client.ts         # Cliente HTTP para Vento
│   │   └── types.ts          # Tipos TypeScript para Vento
│   └── tools/                # Implementación de herramientas
├── test/                     # Tests unitarios e integración
├── docs/
│   ├── vento-api.md          # Referencia completa de API
│   └── deploy.md             # Guías de despliegue
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Ejecución de Tests

```bash
# Ejecutar todos los tests
npm test

# Modo watch
npm test -- --watch

# Reporte de cobertura
npm test -- --coverage
```

### Revisión de Tipo y Linting

```bash
# Verificar tipos
npm run type-check

# Linting
npm run lint

# Arreglar problemas de linting
npm run lint -- --fix
```

## Comunidad y Soporte

- **Discord**: [Únete a Discord de Vento](https://discord.gg/VpeZxMFfYW)
- **Problemas**: [GitHub Issues](https://github.com/geromendez199/vento-remote-mcp/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/geromendez199/vento-remote-mcp/discussions)

## Contribuyendo

¡Las contribuciones son bienvenidas! Por favor:

1. Haz un fork del repositorio
2. Crea una rama de característica: `git checkout -b feature/tu-caracteristica`
3. Realiza cambios con tests
4. Ejecuta: `npm run lint && npm test && npm run type-check`
5. Envía un pull request

## Licencia

Licencia MIT - Ver [LICENSE](LICENSE) para detalles

### Créditos

Construido con ❤️ para la comunidad [Vento](https://github.com/protofy-xyz/protofy) por [Gero Méndez](https://github.com/geromendez199)

Agradecimientos especiales a:
- [Anthropic](https://www.anthropic.com/) por Claude y el Model Context Protocol
- [Protofy](https://github.com/protofy-xyz) por Vento

---

**¿Quieres contribuir, reportar un bug o sugerir una característica?** ¡Abre un issue o discusión en [GitHub](https://github.com/geromendez199/vento-remote-mcp)!
