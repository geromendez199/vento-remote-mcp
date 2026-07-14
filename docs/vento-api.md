# Vento Core API Documentation

This document describes the REST API endpoints exposed by Vento's Core API (Express server), discovered during the investigation phase of the Vento Remote MCP Connector.

**Important:** This documentation is based on:
- Official Vento README and documentation
- Investigation of the Vento codebase
- Endpoint patterns described in the MCP integration section

If an endpoint described here does not exist in your Vento instance, please report it so this documentation can be updated.

## Base URL

```
http://localhost:8000  (default for local development)
https://your-instance.cloud.vento.build  (for cloud deployments)
```

## Authentication

All endpoints require bearer token authentication:

```
Authorization: Bearer YOUR_VENTO_API_TOKEN
Content-Type: application/json
```

## Endpoints

### Boards

#### List Boards
List all boards available in the Vento instance.

```
GET /api/boards/v1
```

**Response:**
```json
[
  {
    "id": "board-1",
    "name": "Home Automation",
    "description": "Main home control board",
    "cards": [],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

#### Get Board
Retrieve complete board state including all cards and their current values.

```
GET /api/boards/v1/{boardId}
```

**Response:**
```json
{
  "id": "board-1",
  "name": "Home Automation",
  "description": "Main home control board",
  "cards": [
    {
      "id": "card-1",
      "name": "Temperature Sensor",
      "type": "value",
      "boardId": "board-1",
      "value": 22.5,
      "unit": "°C",
      "lastUpdated": "2024-01-15T10:05:00Z"
    },
    {
      "id": "card-2",
      "name": "Turn On Pump",
      "type": "action",
      "boardId": "board-1",
      "params": {
        "duration": {
          "type": "number",
          "description": "Duration in seconds"
        }
      }
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### Get Card Value
Retrieve the current value of a specific value card.

```
GET /api/boards/v1/{boardId}/cards/{cardId}
```

**Response:**
```json
{
  "id": "card-1",
  "name": "Temperature Sensor",
  "type": "value",
  "boardId": "board-1",
  "value": 22.5,
  "unit": "°C",
  "lastUpdated": "2024-01-15T10:05:00Z"
}
```

#### Run Action
Execute an action card with optional parameters.

```
POST /api/boards/v1/{boardId}/actions/{cardId}
Content-Type: application/json

{
  "params": {
    "duration": 300
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "executedAt": "2024-01-15T10:05:30Z"
  }
}
```

### Devices

#### List Devices
List all connected devices in the Vento network (ESP32, Android, Go agents, etc.).

```
GET /api/devices/v1
```

**Response:**
```json
[
  {
    "id": "device-esp32-1",
    "name": "Living Room Sensor",
    "type": "esp32",
    "status": "online",
    "lastSeen": "2024-01-15T10:05:00Z"
  },
  {
    "id": "device-android-1",
    "name": "Kitchen Phone",
    "type": "android",
    "status": "online",
    "lastSeen": "2024-01-15T10:04:50Z"
  }
]
```

### Agents

#### List Agents
List all AI agents in the Vento instance.

```
GET /api/agents/v1
```

**Response:**
```json
[
  {
    "id": "agent-1",
    "name": "home_automation_agent",
    "description": "Main automation agent for home control",
    "enabled": true,
    "boardId": "board-1",
    "status": "idle"
  }
]
```

#### Send Message to Agent
Send a message to an AI agent. The agent processes the message using its LLM and may execute actions.

```
POST /api/agents/v1/{agentName}/agent_input
Content-Type: application/json

{
  "message": "Turn on the lights and check temperature"
}
```

**Response:**
```json
{
  "response": "I'm turning on the lights and checking the temperature sensor.",
  "actions": [
    {
      "name": "turn_on_lights",
      "params": {}
    },
    {
      "name": "read_temperature",
      "params": {}
    }
  ]
}
```

## MCP Tool to API Mapping

| MCP Tool | HTTP Method | Endpoint |
|----------|------------|----------|
| `vento_list_boards` | GET | `/api/boards/v1` |
| `vento_get_board` | GET | `/api/boards/v1/{boardId}` |
| `vento_get_card_value` | GET | `/api/boards/v1/{boardId}/cards/{cardId}` |
| `vento_run_action` | POST | `/api/boards/v1/{boardId}/actions/{cardId}` |
| `vento_list_devices` | GET | `/api/devices/v1` |
| `vento_send_to_agent` | POST | `/api/agents/v1/{agentName}/agent_input` |

## Error Handling

All endpoints may return error responses with standard HTTP status codes:

```json
{
  "message": "Board not found",
  "code": "BOARD_NOT_FOUND",
  "details": {}
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error |

## Rate Limiting

Information about rate limiting (if implemented) will be added here.

## Known Limitations

As of the investigation phase:
- The MCP server exposes 6 core tools for reading boards, cards, devices and agents
- Additional APIs may exist in Vento that are not yet documented here
- Some endpoints may require specific board or agent context not yet discovered

## Updates to Documentation

If you discover endpoints or capabilities not listed here:
1. Create an issue or pull request in the vento-remote-mcp repository
2. Include the HTTP method, endpoint path, request/response examples
3. Help us keep this documentation accurate and complete
