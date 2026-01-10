//! Módulo de Gaveta de Dinheiro
//!
//! Controle de gaveta via impressora térmica (pulso RJ11)

use super::{HardwareError, HardwareResult};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::time::Duration;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Configuração da gaveta
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawerConfig {
    pub enabled: bool,
    /// Porta da impressora conectada à gaveta
    pub printer_port: String,
    /// Pino de acionamento (2 ou 5)
    pub pin: DrawerPin,
    /// Duração do pulso em ms
    pub pulse_duration: u16,
}

/// Pino de acionamento da gaveta
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum DrawerPin {
    Pin2,
    Pin5,
}

impl Default for DrawerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            printer_port: String::new(),
            pin: DrawerPin::Pin2,
            pulse_duration: 200,
        }
    }
}

/// Status da gaveta
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawerStatus {
    pub is_open: bool,
    pub last_opened: Option<String>,
    pub open_count_today: u32,
}

// ════════════════════════════════════════════════════════════════════════════
// COMANDOS ESC/POS PARA GAVETA
// ════════════════════════════════════════════════════════════════════════════

/// Comandos ESC/POS para gaveta de dinheiro
mod escpos {
    pub const ESC: u8 = 0x1B;

    /// Gera comando para abrir gaveta
    /// ESC p m t1 t2
    /// m = pino (0 = pino 2, 1 = pino 5)
    /// t1 = tempo ON (t1 × 2ms)
    /// t2 = tempo OFF (t2 × 2ms)
    pub fn open_drawer_cmd(pin: super::DrawerPin, duration_ms: u16) -> [u8; 5] {
        let pin_byte = match pin {
            super::DrawerPin::Pin2 => 0x00,
            super::DrawerPin::Pin5 => 0x01,
        };

        // Converte ms para unidades de 2ms
        let t1 = ((duration_ms / 2).min(255)) as u8;
        let t2 = 0xFA; // Tempo OFF padrão (500ms)

        [ESC, b'p', pin_byte, t1, t2]
    }
}

// ════════════════════════════════════════════════════════════════════════════
// GAVETA
// ════════════════════════════════════════════════════════════════════════════

/// Interface da gaveta de dinheiro
pub struct CashDrawer {
    config: DrawerConfig,
}

impl CashDrawer {
    /// Cria nova instância da gaveta
    pub fn new(config: DrawerConfig) -> Self {
        Self { config }
    }

    /// Atualiza configuração
    pub fn set_config(&mut self, config: DrawerConfig) {
        self.config = config;
    }

    /// Verifica se a gaveta está habilitada
    pub fn is_enabled(&self) -> bool {
        self.config.enabled && !self.config.printer_port.is_empty()
    }

    /// Abre a gaveta via porta serial
    pub fn open(&self) -> HardwareResult<()> {
        if !self.is_enabled() {
            return Ok(());
        }

        let cmd = escpos::open_drawer_cmd(self.config.pin, self.config.pulse_duration);

        let mut port = serialport::new(&self.config.printer_port, 9600)
            .timeout(Duration::from_millis(1000))
            .open()
            .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;

        port.write_all(&cmd).map_err(HardwareError::IoError)?;

        port.flush().map_err(HardwareError::IoError)?;

        Ok(())
    }

    /// Abre a gaveta via rede (impressora em rede)
    pub async fn open_network(&self, address: &str) -> HardwareResult<()> {
        if !self.config.enabled {
            return Ok(());
        }

        use tokio::io::AsyncWriteExt;
        use tokio::net::TcpStream;

        let cmd = escpos::open_drawer_cmd(self.config.pin, self.config.pulse_duration);

        let mut stream = TcpStream::connect(address)
            .await
            .map_err(|e| HardwareError::CommunicationError(e.to_string()))?;

        stream
            .write_all(&cmd)
            .await
            .map_err(HardwareError::IoError)?;

        Ok(())
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_drawer_command_pin2() {
        let cmd = escpos::open_drawer_cmd(DrawerPin::Pin2, 200);
        assert_eq!(cmd[0], 0x1B); // ESC
        assert_eq!(cmd[1], b'p');
        assert_eq!(cmd[2], 0x00); // Pin 2
        assert_eq!(cmd[3], 100); // 200ms / 2
    }

    #[test]
    fn test_drawer_command_pin5() {
        let cmd = escpos::open_drawer_cmd(DrawerPin::Pin5, 100);
        assert_eq!(cmd[2], 0x01); // Pin 5
        assert_eq!(cmd[3], 50); // 100ms / 2
    }

    #[test]
    fn test_drawer_disabled() {
        let config = DrawerConfig::default();
        let drawer = CashDrawer::new(config);

        assert!(!drawer.is_enabled());
        assert!(drawer.open().is_ok()); // Não deve falhar quando desabilitado
    }
}
