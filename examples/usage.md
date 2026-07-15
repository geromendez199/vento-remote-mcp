# Usage Examples

## Claude.ai Examples

### List Your Boards
**Prompt**: "List my Vento boards"

**Claude Response**:
```
Found 3 board(s):

- **Home Automation** (ID: board-1)
  Control and monitor my home devices
- **Greenhouse** (ID: board-2)
  Temperature and irrigation system
- **Workshop Tools** (ID: board-3)
  Power tools and equipment monitoring
```

### Check Sensor Values
**Prompt**: "What's the current temperature in my greenhouse?"

**Claude Response**:
```
Getting the greenhouse board state...

# Board: Greenhouse

## Sensor Values (2)
- **Temperature Sensor** (ID: temp-1): 23.5°C (updated: 2024-01-15T10:05:00Z)
- **Humidity Sensor** (ID: hum-1): 65% (updated: 2024-01-15T10:05:00Z)

## Available Actions (2)
- **Activate Irrigation** (ID: act-1)
- **Activate Cooling Fan** (ID: act-2)
```

### Execute Actions
**Prompt**: "Turn on the irrigation system in my greenhouse because humidity is low"

**Claude Response**:
```
I'll activate the irrigation system for you since the humidity is at 65%, which is lower than optimal for most plants.

✅ Action "Activate Irrigation" executed successfully
Result: Pump activated for 5 minutes
```

### Monitor Connected Devices
**Prompt**: "Show me all my connected devices"

**Claude Response**:
```
Found 4 device(s) in Vento network:

## Online (3)
- **ESP32 Bedroom** (esp32)
  ID: device-1
  Last seen: 2024-01-15T10:04:50Z
- **Kitchen Phone** (android)
  ID: device-2
  Last seen: 2024-01-15T10:05:00Z
- **Raspberry Pi Garage** (raspberry)
  ID: device-3
  Last seen: 2024-01-15T10:04:45Z

## Offline (1)
- **Workshop Node** (esp32)
  ID: device-4
  Last seen: 2024-01-15T09:30:00Z
```

### Use Vento Agents
**Prompt**: "Ask my automation agent to optimize energy usage"

**Claude Response**:
```
Sending to agent: "Optimize energy usage based on current device states"

**Agent Response:**
I've analyzed your current energy usage. The cooling system is using 40% of your power. 
I recommend:
1. Adjusting the thermostat to 24°C (currently 22°C)
2. Closing blinds to reduce solar gain
3. Scheduling heavy appliances for off-peak hours

**Actions Executed:** (2)
- adjust_thermostat (params: target_temp=24)
- schedule_appliances (params: mode=off_peak)
```

## Command Line Examples

### Using with Claude Code
```bash
# Add to your Claude Code
claude mcp add --transport http vento https://your-connector-url.com \
  --header "Authorization: Bearer YOUR_MCP_AUTH_TOKEN"
```

### Using MCP Inspector (Development)
```bash
# Start the MCP inspector
npx @modelcontextprotocol/inspector npx tsx src/index.ts

# Test tools in the UI
# - Run vento_list_boards
# - Execute vento_run_action
# - Monitor responses in real-time
```

## OAuth Authorization Flow

### Step 1: Initiate Authorization
```bash
# User clicks link or visits:
https://your-connector.railway.app/auth/vento/authorize

# Redirects to Vento login page
```

### Step 2: Grant Permissions
- User logs into their Vento instance
- Reviews requested scopes: `read:boards`, `write:actions`
- Clicks "Authorize"

### Step 3: Receive Session Token
```bash
# Redirected back to:
https://your-connector.railway.app/auth/vento/callback?code=AUTH_CODE&state=STATE

# Receives JSON response:
{
  "success": true,
  "sessionId": "abc123def456...",
  "instructions": {
    "platform": "Claude",
    "type": "HTTP MCP Server",
    "url": "https://your-connector.railway.app",
    "auth": {
      "type": "Bearer Token",
      "token": "abc123def456..."
    }
  }
}
```

### Step 4: Configure Claude with OAuth Token
Add to Claude settings using the `sessionId` instead of `MCP_AUTH_TOKEN`:
- **URL**: `https://your-connector.railway.app`
- **Auth Token**: Session ID from step 3

