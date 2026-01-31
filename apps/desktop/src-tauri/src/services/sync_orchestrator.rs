//! Sync Orchestrator Service
//!
//! Orquestra sincronização entre múltiplas fontes:
//! - Cloud (License Server) - sync com servidor central
//! - LAN (Master/Satellite) - sync PC-a-PC na rede local
//! - Híbrido - combina ambos para máxima disponibilidade
//!
//! Este serviço unifica a lógica de sync e gerencia conflitos.

use crate::license::{SyncClient, SyncEntityType, SyncItemStatus, SyncOperation};
use crate::models::{Category, Customer, Employee, Product, Setting, Supplier};
use crate::repositories::{
    CategoryRepository, CustomerRepository, EmployeeRepository, ProductRepository,
    SettingsRepository, SupplierRepository, SyncPendingRepository,
};
use crate::services::connection_manager::{ConnectionManager, OperationMode, PeerStatus};
use crate::services::network_client::NetworkClient;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, RwLock};
use tracing::{error, info};

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

/// Maximum items per sync push request (must match server limit)
const MAX_SYNC_CHUNK_SIZE: usize = 100;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS E ESTRUTURAS
// ════════════════════════════════════════════════════════════════════════════

/// Fonte de sincronização
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SyncSource {
    /// Servidor na nuvem (License Server)
    Cloud,
    /// PC Master na rede local
    Lan,
    /// Peer específico
    Peer,
}

/// Direção do sync
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SyncDirection {
    /// Enviar dados locais
    Push,
    /// Receber dados remotos
    Pull,
    /// Bidirecional
    Bidirectional,
}

/// Estratégia de resolução de conflitos
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ConflictStrategy {
    /// Último escritor ganha (baseado em updated_at)
    LastWriterWins,
    /// Cloud sempre ganha
    CloudWins,
    /// Local sempre ganha
    LocalWins,
    /// Marcar para revisão manual
    MarkForReview,
}

/// Status do sync
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    /// Ocioso
    Idle,
    /// Sincronizando
    Syncing,
    /// Sync completo
    Completed,
    /// Erro no sync
    Error,
    /// Pausado (sem conexão)
    Paused,
}

/// Resultado de uma operação de sync
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncOperationResult {
    /// Fonte do sync
    pub source: SyncSource,
    /// Sucesso
    pub success: bool,
    /// Itens enviados
    pub pushed: usize,
    /// Itens recebidos
    pub pulled: usize,
    /// Conflitos detectados
    pub conflicts: usize,
    /// Conflitos resolvidos
    pub resolved: usize,
    /// Erros
    pub errors: Vec<String>,
    /// Tempo de execução (ms)
    pub duration_ms: u64,
    /// Timestamp
    pub timestamp: String,
}

/// Estatísticas do orchestrator
#[derive(Debug, Clone, Serialize, specta::Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct SyncOrchestratorStats {
    /// Total de syncs realizados
    pub total_syncs: u64,
    /// Syncs bem-sucedidos
    pub successful_syncs: u64,
    /// Syncs falhos
    pub failed_syncs: u64,
    /// Itens pendentes para enviar
    pub pending_push: i64,
    /// Último sync cloud
    pub last_cloud_sync: Option<String>,
    /// Último sync LAN
    pub last_lan_sync: Option<String>,
    /// Conflitos totais
    pub total_conflicts: u64,
    /// Conflitos resolvidos
    pub conflicts_resolved: u64,
}

/// Evento do orchestrator
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum SyncOrchestratorEvent {
    /// Sync iniciado
    SyncStarted { source: SyncSource },
    /// Sync completado
    SyncCompleted { result: SyncOperationResult },
    /// Sync falhou
    SyncFailed { source: SyncSource, error: String },
    /// Conflito detectado
    ConflictDetected {
        entity_type: String,
        entity_id: String,
    },
    /// Progresso
    Progress {
        source: SyncSource,
        current: usize,
        total: usize,
    },
}

