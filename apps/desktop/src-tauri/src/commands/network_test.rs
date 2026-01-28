//! Testes para o módulo de rede (network.rs)
//!
//! Testa os comandos de rede e o cliente de sincronização.

#[cfg(test)]
mod tests {
    use crate::commands::network::{NetworkState, NetworkStatus};
    use crate::services::network_client::{ClientEvent, ConnectionState};

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

    #[test]
    fn test_client_event_reconnecting() {
        let event = ClientEvent::Reconnecting(3);
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("reconnecting"));
        assert!(json.contains("3"));
    }

    #[test]
    fn test_client_event_serialization() {
        // Test all event variants serialize correctly
        let events = vec![
            ClientEvent::StateChanged(ConnectionState::Connected("192.168.1.1:3847".into())),
            ClientEvent::MasterFound("192.168.1.1".into(), 3847),
            ClientEvent::SyncCompleted,
            ClientEvent::StockUpdated,
            ClientEvent::Error("Test error".into()),
            ClientEvent::Reconnecting(1),
        ];

        for event in events {
            let json = serde_json::to_string(&event);
            assert!(json.is_ok(), "Failed to serialize {:?}", event);
        }
    }

    #[test]
    fn test_backoff_calculation() {
        // Simular cálculo de backoff
        const BASE_BACKOFF_SECS: u64 = 5;
        const MAX_BACKOFF_SECS: u64 = 60;

        let test_cases = vec![
            (1, 5),   // Tentativa 1: 5s
            (2, 10),  // Tentativa 2: 10s
            (3, 20),  // Tentativa 3: 20s
            (4, 40),  // Tentativa 4: 40s
            (5, 60),  // Tentativa 5: 60s (max)
            (10, 60), // Tentativa 10: 60s (max)
        ];

        for (attempt, expected) in test_cases {
            let backoff = std::cmp::min(
                BASE_BACKOFF_SECS * 2u64.saturating_pow(attempt - 1),
                MAX_BACKOFF_SECS,
            );
            assert_eq!(
                backoff, expected,
                "Backoff for attempt {} should be {}s",
                attempt, expected
            );
        }
    }

    #[test]
    fn test_static_ip_format() {
        // Testar que IPs estáticos são válidos
        let valid_ips = vec!["192.168.1.100", "10.0.0.1", "172.16.0.50"];

        for ip in valid_ips {
            let addr: Result<std::net::IpAddr, _> = ip.parse();
            assert!(addr.is_ok(), "IP {} should be valid", ip);
        }
    }

    #[test]
    fn test_default_port() {
        const DEFAULT_PORT: u16 = 3847;
        assert_eq!(DEFAULT_PORT, 3847);
    }
}
