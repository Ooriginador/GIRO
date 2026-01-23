# 🔒 Hardware Binding System

> Sistema anti-pirataria com vinculação de hardware

---

## 🎯 Objetivo

Impedir que uma licença seja usada em múltiplas máquinas simultaneamente através de:

1. **Fingerprinting** - Identificação única do hardware
2. **Binding** - Vinculação permanente licença ↔ máquina
3. **Validation** - Verificação a cada inicialização

---

## 🔍 Hardware Fingerprint

### Componentes Coletados

O Desktop coleta e combina **4 componentes**:

```
Hardware ID = CPU_ID | MOTHERBOARD_SERIAL | MAC_ADDRESS | DISK_SERIAL
```

#### 1. CPU ID

```rust
// Windows: CPUID instruction
// Linux: /proc/cpuinfo
// macOS: sysctl hw.cpufrequency

Exemplo: "BFEBFBFF000906EA"
```

#### 2. Motherboard Serial

```rust
// Windows: WMI - Win32_BaseBoard.SerialNumber
// Linux: /sys/class/dmi/id/board_serial
// macOS: system_profiler SPHardwareDataType

Exemplo: "O.E.M."
```

#### 3. Primary MAC Address

```rust
// Primeira interface de rede física (não virtual)
// Ignorar: VMware, VirtualBox, Hyper-V adapters

Exemplo: "00-11-22-33-44-55"
```

#### 4. Disk Serial Number

```rust
// Disco principal do sistema operacional
// Windows: WMIC DISKDRIVE GET SerialNumber
// Linux: /dev/disk/by-id/
// macOS: diskutil info disk0

Exemplo: "SN123456789ABC"
```

### Formato do Hardware ID

```
CPU:BFEBFBFF000906EA|MB:O.E.M.|MAC:00-11-22-33-44-55|DISK:SN123456789ABC
```

### Geração do Fingerprint (SHA-256)

