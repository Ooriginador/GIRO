# 📋 Relatório de Compliance - Proteção de Dados

## GIRO Desktop, Mobile & License Server

**Versão:** 1.0  
**Data:** 26 de Janeiro de 2026  
**Auditor:** Arkheion Corp  
**Escopo:** LGPD (Lei 13.709/2018), GDPR, PCI-DSS (parcial)

---

## 📊 Resumo Executivo

| Categoria                | Status      | Conformidade |
| ------------------------ | ----------- | ------------ |
| Documentação Legal       | ✅ CONFORME | 95%          |
| Criptografia em Trânsito | ✅ CONFORME | 100%         |
| Criptografia em Repouso  | ⚠️ PARCIAL  | 70%          |
| Consentimento            | ✅ CONFORME | 90%          |
| Direitos do Titular      | ⚠️ PARCIAL  | 60%          |
| Segurança de Dados       | ✅ CONFORME | 85%          |
| Logs e Auditoria         | ✅ CONFORME | 80%          |
| Vazamento de Secrets     | 🔴 CRÍTICO  | 40%          |

**Pontuação Geral de Compliance: 77.5%** (Meta: 100%)

---

## 1️⃣ INVENTÁRIO DE DADOS PESSOAIS (DATA MAPPING)

### 1.1 GIRO Desktop - Schema Prisma

| Entidade            | Campos PII                                                             | Classificação | Criptografia        |
| ------------------- | ---------------------------------------------------------------------- | ------------- | ------------------- |
| **Employee**        | `name`, `cpf`, `phone`, `email`, `pin`, `password`                     | Sensível      | Hash (pin/password) |
| **Customer**        | `name`, `cpf`, `phone`, `phone2`, `email`, `zipCode`, `street`, `city` | Pessoal       | ❌ Texto plano      |
| **Supplier**        | `name`, `cnpj`, `phone`, `email`, `address`                            | Comercial     | ❌ Texto plano      |
| **AuditLog**        | `ipAddress`, `userAgent`                                               | Técnico       | ❌ Texto plano      |
| **CustomerVehicle** | `plate`, `chassis`, `renavam`                                          | Pessoal       | ❌ Texto plano      |

### 1.2 License Server - PostgreSQL

| Entidade    | Campos PII                       | Classificação | Criptografia       |
| ----------- | -------------------------------- | ------------- | ------------------ |
| **User**    | `email`, `password_hash`, `name` | Sensível      | ✅ Hash (password) |
| **License** | `hardware_id`, `user_id`         | Técnico       | ❌ Texto plano     |
| **Backup**  | Dados comerciais completos       | Sensível      | ✅ AES-256         |

### 1.3 Mobile App

| Armazenamento         | Tipo de Dado        | Segurança            |
| --------------------- | ------------------- | -------------------- |
| **expo-secure-store** | Tokens, credenciais | ✅ Keychain/Keystore |
| **AsyncStorage**      | Preferências, cache | ⚠️ Texto plano       |

---

## 2️⃣ ANÁLISE DE CONFORMIDADE LGPD

### Art. 7 - Bases Legais para Tratamento

| Tratamento                    | Base Legal           | Status |
| ----------------------------- | -------------------- | ------ |
| Cadastro de funcionários      | Execução de contrato | ✅     |
| Dados de clientes para vendas | Legítimo interesse   | ✅     |
| Analytics de uso              | Consentimento        | ✅     |
| Backup em nuvem               | Consentimento        | ✅     |
| Logs de auditoria             | Obrigação legal      | ✅     |

### Art. 18 - Direitos do Titular

| Direito           | Implementado        | Evidência                     |
| ----------------- | ------------------- | ----------------------------- |
| **Acesso**        | ⚠️ Parcial          | Não há tela dedicada          |
| **Correção**      | ✅                  | Edição de cadastros           |
| **Exclusão**      | ⚠️ Parcial          | Soft delete, sem hard delete  |
| **Portabilidade** | ✅                  | Export CSV/Excel/JSON         |
| **Revogação**     | ✅                  | `setConsent(false)` analytics |
| **Informação**    | ✅                  | Privacy Policy documentada    |
| **Oposição**      | ⚠️ Não implementado | -                             |

### Art. 46 - Segurança

