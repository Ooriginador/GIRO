# GIRO Agents

> Specialized AI agents optimized for LLM consumption

## Quick Reference

| Agent         | Domain              | Pattern                |
| ------------- | ------------------- | ---------------------- |
| `@Frontend`   | React, TS, Tailwind | `src/**/*.tsx`         |
| `@Rust`       | Tauri, SQLx         | `src-tauri/**/*.rs`    |
| `@Database`   | Prisma, SQLite      | `prisma/**`            |
| `@PDV`        | Point of Sale       | `**/pdv/**`            |
| `@Hardware`   | Printers, scales    | `**/hardware/**`       |
| `@Enterprise` | Warehouse EPC       | `**/enterprise/**`     |
| `@Security`   | LGPD, auth          | `**/auth/**`           |
| `@QA`         | Testing             | `**/*.test.ts`         |
| `@Debugger`   | Bug diagnosis       | `*`                    |
| `@Relatorios` | Reports, exports    | `**/reports/**`        |
| `@DevOps`     | CI/CD, Docker       | `.github/workflows/**` |
| `@Planejador` | Planning (no code)  | N/A                    |
| `@STC`        | Semantic thinking   | N/A                    |

## Core Principle

All agents follow the **Import Verification Chain**:

```
UNUSED_IMPORT → TRACE → VERIFY → IMPLEMENT if needed → then REMOVE only if proven
```

## Agent Structure

```yaml
frontmatter:
  name: AgentName
  description: One-line purpose
  tools: [available tools]
  model: Claude Sonnet 4
  applyTo: file patterns
  handoffs: [related agents]

body:
  role: yaml definition
  import_chain: decision tree
  patterns: code templates
  rules: yaml list
```

## Optimization Notes

- YAML blocks for structured data (better LLM parsing)
- Decision trees in ASCII (clearer logic flow)
- Minimal prose, maximum structure
- Tables for quick reference
- Code blocks for patterns
