use serde::{Deserialize, Serialize};

/// Resultado simples de verificação de saúde de um dispositivo de hardware
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct HardwareStatus {
    pub name: String,
    pub ok: bool,
    pub message: Option<String>,
}

/// Trait de abstração para dispositivos de hardware
pub trait HardwareDevice {
    /// Inicializa o dispositivo (opcional)
    fn initialize(&self) -> Result<HardwareStatus, String> {
        Ok(HardwareStatus {
            name: "unknown".to_string(),
            ok: true,
            message: Some("initialized by default".to_string()),
        })
    }

    /// Encerra/Desliga o dispositivo (opcional)
    fn shutdown(&self) -> Result<HardwareStatus, String> {
        Ok(HardwareStatus {
            name: "unknown".to_string(),
            ok: true,
            message: Some("shutdown by default".to_string()),
        })
    }

    /// Verifica saúde do dispositivo
    fn health_check(&self) -> Result<HardwareStatus, String>;
}
