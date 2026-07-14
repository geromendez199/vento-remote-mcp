# Security Policy

## Overview

The Vento Remote MCP Connector controls real physical devices. Security is critical and we take it seriously.

## Reporting Security Vulnerabilities

**Do not** open public GitHub issues for security vulnerabilities.

Instead, please email security concerns to the maintainers or open a private GitHub security advisory.

Details will be handled confidentially and responsibly.

## Security Guidelines

### Authentication

#### MCP Authentication (Claude → Connector)
- Use strong, randomly generated tokens: `openssl rand -hex 32`
- Minimum 32 characters
- Rotate monthly
- Never commit tokens to version control
- Use environment variables only

#### Vento Authentication (Connector → Vento)
- Use API tokens with minimal required permissions
- Prefer read-only tokens when possible
- Rotate regularly (monthly or quarterly)
- Store in `.env` file (never in code)
- Restrict token usage to specific operations

### Transport Security

#### HTTPS/TLS
- Always use HTTPS in production
- Use valid SSL certificates (Let's Encrypt recommended)
- Enable HSTS headers
- Minimum TLS 1.2

#### Local Connections
- Use HTTP for localhost development only
- Require HTTPS for all remote connections
- Verify certificate validity

### Authorization & Access Control

#### Token Management
```bash
# Generate new token
openssl rand -hex 32

# Rotate tokens
# 1. Generate new token
# 2. Update in Claude settings
# 3. Update in connector env vars
# 4. Verify functionality
# 5. Remove old token
```

#### Board Access
- Limit Vento boards accessible to Claude
- Consider dedicated boards for AI automation
- Avoid exposing sensitive production boards initially
- Use separate instances for dev/test/prod

#### Action Permissions
- Review which actions Claude can execute
- Disable non-critical action cards initially
- Test actions thoroughly before production
- Monitor action execution logs

### Environment Security

#### .env File
```bash
# Permissions
chmod 600 .env
ls -la .env  # Should show: -rw------- (600)

# Contents: Never commit this file
# Add to .gitignore (already done)
```

#### Environment Variables
- Use systemd EnvironmentFile for proper permissions
- Use container secrets/env vars for Docker
- Use platform secrets (Railway, Render, Fly)
- Never pass sensitive data in command line

### Logging & Monitoring

#### What We Log
- Connection attempts (auth success/failure)
- Tool invocations (without sensitive data)
- Errors and exceptions (sanitized)
- System events (startup, shutdown)

#### What We Don't Log
- MCP_AUTH_TOKEN
- VENTO_TOKEN
- Vento API responses containing sensitive data
- Action parameters that might be sensitive

#### Log Storage
- Logs stored in journal (systemd)
- Accessible only to root and service user
- Rotated automatically
- Consider log aggregation for production

### Network Security

#### Firewall Rules
```bash
# Only expose necessary ports
# Production: Only 443 (HTTPS)
# Development: Only 3000 on localhost

# Example UFW rules:
ufw allow 443/tcp
ufw allow 22/tcp
ufw deny 3000/tcp  # Or allow only localhost
```

#### Rate Limiting
- Enabled by default
- Prevents brute force attacks
- Configure in `.env`:
  ```env
  RATE_LIMIT_ENABLED=true
  RATE_LIMIT_REQUESTS_PER_MINUTE=60
  ```

#### CORS & Headers
- Security headers configured
- X-Real-IP forwarded correctly
- X-Forwarded-Proto enforced

### Deployment Security

#### Docker Security
```dockerfile
# Run as non-root user
USER nobody

# Use specific Node.js version
FROM node:20-alpine

# Multi-stage build (included)
```

#### Systemd Security
```ini
[Service]
# Hardening options
PrivateTmp=yes
NoNewPrivileges=true
ReadWritePaths=/opt/vento-remote-mcp
```

#### VPS Hardening
- Keep OS updated: `apt update && apt upgrade`
- Use firewall (UFW/iptables)
- Enable SSH key-based auth only
- Disable root login
- Use fail2ban for SSH brute force protection
- Configure automatic security updates

### Vento Integration Security

#### Least Privilege
- Create dedicated Vento API tokens for connector
- Grant only necessary permissions
- Read-only tokens when possible
- Restrict to specific boards if available

#### Data Validation
- All inputs validated with Zod
- API responses validated
- Error messages sanitized
- No data logged unintentionally

#### HTTPS to Vento
```env
# Always use HTTPS for remote Vento
VENTO_API_URL=https://your-vento-instance.com
```

### Known Limitations

1. **Action Execution**: Once authenticated to Claude, all actions are executable
   - Mitigation: Separate boards for high-risk operations
   
2. **Sensor Data Access**: All board values readable to Claude
   - Mitigation: Don't expose sensitive data through boards
   
3. **Agent Communication**: Agents receive messages from Claude
   - Mitigation: Use agent rules to validate/filter commands

### Threat Model

**Attacker Goal**: Execute unauthorized actions on Vento devices

**Attack Vectors**:
1. Steal MCP_AUTH_TOKEN
   - Mitigation: Strong token, HTTPS only, environment-based
   
2. Intercept HTTP traffic
   - Mitigation: HTTPS required, no HTTP in production
   
3. Compromise Vento API token
   - Mitigation: Separate token, minimal permissions
   
4. Social engineering (steal credentials)
   - Mitigation: Limited access from start, audit logging
   
5. Vulnerable dependencies
   - Mitigation: Regular npm audit, dependabot enabled

### Security Checklist

Before production deployment:

- [ ] Generated strong MCP_AUTH_TOKEN (32+ chars)
- [ ] HTTPS enabled on connector URL
- [ ] HTTPS enabled on Vento connection
- [ ] .env file excluded from git
- [ ] File permissions: `chmod 600 .env`
- [ ] Firewall configured (only necessary ports)
- [ ] SSH hardened (key-based auth, no root)
- [ ] fail2ban or similar configured
- [ ] Log monitoring/alerting set up
- [ ] Vento token has minimal permissions
- [ ] Action cards reviewed and tested
- [ ] Separate boards for dev/test/prod
- [ ] Regular token rotation scheduled
- [ ] Backup/disaster recovery plan
- [ ] Incident response plan

### Regular Maintenance

**Monthly**:
- Review access logs for suspicious activity
- Rotate authentication tokens
- Check for npm security updates

**Quarterly**:
- Security audit of deployed instance
- Penetration testing (if applicable)
- Update documentation
- Review access control

**Annually**:
- Full security assessment
- Update dependencies
- Review threat model
- Incident post-mortems (if applicable)

### Incident Response

If you discover a security issue:

1. **Do not** publicly disclose
2. Contact maintainers privately
3. Provide detailed information:
   - Type of vulnerability
   - How to reproduce
   - Impact assessment
   - Suggested fix (if any)
4. Allow time for fix and release
5. Coordinated disclosure once patched

### Security Headers

The connector sets these headers automatically:

```
X-Real-IP: [client IP]
X-Forwarded-For: [client IP]
X-Forwarded-Proto: https
```

Nginx/Reverse Proxy should also set:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

### Dependencies

Security is managed through:
- npm audit
- Dependabot (GitHub)
- Manual review of major updates
- Testing before deployment

### Feedback

Questions about security? Open a private discussion or contact maintainers.

---

**Last Updated**: January 15, 2024  
**Maintained By**: [Gero Méndez](https://github.com/geromendez199)