```rust
use sha2::{Sha256, Digest};

pub fn generate_fingerprint(hardware_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(hardware_id.as_bytes());
    hex::encode(hasher.finalize())
}

// Exemplo de saída:
// "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

**Por que SHA-256?**

- Irreversível (não é possível reconstruir hardware_id do hash)
- Deterministico (mesmo hardware_id sempre gera mesmo hash)
- Collision-resistant (praticamente impossível duas máquinas gerarem mesmo hash)

---

## 🔗 License Activation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   ACTIVATION FLOW                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Desktop coleta Hardware ID                                   │
│     CPU + MB + MAC + DISK → Hardware String                      │
│                                                                   │
│  2. Desktop gera SHA-256 Fingerprint                             │
│     Hardware String → Fingerprint Hash (64 chars)                │
│                                                                   │
│  3. POST /licenses/:key/activate                                 │
│     {                                                             │
│       "hardware_id": "CPU:...|MB:...|MAC:...|DISK:...",         │
│       "machine_name": "PDV-01",                                  │
│       "os_version": "Windows 10",                                │
│       "timestamp": "2026-01-11T14:30:00Z"                        │
│     }                                                             │
│                                                                   │
│  4. Backend valida:                                              │
│     ✓ Licença existe e pertence ao admin?                        │
│     ✓ Licença não está revogada?                                 │
│     ✓ Licença não está vinculada a outro hardware?               │
│     ✓ Hardware não está vinculado a outra licença ativa?         │
│     ✓ Timestamp não tem time drift > 5min?                       │
│                                                                   │
│  5. Backend cria/atualiza registro de hardware:                  │
│     INSERT INTO hardware (fingerprint, machine_name, ...)        │
│                                                                   │
│  6. Backend vincula licença ao hardware:                         │
│     UPDATE licenses SET                                          │
│       hardware_id = <hw_id>,                                     │
│       status = 'active',                                         │
│       activated_at = NOW(),                                      │
│       expires_at = NOW() + INTERVAL '30 days'  -- monthly        │
│                                                                   │
│  7. Backend registra no audit_log:                               │
│     INSERT INTO audit_logs (action='license_activated', ...)     │
│                                                                   │
│  8. Retorna sucesso com detalhes:                                │
│     {                                                             │
│       "success": true,                                           │
│       "status": "active",                                        │
│       "expires_at": "2026-02-11T14:30:00Z",                      │
│       "days_remaining": 30                                       │
│     }                                                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Código Backend (Rust)

```rust
// services/license_service.rs
pub async fn activate(
    &self,
    license_key: &str,
    hardware_id: &str,
    machine_name: Option<String>,
    os_version: Option<String>,
    ip_address: Option<IpAddr>,
    timestamp: Option<DateTime<Utc>>,
) -> AppResult<ActivateLicenseResponse> {
    // 1. Validar time drift (anti-fraude)
    if let Some(ts) = timestamp {
        match check_time_drift(ts) {
            TimeDriftResult::Acceptable => {},
            TimeDriftResult::Warning(msg) => {
                tracing::warn!("Time drift warning: {}", msg);
            }
            TimeDriftResult::Rejected(msg) => {
                return Err(AppError::BadRequest(msg));
            }
        }
    }

    // 2. Buscar licença
    let license_repo = self.license_repo();
    let mut license = license_repo
        .find_by_key(license_key)
        .await?
        .ok_or_else(|| AppError::NotFound("Licença não encontrada".to_string()))?;

    // 3. Validações de status
    if license.status == LicenseStatus::Revoked {
        return Err(AppError::Gone("Licença revogada".to_string()));
    }

    // 4. Gerar fingerprint
    let fingerprint = generate_fingerprint(hardware_id);

    // 5. Verificar se já está ativada em outro hardware
    if let Some(hw_id) = license.hardware_id {
        let hardware_repo = self.hardware_repo();
        let current_hw = hardware_repo.find_by_id(hw_id).await?;

        if let Some(hw) = current_hw {
            if hw.fingerprint != fingerprint {
                return Err(AppError::Conflict(
                    "Licença já ativada em outro hardware".to_string()
                ));
            }
        }
    }

    // 6. Verificar conflito de hardware (outro license usando mesmo hw)
    let hardware_repo = self.hardware_repo();
    if let Some(existing_hw) = hardware_repo.find_by_fingerprint(&fingerprint).await? {
        // Verificar se há outra licença ativa neste hardware
        let conflict = license_repo
            .find_active_by_hardware(existing_hw.id)
            .await?;

        if let Some(conflicting) = conflict {
            if conflicting.id != license.id {
                return Err(AppError::Conflict(
                    "Hardware já vinculado a outra licença ativa".to_string()
                ));
            }
        }
    }

    // 7. Criar/atualizar hardware
    let hardware = hardware_repo
        .upsert(&fingerprint, machine_name.as_deref(), os_version.as_deref())
        .await?;

    // 8. Ativar licença
    let now = Utc::now();
    let expires_at = license.plan_type.calculate_expiration(now);

    license_repo
        .activate(license.id, hardware.id, expires_at)
        .await?;

    // 9. Audit log
    let audit_repo = self.audit_repo();
    audit_repo
        .log(
            AuditAction::LicenseActivated,
            Some(license.admin_id),
            Some(license.id),
            ip_address.map(|ip| ip.to_string()),
            serde_json::json!({
                "hardware_id": hardware.id,
                "fingerprint": fingerprint,
                "machine_name": machine_name,
                "os_version": os_version
            }),
        )
        .await?;

    Ok(ActivateLicenseResponse {
        success: true,
        license_key: license.license_key,
        status: LicenseStatus::Active,
        activated_at: now,
        expires_at,
        days_remaining: (expires_at - now).num_days() as i32,
        message: "Licença ativada com sucesso".to_string(),
    })
}
```

---

## ✅ License Validation Flow

Executado **a cada inicialização** do Desktop:

```
┌──────────────────────────────────────────────────────────────────┐
│                   VALIDATION FLOW                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Desktop coleta Hardware ID (mesmos componentes)              │
│                                                                   │
│  2. Desktop gera Fingerprint                                     │
│                                                                   │
│  3. POST /licenses/:key/validate                                 │
│     {                                                             │
│       "hardware_id": "CPU:...|MB:...|MAC:...|DISK:...",         │
│       "timestamp": "2026-01-11T14:30:00Z"                        │
│     }                                                             │
│                                                                   │
│  4. Backend valida:                                              │
│     ✓ Licença existe?                                            │
│     ✓ Status = active?                                           │
│     ✓ Não expirada (expires_at > NOW)?                           │
│     ✓ Fingerprint corresponde ao vinculado?                      │
│     ✓ Time drift < 5min?                                         │
│                                                                   │
│  5. Se válido:                                                   │
│     - Incrementa validation_count                                │
│     - Atualiza last_validated timestamp                          │
│     - Atualiza hardware.last_seen                                │
│     - Retorna success + dias restantes                           │
│                                                                   │
│  6. Se inválido:                                                 │
│     - Registra audit_log (license_validation_failed)             │
│     - Retorna erro específico                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Possíveis Respostas

