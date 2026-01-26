# 🔒 Plano de Remediação de Compliance

## Implementações Técnicas Prioritárias

**Data:** 26 de Janeiro de 2026  
**Status:** Em Progresso

---

## 🚨 CRÍTICO - Semana 1

### 1. Limpar Secrets do Histórico Git

```bash
# Instalar BFG Repo-Cleaner
brew install bfg  # macOS
# ou
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Criar arquivo com secrets a remover
cat > secrets-to-remove.txt << 'EOF'
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk
sk_live_789012
SEU_ACCESS_TOKEN
eyJ0eXAiOiJKV1QiLCJhbGc
giro_dev_password
Password123!
EOF

# Executar limpeza (fazer backup primeiro!)
git clone --mirror git@github.com:jhonslife/GIRO.git giro-mirror.git
cd giro-mirror.git
java -jar ../bfg-1.14.0.jar --replace-text ../secrets-to-remove.txt

# Limpar e forçar push
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### 2. Adicionar Pre-commit Hooks

```bash
# Instalar pre-commit
pip install pre-commit

# Criar .pre-commit-config.yaml na raiz
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks
        name: Detect secrets with Gitleaks
        entry: gitleaks protect --staged --verbose
        language: system
        pass_filenames: false

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-added-large-files
      - id: check-case-conflict
      - id: detect-private-key
EOF

# Instalar hooks
pre-commit install
```

### 3. Criar .gitleaks.toml

```toml
# .gitleaks.toml - Configuração do Gitleaks
title = "GIRO Gitleaks Config"

[extend]
useDefault = true

[[rules]]
id = "giro-internal-key"
description = "GIRO internal API key"
regex = '''giro_(test|live|dev)_[a-zA-Z0-9]{20,}'''
secretGroup = 1
keywords = ["giro_"]

[allowlist]
description = "Allowlist for false positives"
paths = [
    '''.*\.lock''',
    '''.*-lock\.json''',
    '''\.pnpm-lock\.yaml''',
]
regexes = [
    '''integrity.*sha512''',
    '''example\.com''',
    '''SEU_.*_AQUI''',
]
```

---

## 🔴 ALTA - Semana 2

### 4. Criptografia de CPF/CNPJ (Rust)

Criar novo arquivo: `src-tauri/src/crypto/pii.rs`

```rust
//! PII (Personally Identifiable Information) Encryption
//!
//! Criptografa dados sensíveis como CPF e CNPJ usando AES-256-GCM

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use std::sync::OnceLock;

static ENCRYPTION_KEY: OnceLock<[u8; 32]> = OnceLock::new();

/// Inicializa a chave de criptografia (chamar no startup)
pub fn init_encryption_key(key: [u8; 32]) {
    ENCRYPTION_KEY.get_or_init(|| key);
}

/// Carrega chave do ambiente ou gera uma nova
pub fn load_or_generate_key() -> [u8; 32] {
    if let Ok(key_b64) = std::env::var("GIRO_ENCRYPTION_KEY") {
        let decoded = BASE64.decode(&key_b64).expect("Invalid key format");
        let mut key = [0u8; 32];
        key.copy_from_slice(&decoded);
        key
    } else {
        // Gerar nova chave (apenas para dev)
        let mut key = [0u8; 32];
        OsRng.fill_bytes(&mut key);
        eprintln!("⚠️  Nova chave gerada. Salve em produção:");
        eprintln!("GIRO_ENCRYPTION_KEY={}", BASE64.encode(&key));
        key
    }
}

/// Criptografa um valor PII (CPF, CNPJ, etc)
pub fn encrypt_pii(plaintext: &str) -> Result<String, String> {
    let key = ENCRYPTION_KEY.get().ok_or("Encryption key not initialized")?;
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    // Gerar nonce aleatório de 12 bytes
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    // Formato: nonce (12 bytes) + ciphertext
    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);

    Ok(BASE64.encode(&combined))
}

