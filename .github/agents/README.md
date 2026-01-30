# ARKHEION ECOSYSTEM AGENTS

> Specialized AI agents for the complete CICLOGIRO ecosystem

## ECOSYSTEM MAP

```
CICLOGIRO/
├── GIRO/              # Desktop PDV (Tauri+Rust+React)
├── giro-mobile/       # Mobile App (React Native+Expo)
├── giro-license-server/
│   ├── backend/       # License API (Rust+Axum)
│   └── dashboard/     # Admin Dashboard (Next.js)
├── giro-leadbot/      # WhatsApp Automation (Python+N8N)
└── giro-releases/     # Release Distribution
```

## PROJECT QUICK REFERENCE

| Project      | ID        | Stack                   | Path                                |
| ------------ | --------- | ----------------------- | ----------------------------------- |
| GIRO Desktop | `GIRO-D`  | Tauri+Rust+React+SQLite | `GIRO/`                             |
| GIRO Mobile  | `GIRO-M`  | RN+Expo+NativeWind      | `giro-mobile/`                      |
| License API  | `LICENSE` | Rust+Axum+PostgreSQL    | `giro-license-server/backend/`      |
| License Dash | `DASH`    | Next.js+TailwindCSS     | `giro-license-server/dashboard/`    |
| LeadBot      | `LEADBOT` | Python+N8N+Evolution    | `giro-leadbot/`                     |
| Website      | `WEB`     | Next.js                 | `giro-license-server/giro-website/` |

## AGENT CATALOG

### Core Agents

| Agent       | Domain              | Projects          | Pattern                       |
| ----------- | ------------------- | ----------------- | ----------------------------- |
| `@Frontend` | React, TS, Tailwind | GIRO-D, DASH, WEB | `**/src/**/*.tsx`             |
| `@Rust`     | Tauri, SQLx, Axum   | GIRO-D, LICENSE   | `**/*.rs`                     |
| `@Database` | Prisma, SQLx, PG    | ALL               | `**/prisma/**,**/*.sql`       |
| `@Python`   | FastAPI, N8N        | LEADBOT           | `**/*.py`                     |
| `@Mobile`   | React Native, Expo  | GIRO-M            | `giro-mobile/**`              |
| `@QA`       | Testing             | ALL               | `**/*.test.*,**/tests/**`     |
| `@DevOps`   | CI/CD, Docker       | ALL               | `**/Dockerfile,**/.github/**` |
| `@Security` | LGPD, auth          | ALL               | `**/auth/**,**/security/**`   |

### Domain Agents

| Agent         | Domain              | Projects       | Pattern                  |
| ------------- | ------------------- | -------------- | ------------------------ |
| `@PDV`        | Point of Sale       | GIRO-D         | `GIRO/**/pdv/**`         |
| `@Hardware`   | Printers, scales    | GIRO-D         | `GIRO/**/hardware/**`    |
| `@Enterprise` | Warehouse EPC       | GIRO-D, GIRO-M | `**/enterprise/**`       |
| `@Relatorios` | Reports, exports    | GIRO-D         | `GIRO/**/reports/**`     |
| `@License`    | License management  | LICENSE, DASH  | `giro-license-server/**` |
| `@LeadBot`    | WhatsApp automation | LEADBOT        | `giro-leadbot/**`        |

### Meta Agents

| Agent         | Domain             | Projects |
| ------------- | ------------------ | -------- |
| `@Debugger`   | Bug diagnosis      | ALL      |
| `@Planejador` | Planning (no code) | ALL      |
| `@STC`        | Semantic thinking  | ALL      |

## CROSS-PROJECT PATTERNS

### Shared Tech Stack

```yaml
common:
  language: TypeScript/Rust
  styling: TailwindCSS
  validation: Zod/Pydantic
  auth: JWT
  db: SQLite (desktop), PostgreSQL (server)

per_project:
  GIRO-D: [Tauri 2.0, SQLx, Zustand, React Router]
  GIRO-M: [Expo 51, NativeWind, Expo Router, AsyncStorage]
  LICENSE: [Axum, SQLx, tokio]
  DASH: [Next.js 14, TanStack Query, shadcn/ui]
  LEADBOT: [Python 3.12, httpx, Evolution API]
```

### Inter-Project Communication

```
GIRO Desktop ─────► License Server (validate license)
      │                    │
      ▼                    ▼
GIRO Mobile ◄────── WebSocket sync
      │
      ▼
  LeadBot ─────────► WhatsApp (lead capture)
```

## CORE PRINCIPLE

All agents follow the **Import Verification Chain**:

```
UNUSED_IMPORT → TRACE → VERIFY → IMPLEMENT if needed → then REMOVE only if proven
```

## AGENT STRUCTURE

```yaml
frontmatter:
  name: AgentName
  description: One-line purpose
  tools: [available tools]
  model: Claude Sonnet 4
  applyTo: file patterns (ecosystem-wide)
  handoffs: [related agents]

body:
  role: yaml definition
  ecosystem_context: project awareness
  import_chain: decision tree
  patterns: code templates
  rules: yaml list
```

## OPTIMIZATION NOTES

- YAML blocks for structured data (better LLM parsing)
- Decision trees in ASCII (clearer logic flow)
- Minimal prose, maximum structure
- Tables for quick reference
- Code blocks for patterns
- Project-aware file patterns
