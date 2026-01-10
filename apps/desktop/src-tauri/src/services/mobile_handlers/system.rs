//! Handler de sistema
//!
//! Processa ações: system.ping, system.info

use crate::services::mobile_protocol::MobileResponse;
use sysinfo::System;

/// Informações do sistema Desktop
#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemInfo {
    /// Nome do PDV
    pub pdv_name: String,
    /// Versão do app
    pub version: String,
    /// Nome da loja
    pub store_name: String,
    /// CNPJ da loja
    pub store_document: Option<String>,
    /// Horário do servidor
    pub server_time: chrono::DateTime<chrono::Utc>,
    /// Uptime em segundos
    pub uptime_secs: u64,
    /// Uso de CPU
    pub cpu_usage: f32,
    /// Uso de memória
    pub memory_usage: MemoryInfo,
    /// Recursos disponíveis
    pub features: Vec<String>,
}

/// Informações de memória
#[derive(Debug, Clone, serde::Serialize)]
pub struct MemoryInfo {
    pub total_mb: u64,
    pub used_mb: u64,
    pub free_mb: u64,
    pub percent: f32,
}

/// Handler de sistema
pub struct SystemHandler {
    start_time: std::time::Instant,
    pdv_name: String,
    store_name: String,
    store_document: Option<String>,
}

impl SystemHandler {
    /// Cria novo handler
    pub fn new(pdv_name: String, store_name: String, store_document: Option<String>) -> Self {
        Self {
            start_time: std::time::Instant::now(),
            pdv_name,
            store_name,
            store_document,
        }
    }

    /// Responde ping com pong
    pub fn ping(&self, id: u64) -> MobileResponse {
        MobileResponse::success(
            id,
            serde_json::json!({
                "pong": true,
                "timestamp": chrono::Utc::now(),
                "latency": 0
            }),
        )
    }

    /// Retorna informações do sistema
    pub fn info(&self, id: u64) -> MobileResponse {
        let mut sys = System::new_all();
        sys.refresh_all();

        let total_memory = sys.total_memory() / 1024 / 1024;
        let used_memory = sys.used_memory() / 1024 / 1024;
        let free_memory = total_memory - used_memory;

        let memory_percent = if total_memory > 0 {
            (used_memory as f32 / total_memory as f32) * 100.0
        } else {
            0.0
        };

        let cpu_usage = sys.global_cpu_usage();

        let info = SystemInfo {
            pdv_name: self.pdv_name.clone(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            store_name: self.store_name.clone(),
            store_document: self.store_document.clone(),
            server_time: chrono::Utc::now(),
            uptime_secs: self.start_time.elapsed().as_secs(),
            cpu_usage,
            memory_usage: MemoryInfo {
                total_mb: total_memory,
                used_mb: used_memory,
                free_mb: free_memory,
                percent: memory_percent,
            },
            features: vec![
                "products".to_string(),
                "stock".to_string(),
                "inventory".to_string(),
                "expiration".to_string(),
                "categories".to_string(),
                "scanner".to_string(),
            ],
        };

        MobileResponse::success(id, serde_json::to_value(info).unwrap())
    }

    /// Retorna status de conexão com serviços
    pub async fn status(&self, id: u64) -> MobileResponse {
        // Verificar conectividade com banco
        let db_status = "connected"; // TODO: verificar real

        // Verificar periféricos
        let printer_status = "unknown";
        let scanner_status = "unknown";

        MobileResponse::success(
            id,
            serde_json::json!({
                "database": db_status,
                "printer": printer_status,
                "scanner": scanner_status,
                "timestamp": chrono::Utc::now()
            }),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ping() {
        let handler = SystemHandler::new(
            "PDV-01".to_string(),
            "Mercearia Teste".to_string(),
            Some("12.345.678/0001-90".to_string()),
        );

        let response = handler.ping(1);
        assert!(response.success);
    }

    #[test]
    fn test_info() {
        let handler = SystemHandler::new("PDV-01".to_string(), "Mercearia Teste".to_string(), None);

        let response = handler.info(2);
        assert!(response.success);

        let data = response.data.unwrap();
        assert_eq!(data["pdv_name"], "PDV-01");
        assert_eq!(data["store_name"], "Mercearia Teste");
    }
}