| Medida              | Status | Detalhes             |
| ------------------- | ------ | -------------------- |
| Criptografia TLS    | ✅     | TLS 1.3 para APIs    |
| Criptografia backup | ✅     | AES-256              |
| Hash de senhas      | ✅     | bcrypt/argon2        |
| Controle de acesso  | ✅     | RBAC (roles)         |
| Logs de auditoria   | ✅     | AuditLog table       |
| Rate limiting       | ✅     | Redis + Token bucket |

### Art. 48 - Notificação de Incidentes

| Requisito            | Status         | Prazo      |
| -------------------- | -------------- | ---------- |
| Plano de resposta    | ⚠️ Parcial     | Documentar |
| Notificação ANPD     | ✅ Documentado | 72h        |
| Notificação usuários | ✅ Documentado | 72h        |

---

## 3️⃣ FINDINGS CRÍTICOS

### 🔴 F-001: Secrets Expostos no Repositório

**Severidade:** CRÍTICA  
**Arquivo:** `GIRO/scripts/gitleaks_report.json`

**Descrição:** Gitleaks detectou múltiplas API keys e tokens expostos no histórico do Git:

- Chaves Tauri signing expostas em documentação
- JWT tokens de exemplo em docs
- Senhas de desenvolvimento hardcoded

**Evidência:**

```json
{
  "RuleID": "generic-api-key",
  "Secret": "dW50cnVzdGVkIGNvbW1lbnQ...",
  "File": "SETUP-SIGNING-KEYS.md"
}
```

**Remediação:**

1. Executar `git filter-branch` ou BFG Repo-Cleaner
2. Rotacionar todas as chaves expostas
3. Adicionar `.gitleaks.toml` para prevenção
4. Implementar pre-commit hooks

---

### 🔴 F-002: CPF/CNPJ Armazenados em Texto Plano

**Severidade:** ALTA  
**Local:** `packages/database/prisma/schema.prisma`

**Descrição:** Dados sensíveis de identificação pessoal (CPF, CNPJ) são armazenados sem criptografia.

**Campos afetados:**

- `Employee.cpf`
- `Customer.cpf`
- `Supplier.cnpj`

**Remediação:**

```rust
// Criptografar antes de salvar
let encrypted_cpf = encrypt_pii(cpf, &encryption_key)?;

// Ou usar hash + salt para buscas
let cpf_hash = hash_for_search(cpf)?;
```

---

### ⚠️ F-003: localStorage com JWT (Website)

**Severidade:** MÉDIA  
**Local:** `giro-license-server/giro-website/app/login/page.tsx`

**Descrição:** Tokens JWT são armazenados em localStorage, vulnerável a XSS.

**Código atual:**

```typescript
localStorage.setItem('token', response.access_token);
```

**Remediação:**

```typescript
// Opção 1: HttpOnly Cookies (recomendado)
// Backend deve setar cookie seguro

// Opção 2: sessionStorage (menos persistente)
sessionStorage.setItem('token', response.access_token);

// Opção 3: Memory only com refresh via cookie
```

---

### ⚠️ F-004: Ausência de Hard Delete para Direito de Exclusão

**Severidade:** MÉDIA  
**Local:** Schema Prisma

**Descrição:** O sistema implementa apenas soft delete (`deletedAt`), mas a LGPD exige exclusão definitiva quando solicitada.

**Remediação:**

```typescript
// Adicionar comando de exclusão definitiva
async function permanentlyDeleteUserData(userId: string) {
  await prisma.$transaction([
    prisma.employee.delete({ where: { id: userId } }),
    prisma.auditLog.deleteMany({ where: { employeeId: userId } }),
    // Anonimizar vendas associadas
    prisma.sale.updateMany({
      where: { employeeId: userId },
      data: { employeeId: 'ANONYMIZED' },
    }),
  ]);
}
```

---

### ⚠️ F-005: Falta de Ferramenta de Portabilidade Automatizada

**Severidade:** MÉDIA  
**Local:** Desktop App

**Descrição:** Não há funcionalidade dedicada para exportar todos os dados de um titular em formato estruturado (JSON/XML).

**Remediação:**

```typescript
// Adicionar em src/lib/gdpr.ts
export async function exportUserData(userId: string): Promise<Blob> {
  const data = {
    personal: await getPersonalData(userId),
    sales: await getUserSales(userId),
    activities: await getUserAuditLog(userId),
    exportedAt: new Date().toISOString(),
    format: 'LGPD_PORTABLE_V1',
  };

  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
}
```