#### ✅ Válida

```json
{
  "valid": true,
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "status": "active",
  "expires_at": "2026-02-11T14:30:00Z",
  "days_remaining": 30,
  "needs_renewal": false
}
```

#### ⚠️ Expirando em breve

```json
{
  "valid": true,
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "status": "active",
  "expires_at": "2026-01-15T14:30:00Z",
  "days_remaining": 4,
  "needs_renewal": true // < 7 dias
}
```

#### ❌ Hardware não corresponde

```json
{
  "error": "Unauthorized",
  "message": "Hardware não corresponde ao registrado",
  "timestamp": "2026-01-11T14:30:00Z"
}
```

#### ❌ Licença expirada

```json
{
  "error": "Forbidden",
  "message": "Licença expirada. Renove para continuar usando.",
  "expired_at": "2026-01-05T14:30:00Z"
}
```

---

## 🔄 License Transfer

Permite transferir licença para novo hardware (troca de máquina):

```
1. Admin chama POST /licenses/:key/transfer
   { "new_hardware_id": "CPU:NEW|MB:NEW|..." }

2. Backend:
   - Marca hardware antigo como is_active = false
   - Cria novo registro de hardware
   - Atualiza license.hardware_id
   - Registra no audit_log (license_transferred)

3. Desktop antigo:
   - Próxima validação falha (hardware não corresponde)
   - Exibe mensagem: "Licença transferida para outro hardware"

4. Desktop novo:
   - Pode ativar/validar normalmente
```

---

## 🛡️ Anti-Bypass Measures

### 1. Componentes Múltiplos

- Não depende de apenas um dado (ex: só MAC)
- Trocar um componente não quebra o fingerprint

### 2. SHA-256 Irreversível

- Servidor nunca armazena hardware_id plain text
- Impossível reconstruir componentes do hash

### 3. Time Drift Validation

```rust
pub fn check_time_drift(client_time: DateTime<Utc>) -> TimeDriftResult {
    let server_time = Utc::now();
    let diff = (server_time - client_time).num_seconds().abs();

    if diff > 300 {  // > 5 minutos
        TimeDriftResult::Rejected(
            "Timestamp muito distante do servidor".to_string()
        )
    } else if diff > 60 {  // > 1 minuto
        TimeDriftResult::Warning(format!("Time drift: {}s", diff))
    } else {
        TimeDriftResult::Acceptable
    }
}
```

### 4. Validation Counter

```sql
SELECT validation_count FROM licenses WHERE id = $1;
-- Se validation_count > 1000/dia → possível ataque
```

### 5. Audit Logs

Todas as ações são registradas:

- `license_activated`
- `license_validated`
- `license_validation_failed`
- `hardware_conflict`

---

## 📊 Database Schema

```sql
CREATE TABLE hardware (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint     VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256
    machine_name    VARCHAR(100),
    os_version      VARCHAR(50),
    cpu_info        VARCHAR(100),
    first_seen      TIMESTAMPTZ DEFAULT NOW(),
    last_seen       TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE licenses (
    -- ...
    hardware_id     UUID REFERENCES hardware(id) ON DELETE SET NULL,
    -- ...
);

-- Índices importantes
CREATE INDEX idx_hardware_fingerprint ON hardware(fingerprint);
CREATE INDEX idx_licenses_hardware ON licenses(hardware_id);
```

---

## 🚨 Edge Cases

### Reinstalação do Windows

- Hardware ID permanece igual → Funciona normalmente

### Upgrade de Hardware

- Se trocar CPU ou Motherboard → Fingerprint muda
- Admin precisa fazer transfer da licença

### VM/Container

- Hardware ID será diferente do host
- Licença pode ser ativada em VM, mas fica vinculada a ela

### Dual Boot

- Mesmo hardware, mas OS diferente
- Fingerprint deve ser igual → Funciona normalmente

---

## 🔧 Troubleshooting

### "Hardware não corresponde"

1. Verificar se houve upgrade de componentes
2. Admin fazer transfer via dashboard
3. Checar audit_logs para histórico

### "Hardware já vinculado a outra licença"

1. Verificar se há licença ativa duplicada
2. Revogar licença antiga se necessário
3. Limpar hardware binding via `/hardware/:id`

### Falsos Positivos

- MAC Address pode mudar (rare)
- MB Serial pode ser genérico ("O.E.M.")
- **Solução**: Combinar 4 componentes reduz drasticamente falsos positivos
