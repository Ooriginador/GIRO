//! Comandos Tauri para Rede (PC-to-PC)
//!
//! Gerencia o cliente de rede para modo satélite.

use crate::error::{AppError, AppResult};
use crate::services::network_client::{ConnectionState, NetworkClient};
use crate::AppState;
use mdns_sd::{ServiceDaemon, ServiceEvent};
use serde::Serialize;
use std::sync::Arc;
use std::time::Duration;
use tauri::State;
use tokio::sync::RwLock;
use tokio::time::sleep;

/// Status da rede
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkStatus {
    pub is_running: bool,
    pub status: String,
    pub connected_master: Option<String>,
}

/// Master encontrado na rede
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredMaster {
    /// Nome da instância (ex: "GIRO Desktop - Loja X")
    pub name: String,
    /// Endereço IP
    pub ip: String,
    /// Porta
    pub port: u16,
    /// Versão do GIRO
    pub version: Option<String>,
    /// Nome da loja (se configurado)
    pub store_name: Option<String>,
}

/// Estado do cliente de rede
#[derive(Default)]
pub struct NetworkState {
    pub client: Option<Arc<NetworkClient>>,
}

/// Inicia o cliente de rede (modo satélite) - requer autenticação
#[tauri::command]
#[specta::specta]
pub async fn start_network_client(
    terminal_name: String,
    app_handle: tauri::AppHandle,
    app_state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    start_network_client_internal(terminal_name, app_handle, app_state.pool(), &network_state).await
}

/// Versão interna sem verificação de autenticação (para auto-start no setup)
pub async fn start_network_client_internal(
    terminal_name: String,
    app_handle: tauri::AppHandle,
    pool: &sqlx::SqlitePool,
    network_state: &RwLock<NetworkState>,
) -> AppResult<()> {
    let mut state = network_state.write().await;

    if state.client.is_some() {
        return Err(AppError::Validation(
            "Cliente de rede já está rodando".into(),
        ));
    }

    let client = NetworkClient::new(pool.clone(), terminal_name, app_handle);

    // Iniciar
    client.start();

    state.client = Some(client);
    tracing::info!("Cliente de rede iniciado");
    Ok(())
}

/// Para o cliente de rede
#[tauri::command]
#[specta::specta]
pub async fn stop_network_client(
    network_state: State<'_, RwLock<NetworkState>>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let mut state = network_state.write().await;

    if let Some(client) = state.client.take() {
        client.stop().await;
    }

    tracing::info!("Cliente de rede parado");
    Ok(())
}

/// Obtém status da rede
#[tauri::command]
#[specta::specta]
pub async fn get_network_status(
    network_state: State<'_, RwLock<NetworkState>>,
    app_state: State<'_, AppState>,
) -> AppResult<NetworkStatus> {
    app_state.session.require_authenticated()?;
    let state = network_state.read().await;

    if let Some(ref client) = state.client {
        let conn_state = client.get_state().await;

        let (status, connected_master) = match conn_state {
            ConnectionState::Disconnected => ("Disconnected".into(), None),
            ConnectionState::Searching => ("Searching".into(), None),
            ConnectionState::Connecting(addr) => ("Connecting".into(), Some(addr)),
            ConnectionState::Connected(addr) => ("Connected".into(), Some(addr)),
        };

        Ok(NetworkStatus {
            is_running: true,
            status,
            connected_master,
        })
    } else {
        Ok(NetworkStatus {
            is_running: false,
            status: "Stopped".into(),
            connected_master: None,
        })
    }
}

/// Força sincronização imediata com o Master
#[tauri::command]
#[specta::specta]
pub async fn force_network_sync(
    network_state: State<'_, RwLock<NetworkState>>,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let state = network_state.read().await;

    if let Some(ref client) = state.client {
        client
            .force_sync()
            .await
            .map_err(|e| AppError::Network(e.to_string()))?;
        tracing::info!("Sincronização forçada iniciada");
        Ok(())
    } else {
        Err(AppError::Validation(
            "Cliente de rede não está rodando".into(),
        ))
    }
}

