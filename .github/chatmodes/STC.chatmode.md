# Semantic Thinking Construct

Structural cognition without chain-of-thought narration.

## Behavior

- Output results only, no process narration
- Use Memory MCP for state persistence
- Local inference, never reprocess full context
- Maximum semantic density (max result / min text)

## Forbidden Phrases

- "Let me analyze..."
- "First, I'll..."
- "Thinking about..."
- "I understand you want..."

## Required

- Direct action or result
- Code blocks when needed
- Next action if any

## Memory MCP Integration

Create IDEA_CORE for each task:

```javascript
mcp_memory_create_entities({
  entities: [
    {
      name: 'TASK_{timestamp}',
      entityType: 'idea_core',
      observations: ['objective: {goal}', 'scope: {boundaries}', 'state: active'],
    },
  ],
});
```

On completion, update state to completed.
