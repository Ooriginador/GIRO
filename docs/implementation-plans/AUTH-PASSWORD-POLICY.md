# 🔐 Política de Senhas - GIRO Desktop

> **Versão**: 1.0.0  
> **Atualizado**: 30 de Janeiro de 2026  
> **Aplicável a**: Funcionários com perfil ADMIN e MANAGER

---

## 📋 Requisitos de Senha

### Complexidade

```yaml
tamanho_minimo: 8 caracteres
tamanho_maximo: 128 caracteres
caracteres_obrigatorios:
  - minusculas: true (a-z)
  - maiusculas: true (A-Z)
  - numeros: true (0-9)
  - especiais: true (!@#$%^&*()_+-=[]{}|;:,.<>?)
```

### Validações

- ❌ **Proibido**: Sequências comuns (123456, abcdef, qwerty)
- ❌ **Proibido**: Repetições excessivas (aaaaaa, 111111)
- ❌ **Proibido**: Dados pessoais (nome, CPF, telefone)
- ❌ **Proibido**: Palavras do dicionário português/inglês
- ✅ **Recomendado**: Frases longas (passphrases)

### Força Mínima

```
Pontuação: 0-4
Mínimo Aceitável: 3 (FORTE)

0 = MUITO FRACA (não aceita)
1 = FRACA (não aceita)
2 = MÉDIA (não aceita)
3 = FORTE (aceita)
4 = MUITO FORTE (aceita)
```

---

## ⏰ Expiração e Rotação

```yaml
validade_senha: 90 dias
aviso_expiracao: 7 dias antes
graca_pos_expiracao: 3 dias
forca_troca_primeiro_login: true
```

**Fluxo**:

1. Senha criada → `password_changed_at = NOW()`
2. Após 83 dias → Aviso de expiração próxima
3. Após 90 dias → Senha expirada, força troca no próximo login
4. Até 93 dias → Período de graça (pode trocar)
5. Após 93 dias → Conta bloqueada até admin resetar

---

## 🔒 Tentativas e Bloqueio

```yaml
tentativas_maximas: 5
duracao_bloqueio: 15 minutos
reset_tentativas_apos_sucesso: true
notificacao_admin_bloqueio: true
```

**Comportamento**:

- Tentativa 1-4: Registra falha, permite nova tentativa
- Tentativa 5: Bloqueia conta por 15 minutos
- Admin pode desbloquear manualmente
- Após bloqueio expirar, contador zera

---

## 🔄 Recuperação de Senha

```yaml
metodo: Email com token único
validade_token: 1 hora
tentativas_token: 3 (token inválido 3x = bloqueio)
rate_limit: 3 solicitações por hora
```

**Processo**:

1. Usuário solicita reset via email
2. Sistema gera token UUID v4
3. Email enviado com link: `giro://reset-password?token=XXX`
4. Token válido por 1 hora
5. Após uso, token é invalidado
6. Nova senha deve atender política

---

## 🛡️ Armazenamento

```yaml
algoritmo: Argon2id
parametros:
  memory: 19456 KB (19 MiB)
  iterations: 2
  parallelism: 1
  salt_length: 16 bytes
  hash_length: 32 bytes
```

**Formato no DB**:

```
$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
```

**Benchmark**:

- Hash: ~80-100ms (aceitável para UX)
- Verify: ~80-100ms
- Resistente a GPU/ASIC attacks

---

## 📊 Configurações Padrão (Tabela `settings`)

```sql
INSERT INTO settings (key, value, category, description) VALUES
  -- Complexidade
  ('auth.password_min_length', '8', 'security', 'Tamanho mínimo da senha'),
  ('auth.password_max_length', '128', 'security', 'Tamanho máximo da senha'),
  ('auth.password_require_uppercase', 'true', 'security', 'Exigir maiúsculas'),
  ('auth.password_require_lowercase', 'true', 'security', 'Exigir minúsculas'),
  ('auth.password_require_numbers', 'true', 'security', 'Exigir números'),
  ('auth.password_require_special', 'true', 'security', 'Exigir caracteres especiais'),
  ('auth.password_min_strength', '3', 'security', 'Força mínima (0-4)'),

  -- Expiração
  ('auth.password_expiry_days', '90', 'security', 'Validade da senha em dias'),
  ('auth.password_expiry_warning_days', '7', 'security', 'Avisar X dias antes de expirar'),
  ('auth.password_grace_period_days', '3', 'security', 'Período de graça pós-expiração'),
  ('auth.force_password_change_first_login', 'true', 'security', 'Forçar troca no primeiro login'),

  -- Lockout
  ('auth.max_failed_attempts', '5', 'security', 'Tentativas máximas antes de bloqueio'),
  ('auth.lockout_duration_minutes', '15', 'security', 'Duração do bloqueio em minutos'),

  -- Recovery
  ('auth.reset_token_expiry_hours', '1', 'security', 'Validade do token de reset'),
  ('auth.max_reset_attempts_per_hour', '3', 'security', 'Limite de solicitações por hora'),

  -- Geral
  ('auth.allow_password_recovery', 'true', 'security', 'Permitir recuperação por email'),
  ('auth.session_timeout_minutes', '480', 'security', 'Timeout de sessão (8h)');
```

---

## 🎯 Regras de Negócio

### Por Perfil

| Perfil  | Autenticação      | Expiração Senha | Reset Email | Lockout            |
| ------- | ----------------- | --------------- | ----------- | ------------------ |
| ADMIN   | Username+Senha    | 90 dias         | Sim         | Sim                |
| MANAGER | Username+Senha    | 90 dias         | Sim         | Sim                |
| CASHIER | PIN (4-6 dígitos) | Não             | Não         | Sim (3 tentativas) |
| STOCKER | PIN (4-6 dígitos) | Não             | Não         | Sim (3 tentativas) |

### Exceções

- **Conta Owner/Root**: Nunca expira automaticamente
- **Primeira configuração**: Senha temporária força troca
- **Reset por Admin**: Gera senha temporária + flag de troca obrigatória

---

## 📝 Checklist de Implementação

- [ ] Tabela `employees` com novos campos
- [ ] Trigger de validação de email para ADMIN/MANAGER
- [ ] Índices em `username`, `email`, `password_reset_token`
- [ ] Função Rust `hash_password()` com Argon2id
- [ ] Função Rust `verify_password()`
- [ ] Função Rust `validate_password_policy()`
- [ ] Comando Tauri `change_password`
- [ ] Comando Tauri `request_password_reset`
- [ ] Comando Tauri `reset_password_with_token`
- [ ] UI: Indicador de força de senha
- [ ] UI: Mensagem de conta bloqueada
- [ ] UI: Fluxo de recuperação de senha
- [ ] Testes unitários de validação
- [ ] Testes E2E de fluxo completo

---

## 🔍 Auditoria

Todos os eventos relacionados a senha devem ser registrados em `audit_logs`:

```rust
pub enum AuditAction {
    PasswordChanged,
    PasswordResetRequested,
    PasswordResetCompleted,
    PasswordExpired,
    FailedLoginAttempt,
    AccountLocked,
    AccountUnlocked,
}
```

---

## 📚 Referências

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Argon2 RFC 9106](https://datatracker.ietf.org/doc/html/rfc9106)
- [LGPD Art. 46 - Segurança](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
