# 🔐 Análise: Sincronização com Login e Validação de PCs Conectáveis

> Revisão do sistema de autenticação multi-PC e limite de dispositivos
> Data: 28/01/2026

---

## 📊 Visão Geral do Sistema Atual

### Fluxo de Autenticação e Limite de PCs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE VALIDAÇÃO MULTI-PC                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ATIVAÇÃO DE LICENÇA                                                    │
│  ┌──────────────┐    POST /licenses/:key/activate    ┌─────────────────┐   │
│  │   Desktop    │ ─────────────────────────────────► │ License Server  │   │
│  │              │   { hardware_id, machine_name }    │                 │   │
│  └──────────────┘                                    └────────┬────────┘   │
│                                                               │            │
│                                    ┌──────────────────────────▼─────────┐  │
│                                    │ VALIDAÇÃO:                         │  │
│                                    │ IF hardware_count >= max_hardware  │  │
│                                    │    ⛔ ERRO: Limite atingido        │  │
│                                    │ ELSE                               │  │
│                                    │    ✅ Vincula hardware à licença   │  │
│                                    └────────────────────────────────────┘  │
│                                                                             │
│  2. OPERAÇÕES DE SYNC                                                      │
│  ┌──────────────┐    POST /sync/:key/push            ┌─────────────────┐   │
│  │   Desktop    │ ─────────────────────────────────► │ License Server  │   │
│  │              │   { hardware_id, items[] }         │                 │   │
│  └──────────────┘                                    └────────┬────────┘   │
│                                                               │            │
│                                    ┌──────────────────────────▼─────────┐  │
│                                    │ verify_license_access():           │  │
│                                    │ - Busca licença por key            │  │
│                                    │ - Verifica hardware_id no array    │  │
│                                    │   license.hardware[]               │  │
│                                    │ IF não encontrado:                 │  │
│                                    │   ⛔ ERRO 403: HardwareMismatch    │  │
│                                    └────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Estrutura de Dados

### Modelo License (PostgreSQL)

```rust
pub struct License {
    pub id: Uuid,
    pub key: String,
    pub plan_type: PlanType,
    pub status: LicenseStatus,
    pub max_hardware: i32,          // ← Limite de PCs permitidos
    pub hardware: Vec<LicenseHardware>, // ← PCs vinculados
    pub admin_id: Option<Uuid>,
    // ...
}
```

### Modelo LicenseHardware

```rust
pub struct LicenseHardware {
    pub id: Uuid,
    pub hardware_id: String,       // Fingerprint único do PC
    pub machine_name: Option<String>,
    pub os_version: Option<String>,
    pub cpu_info: Option<String>,
    pub activated_at: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub is_active: bool,
}
```

### Verificação no Momento da Ativação

```rust
// LicenseService::activate()
fn can_activate(&self) -> bool {
    let active_count = self.hardware.iter()
        .filter(|h| h.is_active)
        .count();

    active_count < self.max_hardware as usize
}
```

---

## ✅ Pontos Positivos do Sistema Atual

| Aspecto                     | Implementação                          | Status |
| --------------------------- | -------------------------------------- | ------ |
| **Limite de PCs**           | `max_hardware` por licença             | ✅ OK  |
| **Validação de Hardware**   | `verify_license_access()` em cada sync | ✅ OK  |
| **Fingerprint único**       | Hardware ID baseado em CPU/MAC/Disk    | ✅ OK  |
| **Desativação de Hardware** | Endpoint DELETE /hardware/:id          | ✅ OK  |
| **Auditoria**               | Logs de ativação/desativação           | ✅ OK  |

---

## ⚠️ Gaps Identificados

### 1. **Falta Info de Limite no Status de Sync**

O `SyncStatusResponse` não informa quantos PCs estão conectados:

```rust
// ATUAL
pub struct SyncStatusResponse {
    pub entity_counts: Vec<EntityCount>,
    pub last_sync: Option<DateTime<Utc>>,
    pub pending_changes: i64,
    // ❌ Não tem info de hardware/limite
}
```

**Problema:** Desktop não sabe se está perto do limite de PCs.

### 2. **Sem Endpoint para Listar PCs por License Key**

O endpoint `/hardware` só funciona com JWT de admin. Desktop não pode consultar outros PCs da mesma licença.

### 3. **Falta Comando no Desktop para Ver Dispositivos**

Não há forma do usuário ver quais PCs estão usando a mesma licença.

### 4. **Login só Recupera Licença, Não Mostra Devices**

O `recover_license_from_login` retorna a license key, mas não lista os dispositivos conectados.

---

## 🚀 Melhorias Propostas

### Melhoria 1: Enriquecer SyncStatusResponse

```rust
// PROPOSTO
pub struct SyncStatusResponse {
    pub entity_counts: Vec<EntityCount>,
    pub last_sync: Option<DateTime<Utc>>,
    pub pending_changes: i64,
    // ✅ NOVO
    pub license_info: LicenseInfo,
}

pub struct LicenseInfo {
    pub max_hardware: i32,
    pub active_hardware: i32,
    pub devices: Vec<DeviceInfo>,
}

pub struct DeviceInfo {
    pub hardware_id: String,
    pub machine_name: Option<String>,
    pub last_seen: DateTime<Utc>,
    pub is_current: bool, // true se for este PC
}
```

### Melhoria 2: Novo Endpoint - Listar Devices por Key

```rust
// GET /licenses/:key/devices
// Auth: API Key (não precisa JWT)
async fn list_devices(
    Path(key): Path<String>,
    headers: HeaderMap,
) -> AppResult<Json<Vec<DeviceInfo>>> {
    let license = license_service.find_by_key(&key)?;
    let devices = license.hardware
        .iter()
        .filter(|h| h.is_active)
        .map(DeviceInfo::from)
        .collect();
    Ok(Json(devices))
}
```

### Melhoria 3: Novo Comando Desktop

```rust
#[tauri::command]
#[specta::specta]
pub async fn get_connected_devices(
    state: tauri::State<'_, AppState>,
) -> CommandResult<Vec<DeviceInfo>> {
    let license = state.license()?;
    let client = LicenseClient::new(&license)?;
    let devices = client.get_devices().await?;
    Ok(devices)
}
```

---

## 📋 Implementação Detalhada

### Arquivos a Modificar

1. **License Server:**

   - `services/sync_service.rs` - Enriquecer SyncStatusResponse
   - `routes/licenses.rs` - Adicionar endpoint `/devices`
   - `dto/license.rs` - Adicionar DeviceInfo DTO

2. **Desktop:**
   - `commands/license.rs` - Adicionar comando `get_connected_devices`
   - `license/client.rs` - Adicionar método `get_devices()`

---

## 🔒 Considerações de Segurança

1. **API Key obrigatória** - Endpoints de device só funcionam com key válida
2. **Não expor hardware_id completo** - Retornar apenas últimos 8 caracteres
3. **Rate limiting** - Evitar abuso do endpoint de listagem
4. **Auditoria** - Logar consultas de devices

---

## 📊 Resumo

| Componente              | Estado Atual  | Proposta                    | Prioridade |
| ----------------------- | ------------- | --------------------------- | ---------- |
| max_hardware validation | ✅ OK         | Manter                      | -          |
| verify_license_access   | ✅ OK         | Manter                      | -          |
| SyncStatusResponse      | ⚠️ Incompleto | Adicionar license_info      | ALTA       |
| Endpoint list devices   | ❌ Não existe | Criar /devices              | MÉDIA      |
| Comando desktop         | ❌ Não existe | Criar get_connected_devices | MÉDIA      |
