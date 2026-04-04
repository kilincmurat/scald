# SCALD Architecture Overview

## System Design

SCALD is a **monorepo** (Turborepo) containing three main applications and shared packages.

```
┌─────────────────────────────────────────────────────────────┐
│                        SCALD Ecosystem                       │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Next.js 15  │    │  FastAPI     │    │  AI Service  │  │
│  │  (Web App)   │◄──►│  (REST API)  │◄──►│  (LangChain) │  │
│  │  :3000       │    │  :8000       │    │  :8001       │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │           │
│         └───────────────────┼────────────────────┘           │
│                             ▼                               │
│         ┌───────────────────────────────────────┐           │
│         │           Data Layer                  │           │
│         │  PostgreSQL+PostGIS │ Redis │ MinIO    │           │
│         └───────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Multilingual Architecture (5 Languages)
- **Frontend**: `next-intl` with `[locale]` route segment
- **Backend**: `Babel` for server-side translations, locale passed via `Accept-Language` header
- **AI Service**: Locale-specific system prompts per language

### Accessibility (WCAG 2.1 AA)
- Radix UI primitives (keyboard navigable, ARIA-compliant)
- `SkipToMain` component for 2.4.1 Bypass Blocks
- Color contrast ratios enforced via Tailwind config
- Automated a11y testing via `axe-playwright` in CI

### Data Flow
```
External Data Sources
        │
        ▼
  Airflow DAGs (ETL)
        │
        ▼
  PostgreSQL + PostGIS
        │
    ┌───┴───┐
    │       │
  FastAPI  pgvector
    │       │
    │    AI Service (RAG)
    │       │
    └───┬───┘
        │
    Next.js
```

## Apps

| App | Port | Purpose |
|-----|------|---------|
| `apps/web` | 3000 | Next.js frontend |
| `apps/api` | 8000 | FastAPI REST backend |
| `apps/ai-service` | 8001 | LangChain AI service |

## Packages

| Package | Purpose |
|---------|---------|
| `packages/ui` | Shared React components |
| `packages/shared-types` | TypeScript types shared between frontend and API client |
| `packages/config` | ESLint, TypeScript, Tailwind configs |
| `packages/data-pipeline` | Airflow DAGs and ETL utilities |
