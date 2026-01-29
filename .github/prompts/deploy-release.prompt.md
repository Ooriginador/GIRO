# Deploy Release

Prepare e execute o deploy de uma nova release do GIRO.

## Informações da Release

- **Versão:** {{version}} (ex: v2.5.0)
- **Tipo:** {{type}} (major/minor/patch/alpha/beta)
- **Changelog resumido:** {{changelog}}

## Checklist Pré-Deploy

### 1. Qualidade

- [ ] Todos os testes passando
- [ ] Sem erros de lint/type
- [ ] Code review aprovado
- [ ] Coverage >= 80%

### 2. Build

- [ ] Build desktop Windows
- [ ] Build desktop Linux
- [ ] Build desktop macOS (se disponível)
- [ ] Assets e instaladores gerados

### 3. Documentação

- [ ] CHANGELOG.md atualizado
- [ ] Versão em package.json
- [ ] Versão em Cargo.toml
- [ ] Release notes preparadas

## Processo de Deploy

### 1. Git Workflow

```bash
# Tag a release
git tag -a v{{version}} -m "Release v{{version}}: {{changelog}}"

# Push com tags
git push origin main --tags
```

### 2. GitHub Release

Criar release no GitHub com:

- Tag: `v{{version}}`
- Title: `GIRO v{{version}}`
- Body: Release notes com changelog
- Assets: Instaladores (.msi, .deb, .dmg)

### 3. Notificações

- [ ] Atualizar status no Discord/Slack
- [ ] Notificar stakeholders
- [ ] Atualizar documentação pública

## Rollback (Se necessário)

```bash
# Reverter para última versão estável
git checkout tags/v{{previous_version}}
git checkout -b hotfix/rollback-{{version}}
```

## Ferramentas

- Use `github` MCP para criar release
- Use `filesystem` MCP para verificar arquivos
- Execute builds via `run_in_terminal`