/// Escaneia a rede local em busca de Masters GIRO
///
/// Usado no setup inicial para detectar se já existe um GIRO Principal na rede.
/// Faz scan mDNS por até `timeout_secs` segundos.
#[tauri::command]
#[specta::specta]
pub async fn scan_network_for_masters(
    timeout_secs: Option<u64>,
) -> AppResult<Vec<DiscoveredMaster>> {
    let timeout = timeout_secs.unwrap_or(10);
    tracing::info!(
        "🔍 Escaneando rede por Masters GIRO (timeout: {}s)...",
        timeout
    );

    let mdns = match ServiceDaemon::new() {
        Ok(d) => d,
        Err(e) => {
            // mDNS pode falhar no Windows por firewall - não é erro crítico
            tracing::warn!(
                "⚠️ Descoberta automática indisponível: {}. O usuário pode configurar IP manualmente.", 
                e
            );
            // Retorna lista vazia ao invés de erro
            return Ok(vec![]);
        }
    };

    let receiver = match mdns.browse("_giro._tcp.local.") {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("⚠️ Falha ao buscar serviços mDNS: {}", e);
            return Ok(vec![]);
        }
    };

    let mut masters: Vec<DiscoveredMaster> = Vec::new();
    let timeout_duration = sleep(Duration::from_secs(timeout));
    tokio::pin!(timeout_duration);

    loop {
        tokio::select! {
            event = receiver.recv_async() => {
                if let Ok(ServiceEvent::ServiceResolved(info)) = event {
                    if let Some(ip) = info.get_addresses().iter().next() {
                        let ip_str = ip.to_string();
                        let port = info.get_port();
                        let name = info.get_fullname().to_string();

                        // Extrair propriedades TXT
                        let properties = info.get_properties();
                        let version = properties.get("version").map(|v| v.val_str().to_string());
                        let store_name = properties.get("store").map(|v| v.val_str().to_string());

                        // Evitar duplicatas
                        if !masters.iter().any(|m| m.ip == ip_str && m.port == port) {
                            tracing::info!("✅ Master encontrado: {} ({}:{})", name, ip_str, port);

                            masters.push(DiscoveredMaster {
                                name: name.replace("._giro._tcp.local.", ""),
                                ip: ip_str,
                                port,
                                version,
                                store_name,
                            });
                        }
                    }
                }
            }
            _ = &mut timeout_duration => {
                tracing::info!("⏰ Scan finalizado. {} Master(s) encontrado(s).", masters.len());
                break;
            }
        }
    }

    // Tentar parar o daemon graciosamente
    let _ = mdns.shutdown();

    Ok(masters)
}

/// Tenta conectar a um Master específico com senha
///
/// Usado no setup para testar a conexão antes de salvar as configurações.
#[tauri::command]
#[specta::specta]
pub async fn test_master_connection(ip: String, port: u16, secret: String) -> AppResult<bool> {
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::connect_async;
    use tokio_tungstenite::tungstenite::Message;

    let url = format!("ws://{}:{}/ws", ip, port);
    tracing::info!("🔌 Testando conexão com Master: {}", url);

    // Timeout de 10 segundos para conexão
    let connect_result = tokio::time::timeout(Duration::from_secs(10), connect_async(&url)).await;

    let (ws_stream, _) = match connect_result {
        Ok(Ok(stream)) => stream,
        Ok(Err(e)) => {
            tracing::warn!("❌ Falha ao conectar: {}", e);
            return Ok(false);
        }
        Err(_) => {
            tracing::warn!("❌ Timeout ao conectar");
            return Ok(false);
        }
    };

    let (mut write, mut read) = ws_stream.split();

    // Enviar autenticação
    let auth_msg = serde_json::json!({
        "type": "auth",
        "payload": {
            "deviceId": "setup-test",
            "deviceName": "Setup Wizard",
            "secret": secret
        }
    });

    if let Err(e) = write.send(Message::Text(auth_msg.to_string())).await {
        tracing::warn!("❌ Falha ao enviar auth: {}", e);
        return Ok(false);
    }

    // Aguardar resposta (timeout 5s)
    let response = tokio::time::timeout(Duration::from_secs(5), read.next()).await;

    match response {
        Ok(Some(Ok(Message::Text(text)))) => {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                let response_type = json.get("type").and_then(|t| t.as_str());
                let success = json
                    .get("success")
                    .and_then(|s| s.as_bool())
                    .unwrap_or(false);

                if response_type == Some("auth_response") && success {
                    tracing::info!("✅ Autenticação bem-sucedida!");
                    return Ok(true);
                } else {
                    let error = json
                        .get("error")
                        .and_then(|e| e.as_str())
                        .unwrap_or("Senha incorreta");
                    tracing::warn!("❌ Autenticação falhou: {}", error);
                    return Ok(false);
                }
            }
            Ok(false)
        }
        _ => {
            tracing::warn!("❌ Nenhuma resposta do Master");
            Ok(false)
        }
    }
}
