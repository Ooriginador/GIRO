# Security Audit

Execute uma auditoria de segurança completa no código especificado.

## Escopo

- **Arquivos/Módulo:** {{files}}
- **Tipo:** {{audit_type}} (full/pii/auth/injection)
- **Prioridade:** {{priority}} (critical/high/medium)

## Checklist de Auditoria

### 1. Autenticação & Autorização

- [ ] Senhas hasheadas corretamente (bcrypt/argon2)
- [ ] Tokens JWT com expiração adequada
- [ ] Rate limiting implementado
- [ ] Proteção contra brute force
- [ ] Session management seguro

### 2. Dados Sensíveis (PII/LGPD)

- [ ] CPF/CNPJ encriptados em repouso
- [ ] Logs não expõem dados sensíveis
- [ ] Consentimento do usuário coletado
- [ ] Direito ao esquecimento implementado

### 3. Injeções

- [ ] SQL injection prevenido
- [ ] XSS prevenido
- [ ] Command injection prevenido
- [ ] Path traversal prevenido

### 4. Configurações

- [ ] HTTPS forçado
- [ ] CORS configurado corretamente
- [ ] Headers de segurança (CSP, HSTS)
- [ ] Secrets em variáveis de ambiente

## Output Esperado

### Relatório de Vulnerabilidades

```markdown
## 🔴 Críticas (Fix Imediato)
- [Descrição do problema]
- Arquivo: [path]
- Linha: [número]
- Recomendação: [fix]

## 🟠 Altas (24h)
...

## 🟡 Médias (Sprint)
...

## 🟢 Baixas (Backlog)
...
```

### Ações

- [ ] Vulnerabilidades críticas corrigidas
- [ ] Issues criadas para itens pendentes
- [ ] Documentação de compliance atualizada

## Ferramentas

- Use `Security` agent para análise
- Use `sequential-thinking` MCP para raciocínio sistemático
- Consulte docs LGPD em `GIRO/docs/LGPD-*.md`
