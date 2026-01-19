//! Testes para o módulo de rede (network.rs)
//!
//! Testa os comandos de rede e o cliente de sincronização.

#[cfg(test)]
mod tests {
    use crate::commands::network::{NetworkState, NetworkStatus};
    use crate::services::network_client::ConnectionState;

    #[test]
    fn test_network_status_serialization() {
        let status = NetworkStatus {
            is_running: true,
            status: "Connected".to_string(),
            connected_master: Some("192.168.1.100:9876".to_string()),
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("isRunning"));
        assert!(json.contains("connectedMaster"));
        assert!(json.contains("192.168.1.100:9876"));
    }

    #[test]
    fn test_network_status_stopped() {
        let status = NetworkStatus {
            is_running: false,
            status: "Stopped".to_string(),
            connected_master: None,
        };

        assert!(!status.is_running);
        assert_eq!(status.status, "Stopped");
        assert!(status.connected_master.is_none());
    }

    #[test]
    fn test_network_state_default() {
        let state = NetworkState::default();
        assert!(state.client.is_none());
    }

    #[test]
    fn test_connection_state_equality() {
        assert_eq!(ConnectionState::Disconnected, ConnectionState::Disconnected);
        assert_eq!(ConnectionState::Searching, ConnectionState::Searching);

        let addr = "192.168.1.100:9876".to_string();
        assert_eq!(
            ConnectionState::Connected(addr.clone()),
            ConnectionState::Connected(addr)
        );
    }

    #[test]
    fn test_connection_state_variants() {
        let disconnected = ConnectionState::Disconnected;
        let searching = ConnectionState::Searching;
        let connecting = ConnectionState::Connecting("192.168.1.100:9876".to_string());
        let connected = ConnectionState::Connected("192.168.1.100:9876".to_string());

        // Test pattern matching
        match disconnected {
            ConnectionState::Disconnected => (),
            _ => panic!("Expected Disconnected"),
        }

        match searching {
            ConnectionState::Searching => (),
            _ => panic!("Expected Searching"),
        }

        match connecting {
            ConnectionState::Connecting(addr) => {
                assert_eq!(addr, "192.168.1.100:9876");
            }
            _ => panic!("Expected Connecting"),
        }

        match connected {
            ConnectionState::Connected(addr) => {
                assert_eq!(addr, "192.168.1.100:9876");
            }
            _ => panic!("Expected Connected"),
        }
    }
}
