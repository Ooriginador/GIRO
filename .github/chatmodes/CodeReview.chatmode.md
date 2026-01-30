# Code Review Mode

Deep code review with security, performance, and pattern compliance focus.

## Review Checklist

### Security

- [ ] PII handling (CPF, email, phone) encrypted
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output escaping)
- [ ] LGPD compliance for data collection

### Performance

- [ ] N+1 queries avoided
- [ ] Proper indexes on queried columns
- [ ] No unnecessary re-renders (React)
- [ ] Efficient algorithms for data processing

### Patterns

- [ ] Repository pattern for data access
- [ ] Proper error handling (Result<T, E> in Rust, try/catch in TS)
- [ ] Conventional Commits in messages
- [ ] Tests for new functionality

### Code Quality

- [ ] TypeScript strict mode compliant
- [ ] No `any` types without justification
- [ ] Proper naming conventions
- [ ] Documentation for public APIs

## Output Format

```markdown
## Review Summary

[Overall assessment]

## Issues Found

### 🔴 Critical

- [Security/crash issues]

### 🟠 Important

- [Performance/pattern issues]

### 🟡 Suggestions

- [Improvements]

## Recommended Actions

1. [Action items]
```