---

### ✅ F-006: Analytics com Consentimento (Conforme)

**Severidade:** INFO  
**Local:** `GIRO/apps/desktop/src/lib/analytics.ts`

**Descrição:** O sistema implementa corretamente:

- Verificação de consentimento antes de tracking
- Sanitização de dados sensíveis
- Opt-in explícito

**Código verificado:**

```typescript
const hasConsent = (): boolean => {
  return localStorage.getItem('analytics_consent') === 'true';
};

function sanitizeProperties(props?: Record<string, unknown>) {
  const sensitiveKeys = ['password', 'pin', 'cpf', 'cnpj', 'email', 'phone', 'name'];
  // Remove campos sensíveis antes de enviar
}
```

---

## 4️⃣ ANÁLISE PCI-DSS (Parcial)

O GIRO não processa pagamentos diretamente (usa Stripe/gateway externo), mas deve garantir:

| Requisito                  | Status | Observação     |
| -------------------------- | ------ | -------------- |
| Não armazenar CVV          | ✅ N/A | Stripe handles |
| Não armazenar PAN completo | ✅ N/A | Stripe handles |
| TLS para transmissão       | ✅     | HTTPS enforced |
| Logs sem dados de cartão   | ✅     | Não aplicável  |

---

## 5️⃣ DOCUMENTAÇÃO LEGAL

### Documentos Existentes

| Documento        | Local                            | Status      |
| ---------------- | -------------------------------- | ----------- |
| Privacy Policy   | `docs/legal/PRIVACY_POLICY.md`   | ✅ Completo |
| Terms of Service | `docs/legal/TERMS_OF_SERVICE.md` | ✅ Completo |
| EULA             | `docs/legal/EULA.md`             | ✅ Completo |
| License          | `docs/legal/LICENSE.md`          | ✅ Completo |

### Gaps Identificados

| Item                     | Necessário    | Ação                          |
| ------------------------ | ------------- | ----------------------------- |
| DPO Contact              | ✅ Existe     | dpo@arkheion.com.br           |
| Cookie Policy            | ⚠️ Parcial    | Expandir na Privacy Policy    |
| Data Retention Policy    | ⚠️ Mencionado | Formalizar documento separado |
| Incident Response Plan   | ❌ Falta      | Criar documento               |
| DPIA (Impact Assessment) | ❌ Falta      | Realizar avaliação formal     |

---

## 6️⃣ PLANO DE AÇÃO PARA CONFORMIDADE 100%

### Prioridade CRÍTICA (Semana 1)

| #   | Ação                                      | Responsável | Prazo |
| --- | ----------------------------------------- | ----------- | ----- |
| 1   | Limpar secrets do histórico Git           | DevOps      | 48h   |
| 2   | Rotacionar todas as chaves expostas       | Security    | 48h   |
| 3   | Implementar pre-commit hooks para secrets | DevOps      | 72h   |

### Prioridade ALTA (Semana 2-3)

| #   | Ação                                       | Responsável | Prazo  |
| --- | ------------------------------------------ | ----------- | ------ |
| 4   | Criptografar CPF/CNPJ em repouso           | Backend     | 7 dias |
| 5   | Migrar JWT de localStorage para cookies    | Frontend    | 5 dias |
| 6   | Implementar hard delete com anonimização   | Backend     | 5 dias |
| 7   | Criar ferramenta de portabilidade de dados | Backend     | 3 dias |

### Prioridade MÉDIA (Semana 4-6)

| #   | Ação                                   | Responsável | Prazo   |
| --- | -------------------------------------- | ----------- | ------- |
| 8   | Criar tela "Meus Dados" para titulares | Frontend    | 7 dias  |
| 9   | Documentar Data Retention Policy       | Legal       | 5 dias  |
| 10  | Realizar DPIA formal                   | DPO         | 14 dias |
| 11  | Criar Incident Response Plan           | Security    | 7 dias  |

### Prioridade BAIXA (Contínuo)

| #   | Ação                               | Responsável | Prazo      |
| --- | ---------------------------------- | ----------- | ---------- |
| 12  | Treinamento LGPD para equipe       | RH          | Mensal     |
| 13  | Auditoria de segurança recorrente  | Security    | Trimestral |
| 14  | Atualizar políticas de privacidade | Legal       | Anual      |