/// Descriptografa um valor PII
pub fn decrypt_pii(encrypted: &str) -> Result<String, String> {
    let key = ENCRYPTION_KEY.get().ok_or("Encryption key not initialized")?;
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    let combined = BASE64.decode(encrypted).map_err(|e| e.to_string())?;

    if combined.len() < 13 {
        return Err("Invalid encrypted data".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| e.to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

/// Hash para busca (não reversível, mas permite index)
pub fn hash_pii_for_search(value: &str) -> String {
    use sha2::{Sha256, Digest};

    let salt = ENCRYPTION_KEY.get().map(|k| &k[..16]).unwrap_or(&[0u8; 16]);
    let mut hasher = Sha256::new();
    hasher.update(salt);
    hasher.update(value.as_bytes());

    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_cpf() {
        init_encryption_key([0u8; 32]); // Chave de teste

        let cpf = "123.456.789-00";
        let encrypted = encrypt_pii(cpf).unwrap();
        let decrypted = decrypt_pii(&encrypted).unwrap();

        assert_eq!(cpf, decrypted);
        assert_ne!(cpf, encrypted);
    }

    #[test]
    fn test_hash_for_search() {
        init_encryption_key([0u8; 32]);

        let cpf = "123.456.789-00";
        let hash1 = hash_pii_for_search(cpf);
        let hash2 = hash_pii_for_search(cpf);

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA-256 hex
    }
}
```

### 5. Migrar JWT para HttpOnly Cookies

**Backend (Rust/Axum):**

```rust
// src/middleware/auth_cookie.rs
use axum::{
    http::{header::SET_COOKIE, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use cookie::{Cookie, SameSite};
use time::Duration;

pub fn create_auth_cookie(token: &str, remember: bool) -> HeaderValue {
    let max_age = if remember {
        Duration::days(30)
    } else {
        Duration::days(1)
    };

    let cookie = Cookie::build(("auth_token", token))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .path("/")
        .max_age(max_age)
        .build();

    HeaderValue::from_str(&cookie.to_string()).unwrap()
}

pub fn clear_auth_cookie() -> HeaderValue {
    let cookie = Cookie::build(("auth_token", ""))
        .http_only(true)
        .secure(true)
        .path("/")
        .max_age(Duration::seconds(0))
        .build();

    HeaderValue::from_str(&cookie.to_string()).unwrap()
}
```

**Frontend (remover localStorage):**

```typescript
// lib/api.ts - Atualizado
export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', // Importante: envia/recebe cookies
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  // Token vem no cookie HttpOnly, não precisa salvar
  return response.json();
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include', // Sempre incluir cookies
  });
}
```

---

## 🟡 MÉDIA - Semana 3

### 6. Implementar Hard Delete com Anonimização

```typescript
// src/lib/gdpr.ts
import { prisma } from '@giro/database';

/**
 * Exclui permanentemente dados do usuário conforme LGPD Art. 18
 * Mantém registros históricos anonimizados para auditoria fiscal
 */
export async function deleteUserDataPermanently(
  employeeId: string,
  requestedBy: string
): Promise<{ success: boolean; deletedRecords: number }> {
  const ANONYMIZED_ID = 'LGPD_DELETED';
  const ANONYMIZED_TEXT = '[DADO REMOVIDO POR SOLICITAÇÃO LGPD]';

  let deletedRecords = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Registrar solicitação de exclusão (obrigatório manter log)
    await tx.auditLog.create({
      data: {
        action: 'LGPD_DELETE_REQUEST',
        entity: 'Employee',
        entityId: employeeId,
        newValue: JSON.stringify({
          requestedBy,
          requestedAt: new Date().toISOString(),
        }),
      },
    });

    // 2. Anonimizar vendas (manter para fiscal, remover PII)
    const salesUpdated = await tx.sale.updateMany({
      where: { employeeId },
      data: {
        employeeId: ANONYMIZED_ID,
      },
    });
    deletedRecords += salesUpdated.count;

    // 3. Remover sessões de caixa
    await tx.cashSession.deleteMany({
      where: { employeeId },
    });

    // 4. Anonimizar logs de auditoria
    const logsUpdated = await tx.auditLog.updateMany({
      where: { employeeId },
      data: {
        employeeId: null,
        oldValue: ANONYMIZED_TEXT,
        newValue: ANONYMIZED_TEXT,
      },
    });
    deletedRecords += logsUpdated.count;

    // 5. Excluir funcionário definitivamente
    await tx.employee.delete({
      where: { id: employeeId },
    });
    deletedRecords += 1;
  });

  return { success: true, deletedRecords };
}

/**
 * Exporta todos os dados do titular para portabilidade (LGPD Art. 18)
 */
