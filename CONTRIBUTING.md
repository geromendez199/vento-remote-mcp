# Contributing to Vento Remote MCP

Thank you for interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building an inclusive community.

## Getting Started

### Prerequisites

- Node.js 20+
- Git
- A Vento instance for testing

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit with your Vento connection details
nano .env

# Start development server with file watching
npm run dev
```

### Project Structure

```
src/
├── index.ts           # Server bootstrap and HTTP/Stdio setup
├── server.ts          # MCP tool registration and request handling
├── config.ts          # Environment validation
├── auth.ts            # Authentication middleware
├── vento/
│   ├── client.ts      # Vento API HTTP client
│   └── types.ts       # TypeScript types
└── tools/             # Individual tool implementations
    ├── listBoards.ts
    ├── getBoard.ts
    ├── getCardValue.ts
    ├── listDevices.ts
    ├── runAction.ts
    └── sendToAgent.ts

test/                  # Unit and integration tests
docs/                  # Documentation
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/xyz` for new features
- `fix/xyz` for bug fixes
- `docs/xyz` for documentation
- `refactor/xyz` for refactoring

### 2. Make Changes

- Write code following the existing style
- Add tests for new functionality
- Update documentation if needed
- Keep commits small and focused

### 3. Run Quality Checks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint -- --fix

# Tests
npm test

# Full build
npm run build
```

All checks must pass before submitting a PR.

### 4. Commit

```bash
git add .
git commit -m "feat: descriptive message"
```

Use conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting
- `refactor:` for code reorganization
- `test:` for tests
- `chore:` for build/dependency changes

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub with:
- Clear title describing the change
- Description of what and why
- Link to any related issues
- Steps to test if applicable

## Code Style

### TypeScript

- Use strict mode (`strict: true`)
- No `any` types unless absolutely necessary
- Prefer explicit return types for functions
- Use named exports
- Prefer `const` over `let`, never use `var`

### Naming

- Files: `camelCase.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (if truly constant)

### Comments

- Only comment the "why", not the "what"
- Use single-line `//` comments
- Keep comments short and focused

### Example

```typescript
// Good: explains the intent
const now = Date.now();

// Bad: states the obvious
const currentTimestamp = Date.now(); // Get current time
```

## Adding a New Tool

To add a new MCP tool:

### 1. Create Tool Handler

Create `src/tools/myTool.ts`:

```typescript
import { Tool, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { VentoClient } from "../vento/client.js";
import { Logger } from "pino";

export function createMyToolTool(
  _ventoClient: VentoClient,
  _logger: Logger
): Tool {
  return {
    name: "vento_my_tool",
    description: "What this tool does for the LLM",
    inputSchema: {
      type: "object" as const,
      properties: {
        param1: {
          type: "string",
          description: "What param1 is for",
        },
      },
      required: ["param1"],
    },
  };
}

export async function handleMyTool(
  param1: string,
  ventoClient: VentoClient,
  logger: Logger
): Promise<TextContent> {
  try {
    // Implement tool logic
    return {
      type: "text",
      text: "Result",
    };
  } catch (error) {
    logger.error({ error }, "Tool failed");
    return {
      type: "text",
      text: `Error: ${error}`,
    };
  }
}
```

### 2. Register Tool in Server

Add to `src/server.ts`:

```typescript
case "vento_my_tool": {
  const args = toolArgs as Record<string, unknown>;
  return await handleMyTool(
    args.param1 as string,
    ventoClient,
    logger
  );
}
```

### 3. Add Tests

Create `test/myTool.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { handleMyTool } from "../src/tools/myTool.js";

describe("myTool", () => {
  it("should do something", async () => {
    // Test implementation
  });
});
```

### 4. Update Documentation

Add to `README.md` tools table and `docs/vento-api.md` API reference.

## Testing

### Unit Tests

Test individual functions with mocked dependencies:

```bash
npm test
```

### Running Specific Tests

```bash
npm test -- --grep "function name"
```

### Coverage Report

```bash
npm test -- --coverage
```

### Integration Tests

For integration with a real Vento instance:

```bash
# Start local stack
docker compose up

# In another terminal, test
npm run test:integration
```

## Documentation

### README

- Keep updated with new features
- Update both English (README.md) and Spanish (README.es.md)
- Include examples and usage

### API Reference

Update `docs/vento-api.md` when:
- Adding new endpoints
- Changing request/response formats
- Adding new tools

### Comments

- Explain complex logic
- Link to related issues or PRs
- Include examples for non-obvious functionality

## Reporting Issues

When reporting bugs, include:

1. **Environment**:
   - Node version
   - Vento version
   - Deployment method (Docker, VPS, etc.)

2. **Reproduction Steps**:
   - Exact steps to reproduce
   - Code or config if applicable

3. **Expected vs Actual**:
   - What should happen
   - What actually happens

4. **Logs**:
   - Error messages
   - Full stack trace

5. **Workaround** (if applicable):
   - Any temporary workaround found

## Feature Requests

When suggesting features:

1. **Description**: What and why
2. **Use Case**: Real problem it solves
3. **Examples**: Pseudo-code or screenshots
4. **Alternatives**: Other approaches considered

## Pull Request Process

1. **Before submitting**: Ensure all checks pass
2. **Title**: Use conventional commit format
3. **Description**: Explain the change clearly
4. **Reviewers**: Maintainers will review
5. **Feedback**: Respond to comments and suggestions
6. **Merge**: Maintainer will merge once approved

## Release Process

Maintainers handle releases using semantic versioning:

- Patch (0.0.x): Bug fixes
- Minor (0.x.0): Features (backward compatible)
- Major (x.0.0): Breaking changes

Changes are merged to `main` and tagged.

## Questions or Need Help?

- **Discussions**: Use [GitHub Discussions](https://github.com/geromendez199/vento-remote-mcp/discussions)
- **Discord**: Ask in [Vento Discord](https://discord.gg/VpeZxMFfYW)
- **Issues**: Open an issue if something doesn't work

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Maintainers

- [Gero Méndez](https://github.com/geromendez199) - Creator and maintainer

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md (when created)
- Release notes for their contributions
- GitHub's automatic contributor list

Thank you for contributing! 🙏