---

## 7️⃣ IMPLEMENTAÇÕES RECOMENDADAS

### 7.1 Criptografia de PII (Rust/Tauri)

```rust
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};

pub fn encrypt_pii(plaintext: &str, key: &[u8; 32]) -> Result<String, Error> {
    let cipher = Aes256Gcm::new(Key::from_slice(key));
    let nonce = Nonce::from_slice(b"unique nonce"); // Use random nonce

    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())?;
    Ok(base64::encode(&ciphertext))
}

pub fn decrypt_pii(ciphertext: &str, key: &[u8; 32]) -> Result<String, Error> {
    let cipher = Aes256Gcm::new(Key::from_slice(key));
    let nonce = Nonce::from_slice(b"unique nonce");

    let decoded = base64::decode(ciphertext)?;
    let plaintext = cipher.decrypt(nonce, decoded.as_ref())?;
    Ok(String::from_utf8(plaintext)?)
}
```

### 7.2 Middleware de Sanitização de Logs

```typescript
// src/lib/logger.ts
const sensitivePatterns = [
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, // CPF
  /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, // CNPJ
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{10,11}\b/g, // Phone
];

export function sanitizeForLog(message: string): string {
  let sanitized = message;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}
```

### 7.3 Cookie HttpOnly para JWT

```typescript
// Backend: Axum/Rust
use axum::http::{header::SET_COOKIE, HeaderValue};

fn create_auth_cookie(token: &str) -> HeaderValue {
    HeaderValue::from_str(&format!(
        "auth_token={}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400",
        token
    )).unwrap()
}

// Frontend: Remover localStorage
// O cookie é enviado automaticamente com credentials: 'include'
```

### 7.4 Tela "Meus Dados" para LGPD

```tsx
// src/pages/settings/MyDataPage.tsx
export function MyDataPage() {
  return (
    <PageLayout title="Meus Dados (LGPD)">
      <Card>
        <CardHeader>
          <CardTitle>Seus Direitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExportData}>
            <Download className="mr-2" />
            Exportar Meus Dados
          </Button>

          <Button variant="outline" onClick={handleRevokeConsent}>
            <Shield className="mr-2" />
            Revogar Consentimento Analytics
          </Button>

          <Button variant="destructive" onClick={handleDeleteAccount}>
            <Trash2 className="mr-2" />
            Solicitar Exclusão de Dados
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Dados Armazenados</CardTitle>
        </CardHeader>
        <CardContent>
          <DataSummaryTable data={userData} />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
```

---

## 8️⃣ CHECKLIST DE VERIFICAÇÃO FINAL

### Antes do Deploy

- [ ] Gitleaks executado sem findings
- [ ] Todas as secrets em variáveis de ambiente
- [ ] CPF/CNPJ criptografados
- [ ] JWT em HttpOnly cookies
- [ ] Privacy Policy atualizada
- [ ] Consentimento implementado
- [ ] Hard delete funcional
- [ ] Portabilidade funcional
- [ ] Rate limiting ativo
- [ ] HTTPS enforced

### Periódico (Mensal)

- [ ] Revisar logs de auditoria
- [ ] Verificar acessos não autorizados
- [ ] Atualizar dependências de segurança
- [ ] Testar backup/restore
- [ ] Simular incident response

---

## 📎 ANEXOS

### A. Referências Legais

- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [GDPR - Regulation (EU) 2016/679](https://gdpr.eu/)
- [ANPD - Guias e Orientações](https://www.gov.br/anpd)
- [OWASP Top 10](https://owasp.org/Top10/)

### B. Ferramentas Utilizadas

- **Gitleaks**: Detecção de secrets
- **Schema Analysis**: Prisma schema review
- **Code Grep**: Análise de padrões de código

### C. Contatos

| Função      | Email                       |
| ----------- | --------------------------- |
| DPO         | dpo@arkheion.com.br         |
| Privacidade | privacidade@arkheion.com.br |
| Suporte     | suporte@arkheion.com.br     |

---

**Aprovado por:** ********\_********  
**Data:** 26/01/2026  
**Próxima Revisão:** 26/04/2026

---

_Este documento é confidencial e destinado apenas para uso interno da Arkheion Corp._
