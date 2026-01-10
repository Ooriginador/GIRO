# Security Policy

## 🔒 Reporting a Vulnerability

Se você descobrir uma vulnerabilidade de segurança no GIRO, por favor, **NÃO** abra uma issue pública.

### Como Reportar

Envie um email para: **security@arkheion.com** (ou contate diretamente @jhonslife)

Inclua:

- Descrição detalhada da vulnerabilidade
- Passos para reproduzir
- Versão afetada
- Potencial impacto
- Sugestões de correção (se houver)

### O que Esperar

- **Confirmação**: Resposta em até 48 horas
- **Avaliação**: Análise completa em até 7 dias
- **Correção**: Patch em até 30 dias para vulnerabilidades críticas
- **Crédito**: Reconhecimento público (se desejado)

## ✅ Versões Suportadas

| Versão | Suportada          |
| ------ | ------------------ |
| 1.x    | :white_check_mark: |
| < 1.0  | :x:                |

## 🛡️ Medidas de Segurança Implementadas

- [x] Autenticação JWT com refresh tokens
- [x] Senhas hasheadas com bcrypt (custo 12)
- [x] Validação de inputs (Zod)
- [x] Proteção contra SQL Injection (Prisma ORM)
- [x] Proteção contra XSS
- [x] CORS configurado
- [x] Rate limiting
- [x] Logs de auditoria
- [x] Dados sensíveis criptografados

## 📋 Checklist de Segurança

Antes de cada release:

- [ ] Dependências atualizadas
- [ ] Scan de vulnerabilidades (`pnpm audit`)
- [ ] Testes de segurança executados
- [ ] Secrets não commitados
- [ ] Variáveis de ambiente documentadas
- [ ] Logs sensíveis removidos
- [ ] HTTPS obrigatório em produção

## 🔐 Boas Práticas

### Desenvolvedores

1. Nunca commite secrets ou API keys
2. Use variáveis de ambiente
3. Valide todos os inputs
4. Sanitize outputs
5. Use HTTPS sempre
6. Implemente rate limiting
7. Mantenha dependências atualizadas

### Usuários

1. Use senhas fortes
2. Não compartilhe credenciais
3. Faça backups regularmente
4. Mantenha o sistema atualizado
5. Use firewall e antivírus

---

**Obrigado por ajudar a manter o GIRO seguro!** 🙏
