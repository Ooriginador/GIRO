# 🔐 Guia de Implementação: Chave de Criptografia PII

Este guia explica como gerar e configurar a chave de criptografia para dados PII (Personally Identifiable Information) no GIRO Desktop.

## 🎯 O Que É

A chave `GIRO_PII_KEY` é usada para criptografar dados sensíveis (CPF, CNPJ) em repouso no banco de dados SQLite usando AES-256-GCM.

## 🔑 Gerando a Chave

### Opção 1: OpenSSL (Recomendado)

```bash
openssl rand -base64 32
```

**Saída exemplo**:

```
K7vN2pQ9xR5mT8wY1lA4eH6jC3bF0dS9zX7vK2nM5pL=
```

### Opção 2: Python

```python
import secrets
import base64

key = secrets.token_bytes(32)
print(base64.b64encode(key).decode('utf-8'))
```

### Opção 3: Node.js

```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('base64');
console.log(key);
```

## 📦 Configurando a Chave

### Desenvolvimento (Local)

Crie um arquivo `.env` na raiz do projeto desktop:

```bash
# GIRO/apps/desktop/.env
GIRO_PII_KEY=K7vN2pQ9xR5mT8wY1lA4eH6jC3bF0dS9zX7vK2nM5pL=
```

**Importante**: Adicione `.env` ao `.gitignore`:

```bash
echo ".env" >> .gitignore
```

### Produção (Instalação no Cliente)

#### Windows

1. Defina variável de ambiente do sistema:

```powershell
# PowerShell (Admin)
[System.Environment]::SetEnvironmentVariable(
    "GIRO_PII_KEY",
    "K7vN2pQ9xR5mT8wY1lA4eH6jC3bF0dS9zX7vK2nM5pL=",
    [System.EnvironmentVariableTarget]::Machine
)
```

2. Ou via GUI:
   - `Painel de Controle` → `Sistema` → `Configurações avançadas do sistema`
   - `Variáveis de Ambiente` → `Variáveis do sistema` → `Novo`
   - Nome: `GIRO_PII_KEY`
   - Valor: `<sua_chave_aqui>`

#### Linux

Adicione ao `/etc/environment`:

```bash
sudo echo 'GIRO_PII_KEY="K7vN2pQ9xR5mT8wY1lA4eH6jC3bF0dS9zX7vK2nM5pL="' >> /etc/environment
```

Ou no perfil do usuário (`~/.bashrc` ou `~/.profile`):

```bash
export GIRO_PII_KEY="K7vN2pQ9xR5mT8wY1lA4eH6jC3bF0dS9zX7vK2nM5pL="
```

Recarregar:

```bash
source ~/.bashrc
```

## 🧪 Testando a Configuração

Execute este comando Tauri para verificar:

```bash
cd GIRO/apps/desktop
cargo run --bin check-pii-key
```

Ou adicione este teste ao código:

```rust
// src/utils/pii.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_is_configured() {
        let key = std::env::var("GIRO_PII_KEY");
        assert!(key.is_ok(), "GIRO_PII_KEY não está configurada");

        let key = key.unwrap();
        assert_eq!(key.len(), 44, "Chave deve ter 44 caracteres (base64 de 32 bytes)");
    }
}
```

## 🔄 Rotação de Chave (Avançado)

Para trocar a chave de criptografia:

1. **Gerar nova chave**:

   ```bash
   openssl rand -base64 32
   ```

2. **Migração dos dados**:

```rust
// Script de migração (executar UMA VEZ)
use crate::utils::pii;

async fn migrate_encryption_key(pool: &SqlitePool, old_key: &str, new_key: &str) -> AppResult<()> {
    // 1. Configurar chave antiga
    std::env::set_var("GIRO_PII_KEY", old_key);

    // 2. Buscar todos os registros com PII
    let customers = sqlx::query!("SELECT id, cpf FROM customers WHERE cpf IS NOT NULL")
        .fetch_all(pool)
        .await?;

    // 3. Descriptografar com chave antiga
    let mut decrypted_data = Vec::new();
    for customer in customers {
        if let Some(cpf) = customer.cpf {
            let decrypted = pii::decrypt_optional(Some(cpf))?;
            decrypted_data.push((customer.id, decrypted));
        }
    }

    // 4. Configurar chave nova
    std::env::set_var("GIRO_PII_KEY", new_key);

    // 5. Re-criptografar com chave nova
    for (id, cpf) in decrypted_data {
        let encrypted = pii::encrypt_optional(cpf)?;
        sqlx::query!("UPDATE customers SET cpf = ? WHERE id = ?", encrypted, id)
            .execute(pool)
            .await?;
    }

    Ok(())
}
```

3. **Atualizar variável de ambiente** com a nova chave

## ⚠️ Segurança

### ✅ Boas Práticas

- ✅ Gere uma chave diferente para cada instalação (multi-tenant)
- ✅ Armazene a chave em variável de ambiente (não hardcode)
- ✅ Faça backup seguro da chave (KeePass, 1Password, etc.)
- ✅ Rotacione a chave anualmente
- ✅ Restrinja acesso ao servidor/máquina

### ❌ Não Faça

- ❌ Não commite a chave no Git
- ❌ Não compartilhe a chave por email/chat
- ❌ Não use a mesma chave em dev e produção
- ❌ Não armazene em plain text em locais públicos

## 🆘 Recuperação de Desastres

### Perdi a Chave!

Se você perder a chave de criptografia:

1. **Dados criptografados são irrecuperáveis** 😱
2. Você terá que:
   - Gerar nova chave
   - Pedir aos clientes para re-cadastrarem CPF/CNPJ
   - Ou aceitar dados legados como plaintext (se não tiverem prefixo `enc:`)

### Backup da Chave

**Opção 1: KeePass/1Password**

- Salve a chave em um gerenciador de senhas
- Título: `GIRO Desktop - PII Encryption Key (Cliente XYZ)`

**Opção 2: Arquivo criptografado**

```bash
# Salvar chave em arquivo criptografado (GPG)
echo "GIRO_PII_KEY=K7v..." | gpg --symmetric --cipher-algo AES256 > giro-key.gpg

# Recuperar
gpg --decrypt giro-key.gpg
```

**Opção 3: Vault (Empresas)**

- Use HashiCorp Vault ou AWS Secrets Manager
- Rotação automática programada

## 📊 Monitoramento

Adicione logs para detectar problemas:

```rust
// src/utils/pii.rs
pub fn is_enabled() -> bool {
    match load_key() {
        Some(_) => {
            tracing::info!("PII encryption is ENABLED");
            true
        }
        None => {
            tracing::warn!("PII encryption is DISABLED - data will be stored in plaintext");
            false
        }
    }
}
```

## 🎓 FAQ

**P: O que acontece se eu não configurar a chave?**  
R: Os dados PII serão armazenados em plaintext (sem criptografia). O sistema funcionará normalmente, mas sem proteção LGPD.

**P: Posso mudar a chave depois?**  
R: Sim, mas precisa re-criptografar todos os dados existentes (veja seção Rotação de Chave).

**P: A chave é diferente por instalação?**  
R: Idealmente sim, mas você pode usar a mesma chave para facilitar (menos seguro).

**P: Preciso da chave para backups?**  
R: Sim! Se você fizer backup do banco SQLite e restaurar em outro lugar, precisará da mesma chave.

---

**Implementado**: 26/01/2026  
**Docs**: `GIRO/docs/COMPLIANCE-IMPLEMENTATION-STATUS.md`
