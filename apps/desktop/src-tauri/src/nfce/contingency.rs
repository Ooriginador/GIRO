// ═══════════════════════════════════════════════════════════════════════════
// GERENCIADOR DE CONTINGÊNCIA NFC-e
// ═══════════════════════════════════════════════════════════════════════════
//! Gerencia o modo emissão offline (tpEmis = 9).
//! Responsável por salvar as notas não transmitidas e gerenciar a fila de envio.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineNote {
    pub access_key: String,
    pub xml: String,
    pub created_at: String,
    pub status: String, // "PENDING", "TRANSMITTED", "ERROR"
}

pub struct ContingencyManager {
    storage_path: PathBuf,
}

impl ContingencyManager {
    pub fn new(app_handle: &AppHandle) -> Self {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data dir");

        let storage_path = app_dir.join("nfce_contingency");

        if !storage_path.exists() {
            fs::create_dir_all(&storage_path).expect("Failed to create contingency dir");
        }

        Self { storage_path }
    }

    /// Salva uma nota emitida em contingência para envio posterior
    pub fn save_note(&self, access_key: &str, signed_xml: &str) -> Result<(), String> {
        let note = OfflineNote {
            access_key: access_key.to_string(),
            xml: signed_xml.to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            status: "PENDING".to_string(),
        };

        let file_name = format!("{}.json", access_key);
        let file_path = self.storage_path.join(file_name);

        let json = serde_json::to_string_pretty(&note).map_err(|e| e.to_string())?;
        fs::write(file_path, json).map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Lista todas as notas pendentes de transmissão
    pub fn list_pending_notes(&self) -> Result<Vec<OfflineNote>, String> {
        let mut notes = Vec::new();

        let entries = fs::read_dir(&self.storage_path).map_err(|e| e.to_string())?;

        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
                let note: OfflineNote =
                    serde_json::from_str(&content).map_err(|e| e.to_string())?;

                if note.status == "PENDING" {
                    notes.push(note);
                }
            }
        }

        Ok(notes)
    }

    /// Marca uma nota como transmitida (move para histórico ou deleta)
    pub fn mark_as_transmitted(&self, access_key: &str) -> Result<(), String> {
        let file_name = format!("{}.json", access_key);
        let file_path = self.storage_path.join(&file_name);

        if file_path.exists() {
            // Em um sistema real, moveríamos para uma pasta "transmitted"
            // Por enquanto, vamos remover da fila de pendentes
            fs::remove_file(file_path).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    /// Retorna o caminho absoluto do diretório de contingência
    pub fn get_storage_path(&self) -> PathBuf {
        self.storage_path.clone()
    }
}