export async function exportUserData(employeeId: string): Promise<object> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      cpf: true,
      phone: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const sales = await prisma.sale.findMany({
    where: { employeeId },
    select: {
      id: true,
      total: true,
      paymentMethod: true,
      createdAt: true,
    },
  });

  const cashSessions = await prisma.cashSession.findMany({
    where: { employeeId },
    select: {
      id: true,
      openedAt: true,
      closedAt: true,
      openingBalance: true,
      actualBalance: true,
    },
  });

  return {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    subject: 'LGPD Data Portability Request',
    data: {
      personalInfo: employee,
      salesHistory: sales,
      cashSessions: cashSessions,
    },
    metadata: {
      totalRecords: 1 + sales.length + cashSessions.length,
      format: 'JSON',
      encoding: 'UTF-8',
    },
  };
}
```

### 7. Criar Página "Meus Dados" (LGPD)

```tsx
// src/pages/settings/MyDataPage.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Shield, Trash2, Eye, FileJson } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { writeFile } from '@tauri-apps/api/fs';

export function MyDataPage() {
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await invoke('export_user_data', { userId: user.id });

      const path = await save({
        defaultPath: `meus-dados-giro-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (path) {
        await writeFile(path, JSON.stringify(data, null, 2));
        // Show success toast
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRevokeConsent = () => {
    localStorage.setItem('analytics_consent', 'false');
    // Show confirmation toast
  };

  const handleDeleteAccount = async () => {
    // This would trigger the LGPD deletion process
    await invoke('request_data_deletion', { userId: user.id });
    setShowDeleteDialog(false);
    // Logout and show confirmation
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Meus Dados</h1>
        <p className="text-muted-foreground">
          Gerencie seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD)
        </p>
      </div>

      {/* Dados Armazenados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Dados Armazenados
          </CardTitle>
          <CardDescription>Informações que mantemos sobre você</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Nome</dt>
              <dd className="text-sm">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm">{user.email || 'Não informado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">CPF</dt>
              <dd className="text-sm">{user.cpf ? '***.***.***-**' : 'Não informado'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Cargo</dt>
              <dd className="text-sm">{user.role}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Direitos LGPD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seus Direitos (LGPD)
          </CardTitle>
          <CardDescription>Exercite seus direitos previstos na Lei 13.709/2018</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Portabilidade */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h3 className="font-medium">Portabilidade de Dados</h3>
              <p className="text-sm text-muted-foreground">
                Baixe uma cópia de todos os seus dados em formato JSON
              </p>
            </div>
            <Button onClick={handleExportData} disabled={isExporting}>
              <FileJson className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>

          {/* Revogação de Consentimento */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h3 className="font-medium">Coleta de Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Revogar consentimento para coleta de dados de uso
              </p>
            </div>
            <Button variant="outline" onClick={handleRevokeConsent}>
              <Shield className="mr-2 h-4 w-4" />
              Revogar
            </Button>
          </div>

          {/* Exclusão de Dados */}
          <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div>
              <h3 className="font-medium text-destructive">Excluir Minha Conta</h3>
              <p className="text-sm text-muted-foreground">
                Solicitar exclusão permanente de todos os seus dados
              </p>
            </div>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contato DPO */}
      <Card>
        <CardHeader>
          <CardTitle>Contato para Privacidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para dúvidas ou solicitações sobre seus dados, entre em contato com nosso Encarregado de
            Proteção de Dados (DPO):
          </p>
          <p className="mt-2 font-mono text-sm">dpo@arkheion.com.br</p>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Dados</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os seus dados pessoais serão permanentemente
              excluídos. Registros fiscais serão anonimizados conforme exigência legal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

---

## ✅ Checklist de Implementação

### Semana 1 (Crítico)

- [ ] Executar BFG para limpar secrets
- [ ] Instalar pre-commit hooks
- [ ] Criar .gitleaks.toml
- [ ] Rotacionar todas as chaves expostas

### Semana 2 (Alta)

- [ ] Implementar crypto/pii.rs
- [ ] Migrar JWT para cookies
- [ ] Atualizar endpoints de auth
- [ ] Testar criptografia E2E

### Semana 3 (Média)

- [ ] Implementar hard delete
- [ ] Criar página Meus Dados
- [ ] Adicionar export de dados
- [ ] Documentar Data Retention Policy

### Semana 4 (Validação)

- [ ] Executar Gitleaks novamente
- [ ] Testar fluxo LGPD completo
- [ ] Revisar logs sanitizados
- [ ] Atualizar Privacy Policy

---

## 📚 Recursos

- [LGPD Compliance Checklist](https://www.gov.br/anpd/pt-br)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [AES-GCM in Rust](https://docs.rs/aes-gcm/latest/aes_gcm/)
