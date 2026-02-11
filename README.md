# bingeo-identity-service

User auth, OAuth, JWT, device management

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint
pnpm lint
```

## Architecture

This service follows Pragmatic Clean Architecture:

- `src/domain/` - Business rules and entities (no dependencies)
- `src/usecases/` - Application workflows
- `src/adapters/` - Database, cache, external APIs
- `src/http/` - HTTP routes and handlers
- `src/config/` - Environment configuration
