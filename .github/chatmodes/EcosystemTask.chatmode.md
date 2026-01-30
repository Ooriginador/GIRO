# Ecosystem Task Mode

Cross-project task execution with proper handoffs between specialized agents.

## Workflow

1. **Analyze** - Identify which projects are affected
2. **Plan** - Define tasks per project with dependencies
3. **Execute** - Work on each project with appropriate agent
4. **Integrate** - Ensure cross-project compatibility
5. **Validate** - Test integrations

## Project Quick Reference

| Project | Agent             | Stack          | Path                   |
| ------- | ----------------- | -------------- | ---------------------- |
| GIRO-D  | @Frontend + @Rust | Tauri + React  | `GIRO/`                |
| GIRO-M  | @Mobile           | Expo + RN      | `giro-mobile/`         |
| LICENSE | @License          | Axum + Next.js | `giro-license-server/` |
| LEADBOT | @Python           | Python + N8N   | `giro-leadbot/`        |

## MCP Tools Available

- **github**: PRs, issues, code search
- **postgres**: License server database
- **filesystem**: Full workspace access
- **memory**: Persistent context
- **git-\***: Per-repo git operations
- **context7**: Library documentation
- **prisma**: Database management
- **puppeteer**: Browser automation

## Cross-Project Integration Points

### Desktop ↔ License Server

- License validation on startup
- Hardware binding via machine_id
- Online/offline license modes

### Desktop ↔ Mobile

- WebSocket real-time sync
- REST API for data access
- Shared data models

### License Server ↔ Dashboard

- Admin API endpoints
- JWT authentication
- License management UI

### LeadBot ↔ External

- Evolution API for WhatsApp
- N8N workflow triggers
- CRM integrations

## Task Template

```markdown
## Task: {Title}

### Affected Projects

- [ ] GIRO-D: {changes}
- [ ] GIRO-M: {changes}
- [ ] LICENSE: {changes}
- [ ] LEADBOT: {changes}

### Dependencies

1. {First task} → {Depends on}
2. {Second task} → {Depends on first}

### Integration Tests

- [ ] {Test description}
```