/// Configuração do orchestrator
#[derive(Debug, Clone)]
pub struct SyncOrchestratorConfig {
    /// Estratégia de conflitos
    pub conflict_strategy: ConflictStrategy,
    /// Intervalo de auto-sync (segundos)
    pub auto_sync_interval_secs: u64,
    /// Habilitar sync cloud
    pub cloud_enabled: bool,
    /// Habilitar sync LAN
    pub lan_enabled: bool,
    /// Prioridade: cloud ou LAN primeiro
    pub cloud_priority: bool,
    /// Timeout de operação (segundos)
    pub operation_timeout_secs: u64,
    /// Retry em caso de falha
    pub retry_on_failure: bool,
    /// Máximo de retries
    pub max_retries: u32,
}

impl Default for SyncOrchestratorConfig {
    fn default() -> Self {
        Self {
            conflict_strategy: ConflictStrategy::LastWriterWins,
            auto_sync_interval_secs: 300, // 5 minutos
            cloud_enabled: true,
            lan_enabled: true,
            cloud_priority: true, // Cloud primeiro, depois LAN
            operation_timeout_secs: 60,
            retry_on_failure: true,
            max_retries: 3,
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// SYNC ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════

/// Orquestrador de sincronização
pub struct SyncOrchestrator {
    pool: SqlitePool,
    config: RwLock<SyncOrchestratorConfig>,
    status: RwLock<SyncStatus>,
    stats: RwLock<SyncOrchestratorStats>,
    /// Connection Manager para sync LAN
    connection_manager: RwLock<Option<Arc<ConnectionManager>>>,
    /// Network Client para modo Satellite
    network_client: RwLock<Option<Arc<NetworkClient>>>,
    /// Cliente de sync cloud
    sync_client: RwLock<Option<Arc<SyncClient>>>,
    /// Chave de licença
    license_key: RwLock<Option<String>>,
    /// Hardware ID
    hardware_id: RwLock<Option<String>>,
    /// Canal de eventos
    event_tx: broadcast::Sender<SyncOrchestratorEvent>,
    /// Flag de shutdown
    shutdown_flag: RwLock<bool>,
}

impl SyncOrchestrator {
    /// Cria novo orchestrator
    pub fn new(pool: SqlitePool, config: SyncOrchestratorConfig) -> Arc<Self> {
        let (event_tx, _) = broadcast::channel(64);
        Arc::new(Self {
            pool,
            config: RwLock::new(config),
            status: RwLock::new(SyncStatus::Idle),
            stats: RwLock::new(SyncOrchestratorStats::default()),
            connection_manager: RwLock::new(None),
            network_client: RwLock::new(None),
            sync_client: RwLock::new(None),
            license_key: RwLock::new(None),
            hardware_id: RwLock::new(None),
            event_tx,
            shutdown_flag: RwLock::new(false),
        })
    }

    /// Cria com configuração padrão
    pub fn with_defaults(pool: SqlitePool) -> Arc<Self> {
        Self::new(pool, SyncOrchestratorConfig::default())
    }

    /// Configura cliente cloud
    pub async fn set_cloud_client(
        &self,
        sync_client: Arc<SyncClient>,
        license_key: String,
        hardware_id: String,
    ) {
        *self.license_key.write().await = Some(license_key);
        *self.hardware_id.write().await = Some(hardware_id);
        *self.sync_client.write().await = Some(sync_client);
    }

    /// Configura connection manager para LAN
    pub async fn set_connection_manager(&self, manager: Arc<ConnectionManager>) {
        *self.connection_manager.write().await = Some(manager);
    }

    /// Configura network client para modo Satellite
    pub async fn set_network_client(&self, client: Arc<NetworkClient>) {
        *self.network_client.write().await = Some(client);
    }

    /// Subscreve para eventos
    pub fn subscribe(&self) -> broadcast::Receiver<SyncOrchestratorEvent> {
        self.event_tx.subscribe()
    }

    /// Obtém status atual
    pub async fn get_status(&self) -> SyncStatus {
        *self.status.read().await
    }

    /// Obtém estatísticas
    pub async fn get_stats(&self) -> SyncOrchestratorStats {
        let mut stats = self.stats.read().await.clone();

        // Atualizar pending count
        let pending_repo = SyncPendingRepository::new(&self.pool);
        if let Ok(count) = pending_repo.count_pending().await {
            stats.pending_push = count;
        }

        stats
    }

    /// Executa sync completo (cloud + LAN se disponível)
    pub async fn sync_all(&self) -> Result<Vec<SyncOperationResult>, String> {
        let config = self.config.read().await.clone();
        let mut results = Vec::new();

        // Atualizar status
        *self.status.write().await = SyncStatus::Syncing;

        // Ordem de sync baseada na prioridade
        if config.cloud_priority {
            // Cloud primeiro
            if config.cloud_enabled {
                if let Ok(result) = self.sync_cloud().await {
                    results.push(result);
                }
            }
            if config.lan_enabled {
                if let Ok(result) = self.sync_lan().await {
                    results.push(result);
                }
            }
        } else {
            // LAN primeiro
            if config.lan_enabled {
                if let Ok(result) = self.sync_lan().await {
                    results.push(result);
                }
            }
            if config.cloud_enabled {
                if let Ok(result) = self.sync_cloud().await {
                    results.push(result);
                }
            }
        }

        // Atualizar status
        let has_errors = results.iter().any(|r| !r.success);
        *self.status.write().await = if has_errors {
            SyncStatus::Error
        } else {
            SyncStatus::Completed
        };

        // Atualizar stats
        {
            let mut stats = self.stats.write().await;
            stats.total_syncs += 1;
            if !has_errors {
                stats.successful_syncs += 1;
            } else {
                stats.failed_syncs += 1;
            }
        }

        Ok(results)
    }

    /// Sync apenas com cloud
    pub async fn sync_cloud(&self) -> Result<SyncOperationResult, String> {
        let start = Instant::now();
        self.emit_event(SyncOrchestratorEvent::SyncStarted {
            source: SyncSource::Cloud,
        });

        let license_key = self
            .license_key
            .read()
            .await
            .clone()
            .ok_or("Licença não configurada")?;
        let hardware_id = self
            .hardware_id
            .read()
            .await
            .clone()
            .ok_or("Hardware ID não configurado")?;

        // Verificar se sync_client está disponível
        let sync_client_guard = self.sync_client.read().await;
        let sync_client = sync_client_guard
            .as_ref()
            .ok_or("Cliente de sync não configurado")?
            .clone();
        drop(sync_client_guard);

        let mut conflicts = 0;
        let mut errors = Vec::new();

        // 1. PUSH - Enviar alterações pendentes
        let pending_repo = SyncPendingRepository::new(&self.pool);
        let all_types = vec![
            SyncEntityType::Product,
            SyncEntityType::Category,
            SyncEntityType::Supplier,
            SyncEntityType::Customer,
            SyncEntityType::Employee,
            SyncEntityType::Setting,
        ];

        let pushed = match pending_repo.get_pending_as_sync_items(&all_types).await {
            Ok(items) if !items.is_empty() => {
                // HIGH-003 FIX: Split items into chunks of 100 to respect server limit
                let total_items = items.len();
                let chunks_count = total_items.div_ceil(MAX_SYNC_CHUNK_SIZE);

                info!(
                    "[SyncOrchestrator] Pushing {} items em {} chunks (max {} por chunk)",
                    total_items, chunks_count, MAX_SYNC_CHUNK_SIZE
                );

                let mut total_pushed = 0;

                for (chunk_idx, chunk) in items.chunks(MAX_SYNC_CHUNK_SIZE).enumerate() {
                    info!(
                        "[SyncOrchestrator] Enviando chunk {} de {} ({} items)",
                        chunk_idx + 1,
                        chunks_count,
                        chunk.len()
                    );

                    match sync_client
                        .push(&license_key, &hardware_id, chunk.to_vec())
                        .await
                    {
                        Ok(response) => {
                            total_pushed += response.processed;
                            info!(
                                "[SyncOrchestrator] Chunk {} processado: {} items",
                                chunk_idx + 1,
                                response.processed
                            );

                            for result in &response.results {
                                if result.status == SyncItemStatus::Ok {
                                    let _ = pending_repo
                                        .remove_synced(result.entity_type, &result.entity_id)
                                        .await;
                                } else if result.status == SyncItemStatus::Conflict {
                                    conflicts += 1;
                                }
                            }
                        }
                        Err(e) => {
                            error!(
                                "[SyncOrchestrator] Chunk {} falhou: {} (chunk de {} items)",
                                chunk_idx + 1,
                                e,
                                chunk.len()
                            );
                            errors.push(format!(
                                "Push chunk {} falhou: {} (chunk de {} items)",
                                chunk_idx + 1,
                                e,
                                chunk.len()
                            ));
                            // Continue with remaining chunks instead of failing completely
                        }
                    }
                }

                info!(
                    "[SyncOrchestrator] Push concluído: {} de {} items processados",
                    total_pushed, total_items
                );
                total_pushed
            }
            Ok(_) => 0, // Nada pendente
            Err(e) => {
                errors.push(format!("Erro ao obter pendências: {}", e));
                0
            }
        };

        // 2. PULL - Receber alterações do servidor
        let pulled = match sync_client
            .pull(&license_key, &hardware_id, all_types.clone(), 100)
            .await
        {
            Ok(response) => {
                let count = response.items.len();
                if let Err(e) = self.apply_pulled_items(&response.items).await {
                    errors.push(format!("Erro ao aplicar items: {}", e));
                }
                count
            }
            Err(e) => {
                errors.push(format!("Pull falhou: {}", e));
                0
            }
        };

        let result = SyncOperationResult {
            source: SyncSource::Cloud,
            success: errors.is_empty(),
            pushed,
            pulled,
            conflicts,
            resolved: 0,
            errors: errors.clone(),
            duration_ms: start.elapsed().as_millis() as u64,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        // Atualizar last sync
        {
            let mut stats = self.stats.write().await;
            stats.last_cloud_sync = Some(chrono::Utc::now().to_rfc3339());
            stats.total_conflicts += conflicts as u64;
        }

        self.emit_event(SyncOrchestratorEvent::SyncCompleted {
            result: result.clone(),
        });

        if errors.is_empty() {
            Ok(result)
        } else {
            Err(errors.join("; "))
        }
    }

    /// Sync com rede local (Master ou peers)
    pub async fn sync_lan(&self) -> Result<SyncOperationResult, String> {
        let start = Instant::now();
        self.emit_event(SyncOrchestratorEvent::SyncStarted {
            source: SyncSource::Lan,
        });

        // Verificar se connection manager está disponível
        let cm_guard = self.connection_manager.read().await;
        let connection_manager = match cm_guard.as_ref() {
            Some(cm) => cm.clone(),
            None => {
                // Connection Manager não configurado - retorna sucesso vazio
                // Isso é normal quando o usuário está em modo Standalone
                tracing::debug!("Sync LAN ignorado: Connection Manager não configurado");
                return Ok(SyncOperationResult {
                    source: SyncSource::Lan,
                    success: true,
                    pushed: 0,
                    pulled: 0,
                    conflicts: 0,
                    resolved: 0,
                    errors: vec![],
                    duration_ms: start.elapsed().as_millis() as u64,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                });
            }
        };
        drop(cm_guard);

        let mode = connection_manager.get_mode().await;
        let peers = connection_manager.get_peers().await;

        let mut pushed = 0;
        let pulled = 0;
        let mut errors = Vec::new();

        match mode {
            OperationMode::Standalone => {
                // Standalone não sincroniza via LAN
                return Ok(SyncOperationResult {
                    source: SyncSource::Lan,
                    success: true,
                    pushed: 0,
                    pulled: 0,
                    conflicts: 0,
                    resolved: 0,
                    errors: vec![],
                    duration_ms: start.elapsed().as_millis() as u64,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                });
            }
            OperationMode::Satellite => {
                // Satellite sincroniza com Master
                let master = peers
                    .iter()
                    .find(|p| p.is_master && p.status == PeerStatus::Connected);

                if master.is_some() {
                    // Verificar se NetworkClient está disponível
                    let nc_guard = self.network_client.read().await;
                    if let Some(ref network_client) = *nc_guard {
                        // Consumir fila sync_pending e enviar ao Master
                        let pending_repo = SyncPendingRepository::new(&self.pool);
                        match pending_repo.get_all_pending().await {
                            Ok(pending_items) if !pending_items.is_empty() => {
                                tracing::info!(
                                    "🔄 Sync LAN: {} itens pendentes para enviar ao Master",
                                    pending_items.len()
                                );

                                for item in &pending_items {
                                    // Converter para JSON e enviar via push_update
                                    if let Some(ref data_str) = item.data {
                                        if let Ok(data) =
                                            serde_json::from_str::<serde_json::Value>(data_str)
                                        {
                                            match network_client
                                                .push_update(&item.entity_type, data)
                                                .await
                                            {
                                                Ok(_) => {
                                                    pushed += 1;
                                                    // Remover item da fila após sucesso
                                                    if let Some(entity_type) =
                                                        string_to_sync_entity_type(
                                                            &item.entity_type,
                                                        )
                                                    {
                                                        let _ = pending_repo
                                                            .remove_synced(
                                                                entity_type,
                                                                &item.entity_id,
                                                            )
                                                            .await;
                                                    }
                                                }
                                                Err(e) => {
                                                    tracing::warn!(
                                                        "Falha ao enviar {} {}: {}",
                                                        item.entity_type,
                                                        item.entity_id,
                                                        e
                                                    );
                                                    errors.push(format!(
                                                        "Push {} falhou: {}",
                                                        item.entity_id, e
                                                    ));
                                                }
                                            }
                                        }
                                    }
                                }

                                tracing::info!("✅ Sync LAN: {} itens enviados ao Master", pushed);
                            }
                            Ok(_) => {
                                tracing::debug!("✅ Sync LAN: nenhum item pendente");
                            }
                            Err(e) => {
                                errors.push(format!("Erro ao ler sync_pending: {}", e));
                            }
                        }
                    } else {
                        tracing::debug!("NetworkClient não configurado - forçando sync via network_client.force_sync");
                    }
                } else {
                    errors.push("Master não conectado".to_string());
                }
            }
            OperationMode::Master | OperationMode::Hybrid => {
                // Master/Hybrid recebe syncs dos satellites
                // Não precisa fazer push ativo
                let online_peers = peers
                    .iter()
                    .filter(|p| p.status == PeerStatus::Online)
                    .count();
                tracing::info!("📡 Master com {} peers online", online_peers);
            }
        }

        let result = SyncOperationResult {
            source: SyncSource::Lan,
            success: errors.is_empty(),
            pushed,
            pulled,
            conflicts: 0,
            resolved: 0,
            errors: errors.clone(),
            duration_ms: start.elapsed().as_millis() as u64,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        // Atualizar last sync
        {
            let mut stats = self.stats.write().await;
            stats.last_lan_sync = Some(chrono::Utc::now().to_rfc3339());
        }

        self.emit_event(SyncOrchestratorEvent::SyncCompleted {
            result: result.clone(),
        });

        if errors.is_empty() {
            Ok(result)
        } else {
            Err(errors.join("; "))
        }
    }

    /// Aplica items recebidos do pull
    async fn apply_pulled_items(
        &self,
        items: &[crate::license::SyncPullItem],
    ) -> Result<(), String> {
        for item in items {
            let result = match item.entity_type {
                SyncEntityType::Product => {
                    let repo = ProductRepository::new(&self.pool);
                    if item.operation == SyncOperation::Delete {
                        repo.hard_delete(&item.entity_id).await.map(|_| ())
                    } else if let Ok(product) = serde_json::from_value::<Product>(item.data.clone())
                    {
                        repo.upsert_from_sync(product).await.map(|_| ())
                    } else {
                        Err(crate::error::AppError::Validation(
                            "Deserialize failed".into(),
                        ))
                    }
                }
                SyncEntityType::Category => {
                    let repo = CategoryRepository::new(&self.pool);
                    if item.operation == SyncOperation::Delete {
                        repo.delete(&item.entity_id).await.map(|_| ())
                    } else if let Ok(category) =
                        serde_json::from_value::<Category>(item.data.clone())
                    {
                        repo.upsert_from_sync(category).await.map(|_| ())
                    } else {
                        Err(crate::error::AppError::Validation(
                            "Deserialize failed".into(),
                        ))
                    }
                }
                SyncEntityType::Supplier => {
                    let repo = SupplierRepository::new(&self.pool);
                    if item.operation == SyncOperation::Delete {
                        repo.delete(&item.entity_id).await.map(|_| ())
                    } else if let Ok(supplier) =
                        serde_json::from_value::<Supplier>(item.data.clone())
                    {
                        repo.upsert_from_sync(supplier).await.map(|_| ())
                    } else {
                        Err(crate::error::AppError::Validation(
                            "Deserialize failed".into(),
                        ))
                    }
                }
                SyncEntityType::Customer => {
                    let repo = CustomerRepository::new(&self.pool);
                    if item.operation == SyncOperation::Delete {
                        repo.deactivate(&item.entity_id).await.map(|_| ())
                    } else if let Ok(customer) =
                        serde_json::from_value::<Customer>(item.data.clone())
                    {
                        repo.upsert_from_sync(customer).await.map(|_| ())
                    } else {
                        Err(crate::error::AppError::Validation(
                            "Deserialize failed".into(),
                        ))
                    }
                }
                SyncEntityType::Employee => {
                    let repo = EmployeeRepository::new(&self.pool);
                    if item.operation == SyncOperation::Delete {
                        repo.deactivate(&item.entity_id).await.map(|_| ())
                    } else if let Ok(employee) =
                        serde_json::from_value::<Employee>(item.data.clone())
                    {
                        repo.upsert_from_sync(employee).await.map(|_| ())
                    } else {
                        Err(crate::error::AppError::Validation(
                            "Deserialize failed".into(),
                        ))
                    }
                }
                SyncEntityType::Setting => {
                    let repo = SettingsRepository::new(&self.pool);
                    if item.operation == SyncOperation::Delete {
                        repo.delete(&item.entity_id).await.map(|_| ())
                    } else if let Ok(setting) = serde_json::from_value::<Setting>(item.data.clone())
                    {
                        repo.upsert_from_sync(setting).await.map(|_| ())
                    } else {
                        Err(crate::error::AppError::Validation(
                            "Deserialize failed".into(),
                        ))
                    }
                }
            };

            if let Err(e) = result {
                tracing::warn!(
                    "Sync: failed to apply {:?} {}: {}",
                    item.entity_type,
                    item.entity_id,
                    e
                );
            }
        }

        Ok(())
    }

    /// Inicia auto-sync em background
    pub async fn start_auto_sync(self: &Arc<Self>) {
        // Reset shutdown flag
        *self.shutdown_flag.write().await = false;

        let orchestrator = Arc::clone(self);
        tokio::spawn(async move {
            orchestrator.auto_sync_loop().await;
        });

        tracing::info!("✅ Auto-sync iniciado");
    }

    /// Loop de auto-sync
    async fn auto_sync_loop(&self) {
        let config = self.config.read().await.clone();
        let interval_secs = config.auto_sync_interval_secs;

        let mut interval = tokio::time::interval(Duration::from_secs(interval_secs));

        loop {
            interval.tick().await;

            // Verificar shutdown
            if *self.shutdown_flag.read().await {
                tracing::info!("Auto-sync loop encerrado");
                break;
            }

            // Executar sync
            tracing::info!("🔄 Auto-sync iniciado...");
            match self.sync_all().await {
                Ok(results) => {
                    let total_pushed: usize = results.iter().map(|r| r.pushed).sum();
                    let total_pulled: usize = results.iter().map(|r| r.pulled).sum();
                    tracing::info!(
                        "✅ Auto-sync completo: {} enviados, {} recebidos",
                        total_pushed,
                        total_pulled
                    );
                }
                Err(e) => {
                    tracing::warn!("⚠️ Auto-sync falhou: {}", e);
                }
            }
        }
    }

    /// Para o auto-sync
    pub async fn stop_auto_sync(&self) {
        *self.shutdown_flag.write().await = true;
    }

    /// Emite evento
    fn emit_event(&self, event: SyncOrchestratorEvent) {
        let _ = self.event_tx.send(event);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/// Converte string para SyncEntityType
fn string_to_sync_entity_type(s: &str) -> Option<SyncEntityType> {
    match s {
        "product" => Some(SyncEntityType::Product),
        "category" => Some(SyncEntityType::Category),
        "supplier" => Some(SyncEntityType::Supplier),
        "customer" => Some(SyncEntityType::Customer),
        "employee" => Some(SyncEntityType::Employee),
        "setting" => Some(SyncEntityType::Setting),
        _ => None,
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = SyncOrchestratorConfig::default();
        assert_eq!(config.auto_sync_interval_secs, 300);
        assert!(config.cloud_enabled);
        assert!(config.lan_enabled);
        assert!(config.cloud_priority);
    }
}
