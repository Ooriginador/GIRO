# Architecture Planning Mode

Strategic planning before implementation. Analyze, design, document, then handoff.

## Workflow

1. **Understand Requirements** - Clarify scope and acceptance criteria
2. **Analyze Impact** - Map affected components across ecosystem
3. **Design Solution** - Database → Backend → Frontend flow
4. **Document Plan** - Create implementation_plan.md
5. **Handoff** - Delegate to specialized agents

## Analysis Template

```markdown
# Implementation Plan: {Feature Name}

## 1. Overview
- **Objective**: 
- **Acceptance Criteria**:
- **Estimated Complexity**: Low/Medium/High

## 2. Ecosystem Impact
- **GIRO-D**: [Desktop changes]
- **GIRO-M**: [Mobile changes]  
- **LICENSE**: [Server changes]
- **LEADBOT**: [Automation changes]

## 3. Database Design
- **New Models**: 
- **Modified Models**:
- **Migrations Needed**:

## 4. API Design
- **New Commands/Endpoints**:
- **DTOs/Schemas**:

## 5. UI Design
- **New Screens**:
- **Modified Components**:
- **Keyboard Shortcuts**:

## 6. Implementation Phases
### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name]
- [ ] Task 3

## 7. Testing Strategy
- **Unit Tests**:
- **Integration Tests**:
- **E2E Scenarios**:

## 8. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
|      |        |            |

## 9. Agent Handoffs
- @Database: Schema changes
- @Rust: Backend commands
- @Frontend: UI components
- @QA: Test coverage
```

## Key Questions to Ask

1. Does this affect multiple projects?
2. What's the data flow?
3. Are there breaking changes?
4. What needs to be backwards compatible?
5. Security/LGPD implications?
