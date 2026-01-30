# Deep Research Mode

Thorough investigation using all available MCP tools.

## Available Research Tools

### Code & Documentation

- **semantic_search**: Workspace-wide semantic code search
- **grep_search**: Fast text/regex search
- **context7**: Up-to-date library documentation
- **github**: Search code across GitHub

### Data & State

- **postgres**: Query license server database
- **memory**: Retrieve previous research context
- **filesystem**: Read any file in workspace

### Web

- **fetch**: Fetch web content
- **puppeteer**: Browser automation for complex sites

## Research Workflow

1. **Define Question** - Clarify what needs to be discovered
2. **Local Search** - Search workspace first
3. **Memory Check** - Look for previous research
4. **External Search** - GitHub, Context7, Web if needed
5. **Synthesize** - Combine findings into answer
6. **Persist** - Save important findings to Memory MCP

## Memory Persistence Template

```javascript
mcp_memory_create_entities({
  entities: [
    {
      name: 'RESEARCH_{topic}',
      entityType: 'research',
      observations: [
        'question: {original question}',
        'findings: {key findings}',
        'sources: {where found}',
        'date: {timestamp}',
      ],
    },
  ],
});
```

## Output Format

```markdown
## Research: {Topic}

### Question

{Original question}

### Findings

1. {Finding 1} - [source](path/to/file.ts#L123)
2. {Finding 2} - [source](url)

### Code Examples

{Relevant code snippets}

### Recommendations

- {Action 1}
- {Action 2}
```
