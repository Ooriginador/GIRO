# 🔒 Security & Compliance Skill

> **Especialista em segurança, LGPD/GDPR e proteção de dados**  
> Versão: 2.0.0 | Última Atualização: 30 de Janeiro de 2026

## 🌐 ECOSYSTEM CONTEXT

```yaml
security_scope:
  GIRO-D:
    pii: Customer CPF, phone, address
    encryption: AES-256-GCM (Rust aes-gcm)
    auth: Local PIN + license validation
  LICENSE:
    pii: Customer emails, business data
    encryption: PostgreSQL TLS, bcrypt passwords
    auth: JWT with role-based access
  GIRO-M:
    storage: SecureStore for tokens
    auth: JWT from License server
  LEADBOT:
    pii: WhatsApp numbers, messages
    compliance: LGPD consent tracking
```

## 📋 Descrição

Esta skill fornece conhecimento especializado em:

- LGPD (Lei Geral de Proteção de Dados) compliance
- Proteção de dados sensíveis (PII)
- Criptografia e hashing
- Auditoria de segurança
- Vulnerabilidades comuns (OWASP Top 10)

## 🛡️ Categorias de Dados

| Categoria       | Exemplos                   | Tratamento                  |
| --------------- | -------------------------- | --------------------------- |
| **PII**         | CPF, nome, email, telefone | Criptografia AES-256-GCM    |
| **Sensível**    | Senhas, tokens             | Bcrypt/Argon2 + nunca logar |
| **Financeiro**  | Valores, transações        | Audit log obrigatório       |
| **Operacional** | Logs, métricas             | Retenção limitada (90 dias) |

## 🔐 Padrões de Criptografia

### Rust - Criptografia de PII

```rust
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use rand::RngCore;

pub struct PiiEncryptor {
    cipher: Aes256Gcm,
}

impl PiiEncryptor {
    pub fn new(key: &[u8; 32]) -> Self {
        let cipher = Aes256Gcm::new_from_slice(key)
            .expect("Invalid key length");
        Self { cipher }
    }

    pub fn encrypt(&self, plaintext: &str) -> Result<String, String> {
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = self.cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| e.to_string())?;

        // Format: base64(nonce || ciphertext)
        let mut combined = nonce_bytes.to_vec();
        combined.extend(ciphertext);

        Ok(STANDARD.encode(combined))
    }

    pub fn decrypt(&self, encrypted: &str) -> Result<String, String> {
        let combined = STANDARD.decode(encrypted)
            .map_err(|e| e.to_string())?;

        if combined.len() < 12 {
            return Err("Invalid encrypted data".into());
        }

        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| e.to_string())?;

        String::from_utf8(plaintext)
            .map_err(|e| e.to_string())
    }
}
```

### TypeScript - Hashing de Senhas (Frontend → Backend)

```typescript
// Nunca armazenar senha em plaintext no frontend
// Usar HTTPS + enviar para backend fazer hash

// Backend (Rust)
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| e.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| e.to_string())?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}
```

## 📋 LGPD Compliance

### Direitos do Titular

| Direito       | Implementação                           | Endpoint                               |
| ------------- | --------------------------------------- | -------------------------------------- |
| Acesso        | Exportar todos os dados do usuário      | `GET /api/user/data-export`            |
| Correção      | Permitir atualização de dados           | `PUT /api/user/profile`                |
| Exclusão      | Soft delete + anonimização após 30 dias | `DELETE /api/user/account`             |
| Portabilidade | Export em JSON/CSV                      | `GET /api/user/data-export?format=csv` |

### Modelo de Consentimento

```prisma
model Consent {
  id          String   @id @default(uuid())
  userId      String
  purpose     String   // "marketing", "analytics", "essential"
  granted     Boolean
  grantedAt   DateTime @default(now())
  revokedAt   DateTime?
  ipAddress   String
  userAgent   String

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([purpose])
}
```

### Audit Log

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  userId      String?
  action      String   // "CREATE", "READ", "UPDATE", "DELETE"
  resource    String   // "user", "sale", "product"
  resourceId  String?
  oldValue    Json?    // Valor antes (criptografado se PII)
  newValue    Json?    // Valor depois (criptografado se PII)
  ipAddress   String?
  userAgent   String?

  @@index([userId])
  @@index([resource, resourceId])
  @@index([timestamp])
}
```

## 🔍 OWASP Top 10 - Checklist

### 1. Injection

- [ ] Usar queries parametrizadas (SQLx prepared statements)
- [ ] Nunca concatenar strings para SQL
- [ ] Sanitizar inputs de usuário

### 2. Broken Authentication

- [ ] Passwords com Argon2/bcrypt (custo ≥ 12)
- [ ] Rate limiting em login (5 tentativas/minuto)
- [ ] MFA para administradores

### 3. Sensitive Data Exposure

- [ ] PII criptografado em repouso (AES-256-GCM)
- [ ] HTTPS em produção
- [ ] Nunca logar dados sensíveis

### 4. XXE

- [ ] Desabilitar DTDs em parsers XML
- [ ] Preferir JSON sobre XML

### 5. Broken Access Control

- [ ] Verificar ownership em cada request
- [ ] Implementar RBAC (Role-Based Access Control)
- [ ] Princípio do menor privilégio

### 6. Security Misconfiguration

- [ ] Headers de segurança (CSP, HSTS, X-Frame-Options)
- [ ] Remover debug mode em produção
- [ ] Manter dependências atualizadas

### 7. XSS

- [ ] Escapar output em templates
- [ ] Content-Security-Policy restritivo
- [ ] Usar frameworks com escape automático (React)

### 8. Insecure Deserialization

- [ ] Validar schemas de entrada (Zod)
- [ ] Não deserializar dados não confiáveis

### 9. Using Components with Known Vulnerabilities

- [ ] `cargo audit` para Rust
- [ ] `pnpm audit` para Node.js
- [ ] Dependabot/Renovate ativo

### 10. Insufficient Logging & Monitoring

- [ ] Audit logs para ações sensíveis
- [ ] Alertas para anomalias
- [ ] Retenção adequada de logs

## 🔐 Headers de Segurança

### Tauri (Rust)

```rust
// tauri.conf.json
{
  "security": {
    "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    "dangerousDisableAssetCspModification": false
  }
}
```

### Web (Next.js)

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';",
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

## ✅ Checklist de Auditoria

### Pré-Release

- [ ] `cargo audit` sem vulnerabilidades críticas
- [ ] `pnpm audit` sem vulnerabilidades altas
- [ ] PII fields identificados e criptografados
- [ ] Senhas com hash adequado
- [ ] Rate limiting implementado
- [ ] HTTPS configurado
- [ ] Logs não expõem dados sensíveis

### Periódico (Mensal)

- [ ] Revisar dependências desatualizadas
- [ ] Verificar acessos de usuários
- [ ] Analisar logs de auditoria
- [ ] Testar backups e recovery
- [ ] Revisar permissões de API keys

## 🔗 Referências

- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Tauri Security](https://tauri.app/v2/security/)
- [cargo-audit](https://rustsec.org/)
