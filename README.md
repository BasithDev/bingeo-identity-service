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

## TLS & Database Security

Aiven PostgreSQL uses certificates that Node.js doesn't trust by default. To connect in **development**, set `ALLOW_INSECURE_TLS=true` in your `.env` file. This disables certificate verification for DB connections only (not process-wide).

```bash
# .env (dev only)
ALLOW_INSECURE_TLS=true
```

> **⚠️ Never set `ALLOW_INSECURE_TLS=true` in production.** In production, TLS verification is enabled by default. For proper production setup, load the Aiven CA certificate instead.
