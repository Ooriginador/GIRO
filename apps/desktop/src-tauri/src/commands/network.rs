//! Comandos Tauri para Rede (PC-to-PC)
//!
//! Gerencia o cliente de rede para modo satélite.

use crate::error::{AppError, AppResult};
use crate::services::network_client::{ConnectionState, NetworkClient};
use crate::AppState;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Status da rede
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkStatus {
    pub is_running: bool,
    pub status: String,
    pub connected_master: Option<String>,
}

/// Estado do cliente de rede
#[derive(Default)]
pub struct NetworkState {
    pub client: Option<Arc<NetworkClient>>,
}

/// Inicia o cliente de rede (modo satélite)
#[tauri::command]
#[specta::specta]
pub async fn start_network_client(
    terminal_name: String,
    app_state: State<'_, AppState>,
    network_state: State<'_, RwLock<NetworkState>>,
) -> AppResult<()> {
    app_state.session.require_authenticated()?;
    let mut state = network_state.write().await;

    if state.client.is_some() {
        return Err(AppError::Validation(
            "Cliente de rede já está rodando".into(),
        ));
    }

    let client = NetworkClient::new(app_state.pool().clone(), terminal_name);

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