## Integration Examples

### With Cursor IDE
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "vento": {
      "url": "https://your-connector.com",
      "auth": {
        "type": "bearer",
        "token": "YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

**Usage in Cursor**:
```
// User: "Add a sensor reading for temperature"
// Cursor: Reads from vento_get_board to understand schema
// Cursor: Suggests code that uses the device data
```

### Webhook/Automation Trigger
**Scenario**: When board value changes, notify Claude

```bash
# Your Vento webhook sends:
POST https://your-connector.com/notify
{
  "board": "board-1",
  "card": "temp-1",
  "value": 28.5,
  "timestamp": "2024-01-15T10:05:30Z"
}

# Claude receives notification and:
# 1. Recognizes temperature is high
# 2. Suggests running cooling action
# 3. Offers to check device status
```

## Advanced Use Cases

### Smart Home Decision Chain
```
User: "The weather forecast shows rain, adjust my garden"
↓
Claude: "I'll help you prepare. Let me check your garden board..."
↓
Claude reads: Soil moisture is 40%, rain is coming
↓
Claude suggests: Turn off irrigation to save water
↓
Claude executes: Disables irrigation pump
↓
Claude reports: "Garden is ready for rain. Irrigation disabled. 
                Expected to restore 100+ liters of water."
```

### Industrial Monitoring
```
User: "Monitor equipment and alert if any sensor exceeds threshold"
↓
Claude: Reads all device values
↓
Claude checks: Pump vibration is 2.5g (normal < 3.0g)
↓
Claude monitors: Sets up continuous polling
↓
Claude alerts: If any value exceeds threshold, immediately notify user
```

### Agricultural Automation
```
User: "Optimize irrigation based on weather and soil"
↓
Claude: Sends data to Vento agent
↓
Vento Agent: 
  - Checks soil moisture: 35%
  - Checks weather: No rain for 5 days
  - Forecast: High temp (32°C)
  - Decision: Run irrigation for 20 minutes
↓
Claude reports: "Irrigation optimized. Next check in 6 hours."
```

## Troubleshooting Examples

### Connection Issues
**Problem**: "Claude says connector not responding"

**Debug Steps**:
```bash
# 1. Check connector is running
curl https://your-connector.com/health

# 2. Test MCP endpoint
curl -X POST https://your-connector.com/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# 3. Check logs
docker compose logs connector
# or
journalctl -u vento-remote-mcp -f
```

### Authentication Failures
**Problem**: "401 Invalid auth token"

**Solution**:
```bash
# Verify token is set
echo $MCP_AUTH_TOKEN

# Verify token length (min 32 chars)
echo $MCP_AUTH_TOKEN | wc -c

# Regenerate if needed
openssl rand -hex 32
# Update in Claude settings
```

### Vento Connection Issues
**Problem**: "Failed to connect to Vento API"

**Debug Steps**:
```bash
# Check Vento is running
curl -H "Authorization: Bearer $VENTO_TOKEN" \
  https://your-vento.com/api/boards/v1

# Check connector env vars
env | grep VENTO_

# Verify token has permission
curl -H "Authorization: Bearer $VENTO_TOKEN" \
  https://your-vento.com/api/health
```

## Best Practices

### Security
- ✅ Rotate `MCP_AUTH_TOKEN` monthly
- ✅ Use separate tokens for dev/prod
- ✅ Monitor logs for failed auth attempts
- ✅ Restrict Vento API token to read-only if possible

### Performance
- ✅ Use `vento_get_card_value` for single sensor reads
- ✅ Cache board state when polling multiple cards
- ✅ Batch actions into single calls when possible
- ✅ Enable rate limiting for high-traffic use

### Reliability
- ✅ Set up health checks (e.g., `curl /health`)
- ✅ Configure restart policies (systemd, Docker)
- ✅ Log all action executions
- ✅ Set up monitoring alerts

## More Examples

See the full documentation:
- [README.md](../README.md) - Main guide
- [docs/vento-api.md](../docs/vento-api.md) - API reference
- [docs/deploy.md](../docs/deploy.md) - Deployment guides
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guide
