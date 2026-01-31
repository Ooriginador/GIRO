# 🔐 Políticas de Senha - GIRO Desktop

> **Projeto**: GIRO Desktop  
> **Versão**: 3.0.0  
> **Última Atualização**: 30 de Janeiro de 2026

---

## 📋 Políticas Padrão

### Requisitos de Senha

```yaml
tamanho_minimo: 8 caracteres
tamanho_maximo: 128 caracteres
caracteres_obrigatorios:
  - minimo_1_maiuscula: true
  - minimo_1_minuscula: true
  - minimo_1_numero: true
  - minimo_1_especial: true
caracteres_especiais_permitidos: "!@#$%^&*()_+-=[]{}|;:,.<>?"
```

### Validação de Força

```typescript
enum PasswordStrength {
  VERY_WEAK = 0,  // < 8 caracteres ou apenas lowercase
  WEAK = 1,       // 8+ chars, apenas lowercase+uppercase
  MEDIUM = 2,     // 8+ chars, lowercase+uppercase+numbers
  STRONG = 3,     // 8+ chars, lowercase+uppercase+numbers+special
  VERY_STRONG = 4 // 12+ chars, todos os tipos + não está em wordlist
}
```

### Políticas de Expiração

```yaml
expiracao_senha_dias: 90
avisar_expiracao_dias_antes: 7
historico_senhas_bloqueadas: 5  # Não pode reutilizar últimas 5 senhas
```

### Lockout de Conta

```yaml
tentativas_maximas_falha: 5
duracao_bloqueio_minutos: 15
limpar_tentativas_apos_login_sucesso: true
```

### Reset de Senha

```yaml
validade_token_minutos: 60
tamanho_token: 64  # caracteres hexadecimais
permitir_reset_via_email: true
exigir_verificacao_2fa: false  # Para v3.1.0
```

---

## 🔒 Implementação de Segurança

### Hashing

```yaml
algoritmo: Argon2id
parametros:
  memory_cost: 65536  # 64 MiB
  time_cost: 3        # 3 iterações
  parallelism: 4      # 4 threads
  salt_length: 16     # bytes
```

**Justificativa**: Argon2id é recomendado pela OWASP 2024 e resistente a ataques de GPU/ASIC.

### Armazenamento

```sql
-- Tabela employees
password TEXT NULL,  -- Hash Argon2id ($argon2id$v=19$m=65536,t=3,p=4$...)
password_changed_at TEXT NULL,  -- ISO 8601 timestamp
failed_login_attempts INTEGER DEFAULT 0,
locked_until TEXT NULL,  -- ISO 8601 timestamp
```

### Auditoria

Todos os eventos de senha são registrados em `audit_logs`:

```yaml
eventos_auditados:
  - PASSWORD_CHANGED
  - PASSWORD_RESET_REQUESTED
  - PASSWORD_RESET_COMPLETED
  - FAILED_LOGIN_ATTEMPT
  - ACCOUNT_LOCKED
  - ACCOUNT_UNLOCKED
```

---

## 👥 Políticas por Role

### CASHIER & STOCKER

```yaml
autenticacao: PIN (4-6 dígitos)
senha_opcional: false
expiracao: null  # PIN não expira
reset: Apenas por ADMIN/MANAGER
```

### MANAGER

```yaml
autenticacao: Username + Senha (obrigatório)
senha_opcional: false
expiracao: 90 dias
reset: Via email ou por ADMIN
politica_senha: STRONG (score >= 3)
```

### ADMIN

```yaml
autenticacao: Username + Senha (obrigatório)
senha_opcional: false
expiracao: 60 dias  # Mais restritivo
reset: Via email (self-service) ou por outro ADMIN
politica_senha: VERY_STRONG (score >= 4)
exigir_2fa: true  # Planejado para v3.1.0
```

---

## 📊 Mensagens de Erro

### Validação de Senha

```typescript
const ERROR_MESSAGES = {
  TOO_SHORT: "A senha deve ter no mínimo 8 caracteres",
  TOO_LONG: "A senha deve ter no máximo 128 caracteres",
  NO_UPPERCASE: "A senha deve conter pelo menos 1 letra maiúscula",
  NO_LOWERCASE: "A senha deve conter pelo menos 1 letra minúscula",
  NO_NUMBER: "A senha deve conter pelo menos 1 número",
  NO_SPECIAL: "A senha deve conter pelo menos 1 caractere especial (!@#$%^&*...)",
  IN_HISTORY: "Esta senha já foi utilizada recentemente. Escolha outra.",
  TOO_WEAK: "A senha é muito fraca. Use uma combinação mais segura.",
  COMMON_PASSWORD: "Esta senha é muito comum. Escolha uma mais única.",
};
```

### Lockout de Conta

```typescript
const LOCKOUT_MESSAGES = {
  ACCOUNT_LOCKED: (minutes: number) =>
    `Conta bloqueada por ${minutes} minutos devido a tentativas excessivas de login.`,
  ATTEMPTS_REMAINING: (remaining: number) =>
    `Senha incorreta. ${remaining} tentativa(s) restante(s) antes de bloquear a conta.`,
  LOCKOUT_EXPIRED: "O bloqueio da conta expirou. Você pode tentar fazer login novamente.",
};
```

---

## 🧪 Testes de Validação

### Casos de Teste de Senha

```typescript
const TEST_PASSWORDS = {
  VERY_WEAK: ["123456", "password", "abc", "qwerty"],
  WEAK: ["Password", "Abc12345", "MyPassword"],
  MEDIUM: ["Password123", "MyP@ss123", "Secure2024"],
  STRONG: ["MyP@ssw0rd!", "Str0ng#Pass", "Giro@2024!"],
  VERY_STRONG: ["C0mpl3x!P@ssw0rd#2024", "Sup3r$3cur3#Gir0!", "Unbreakable@Pass#123"],
};
```

### Testes de Lockout

```rust
#[tokio::test]
async fn test_account_lockout_after_5_failures() {
    // Arrange
    let pool = setup_test_db().await;
    let repo = EmployeeRepository::new(&pool);
    
    // Act: 5 tentativas falhadas
    for _ in 0..5 {
        let _ = repo.authenticate_password("admin", "wrong_password").await;
    }
    
    // Assert
    let is_locked = repo.is_account_locked("admin_id").await.unwrap();
    assert!(is_locked);
}
```

---

## 📚 Referências

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Argon2 RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html)
- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

**STATUS**: ✅ Aprovado para implementação  
**Revisão**: Security Team @ Arkheion Corp
