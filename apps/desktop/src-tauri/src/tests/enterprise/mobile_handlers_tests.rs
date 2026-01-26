//! Testes para Enterprise Mobile Handlers
//!
//! Cobre os handlers WebSocket:
//! - EnterpriseRequestHandler
//! - EnterpriseTransferHandler
//! - EnterpriseContextHandler

use super::*;
use crate::services::mobile_handlers::enterprise::{
    AddItemPayload, AddTransferItemPayload, ApproveRequestPayload, CreateRequestPayload,
    CreateTransferPayload, EnterpriseContextHandler, EnterpriseRequestHandler,
    EnterpriseTransferHandler, ReceiveTransferPayload, RejectRequestPayload, RequestListPayload,
    ShipTransferPayload, SubmitRequestPayload, TransferListPayload,
};
use crate::services::mobile_protocol::MobileErrorCode;
use serde_json::Value;

// =============================================================================
// SETUP HELPERS
// =============================================================================

/// Cria setup completo para testes enterprise
async fn enterprise_setup(pool: &Pool<Sqlite>) -> EnterpriseSetup {
    let contract_id = create_test_contract(pool).await;
    let source_location = create_test_location(pool, "ALMOXARIFADO").await;
    let destination_location = create_test_location(pool, "FRENTE_OBRA").await;
    let product_id = create_test_product(pool).await;
    let employee_id = create_test_employee(pool).await;
    let supervisor_id = create_test_supervisor(pool).await;

    // Cria estoque no local de origem
    create_stock_balance(pool, &source_location, &product_id, 100.0).await;

    EnterpriseSetup {
        contract_id,
        source_location,
        destination_location,
        product_id,
        employee_id,
        supervisor_id,
    }
}

struct EnterpriseSetup {
    contract_id: String,
    source_location: String,
    destination_location: String,
    product_id: String,
    employee_id: String,
    supervisor_id: String,
}

/// Cria produto de teste
async fn create_test_product(pool: &Pool<Sqlite>) -> String {
    let id = test_uuid();
    sqlx::query(
        r#"
        INSERT INTO Product (id, code, name, unit, salePrice, costPrice, isActive, createdAt, updatedAt)
        VALUES (?, 'PROD-001', 'Produto Teste', 'UN', 10.00, 8.00, 1, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .execute(pool)
    .await
    .expect("Failed to create product");
    id
}

/// Cria supervisor de teste
async fn create_test_supervisor(pool: &Pool<Sqlite>) -> String {
    let id = test_uuid();
    sqlx::query(
        r#"
        INSERT INTO employees (id, name, document, role, is_active, created_at, updated_at)
        VALUES (?, 'Supervisor Teste', '987.654.321-00', 'SUPERVISOR', 1, datetime('now'), datetime('now'))
        "#,
    )
    .bind(&id)
    .execute(pool)
    .await
    .expect("Failed to create supervisor");
    id
}

/// Extrai dados do MobileResponse
fn extract_response_data(response: &crate::services::mobile_protocol::MobileResponse) -> Value {
    serde_json::from_value(response.data.clone().unwrap_or(Value::Null)).unwrap_or(Value::Null)
}

// =============================================================================
// REQUEST HANDLER TESTS
// =============================================================================

mod request_handler_tests {
    use super::*;

    #[tokio::test]
    async fn test_list_requests_empty() {
        let pool = setup_test_db().await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        let payload = RequestListPayload {
            status: None,
            contract_id: None,
            limit: Some(10),
            page: Some(1),
        };

        let response = handler.list(1, payload, "emp1", "OPERATOR").await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["total"], 0);
        assert!(data["requests"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_create_request_success() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        let payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: Some("HIGH".to_string()),
            notes: Some("Requisição de teste".to_string()),
        };

        let response = handler.create(1, payload, &setup.employee_id).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["request"]["id"].is_string());
        assert_eq!(data["request"]["status"], "DRAFT");
    }

    #[tokio::test]
    async fn test_get_request_not_found() {
        let pool = setup_test_db().await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        let response = handler.get(1, "non-existent-id").await;

        assert!(!response.success);
        assert_eq!(response.error_code, Some(MobileErrorCode::NotFound));
    }

    #[tokio::test]
    async fn test_add_item_to_request() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria requisição
        let create_payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: None,
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let request_id = extract_response_data(&create_response)["request"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        // Adiciona item
        let add_payload = AddItemPayload {
            request_id: request_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 5.0,
            notes: Some("Item urgente".to_string()),
        };
        let response = handler.add_item(2, add_payload, &setup.employee_id).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["item"]["id"].is_string());
    }

    #[tokio::test]
    async fn test_remove_item_from_request() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria requisição e item
        let create_payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: None,
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let request_id = extract_response_data(&create_response)["request"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let add_payload = AddItemPayload {
            request_id: request_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 5.0,
            notes: None,
        };
        let add_response = handler.add_item(2, add_payload, &setup.employee_id).await;
        let item_id = extract_response_data(&add_response)["item"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        // Remove item
        let response = handler
            .remove_item(3, &request_id, &item_id, &setup.employee_id)
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["success"], true);
    }

    #[tokio::test]
    async fn test_submit_request() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria requisição com item
        let create_payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: None,
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let request_id = extract_response_data(&create_response)["request"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let add_payload = AddItemPayload {
            request_id: request_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 5.0,
            notes: None,
        };
        handler.add_item(2, add_payload, &setup.employee_id).await;

        // Submete
        let submit_payload = SubmitRequestPayload {
            request_id: request_id.clone(),
        };
        let response = handler.submit(3, submit_payload, &setup.employee_id).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["request"]["status"], "PENDING_APPROVAL");
    }

    #[tokio::test]
    async fn test_approve_request_by_supervisor() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria e submete requisição
        let create_payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: None,
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let request_id = extract_response_data(&create_response)["request"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let add_payload = AddItemPayload {
            request_id: request_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 5.0,
            notes: None,
        };
        handler.add_item(2, add_payload, &setup.employee_id).await;

        let submit_payload = SubmitRequestPayload {
            request_id: request_id.clone(),
        };
        handler.submit(3, submit_payload, &setup.employee_id).await;

        // Aprova (supervisor)
        let approve_payload = ApproveRequestPayload {
            request_id: request_id.clone(),
            notes: Some("Aprovado para separação".to_string()),
        };
        let response = handler
            .approve(4, approve_payload, &setup.supervisor_id, "SUPERVISOR")
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["request"]["status"], "APPROVED");
    }

    #[tokio::test]
    async fn test_approve_request_denied_for_operator() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria e submete requisição
        let create_payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: None,
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let request_id = extract_response_data(&create_response)["request"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let submit_payload = SubmitRequestPayload {
            request_id: request_id.clone(),
        };
        handler.submit(2, submit_payload, &setup.employee_id).await;

        // Tenta aprovar (operador - deve falhar)
        let approve_payload = ApproveRequestPayload {
            request_id: request_id.clone(),
            notes: None,
        };
        let response = handler
            .approve(3, approve_payload, &setup.employee_id, "OPERATOR")
            .await;

        assert!(!response.success);
        assert_eq!(response.error_code, Some(MobileErrorCode::PermissionDenied));
    }

    #[tokio::test]
    async fn test_reject_request() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria e submete requisição
        let create_payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: None,
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let request_id = extract_response_data(&create_response)["request"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let submit_payload = SubmitRequestPayload {
            request_id: request_id.clone(),
        };
        handler.submit(2, submit_payload, &setup.employee_id).await;

        // Rejeita
        let reject_payload = RejectRequestPayload {
            request_id: request_id.clone(),
            reason: "Quantidade excessiva para o período".to_string(),
        };
        let response = handler
            .reject(3, reject_payload, &setup.supervisor_id, "SUPERVISOR")
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["request"]["status"], "REJECTED");
    }

    #[tokio::test]
    async fn test_cancel_request() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria requisição
        let create_payload = CreateRequestPayload {
            contract_id: setup.contract_id.clone(),
            activity_id: None,
            priority: None,
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let request_id = extract_response_data(&create_response)["request"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        // Cancela
        let response = handler
            .cancel(
                2,
                &request_id,
                Some("Não necessário mais".to_string()),
                &setup.employee_id,
            )
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["request"]["status"], "CANCELLED");
    }

    #[tokio::test]
    async fn test_list_requests_with_filters() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseRequestHandler::new(pool.clone());

        // Cria múltiplas requisições
        for _ in 0..3 {
            let create_payload = CreateRequestPayload {
                contract_id: setup.contract_id.clone(),
                activity_id: None,
                priority: None,
                notes: None,
            };
            handler.create(1, create_payload, &setup.employee_id).await;
        }

        // Lista com filtro de contrato
        let payload = RequestListPayload {
            status: None,
            contract_id: Some(setup.contract_id.clone()),
            limit: Some(10),
            page: Some(1),
        };

        let response = handler
            .list(2, payload, &setup.employee_id, "OPERATOR")
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["total"], 3);
        assert_eq!(data["requests"].as_array().unwrap().len(), 3);
    }
}

// =============================================================================
// TRANSFER HANDLER TESTS
// =============================================================================

mod transfer_handler_tests {
    use super::*;

    #[tokio::test]
    async fn test_list_transfers_empty() {
        let pool = setup_test_db().await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        let payload = TransferListPayload {
            status: None,
            from_location_id: None,
            to_location_id: None,
            limit: Some(10),
            page: Some(1),
        };

        let response = handler.list(1, payload, "emp1", "OPERATOR").await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["total"], 0);
    }

    #[tokio::test]
    async fn test_create_transfer_success() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        let payload = CreateTransferPayload {
            from_location_id: setup.source_location.clone(),
            to_location_id: setup.destination_location.clone(),
            notes: Some("Transferência de emergência".to_string()),
        };

        let response = handler.create(1, payload, &setup.employee_id).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["transfer"]["id"].is_string());
        assert_eq!(data["transfer"]["status"], "PENDING");
    }

    #[tokio::test]
    async fn test_get_transfer_not_found() {
        let pool = setup_test_db().await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        let response = handler.get(1, "non-existent-id").await;

        assert!(!response.success);
        assert_eq!(response.error_code, Some(MobileErrorCode::NotFound));
    }

    #[tokio::test]
    async fn test_add_item_to_transfer() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        // Cria transferência
        let create_payload = CreateTransferPayload {
            from_location_id: setup.source_location.clone(),
            to_location_id: setup.destination_location.clone(),
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let transfer_id = extract_response_data(&create_response)["transfer"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        // Adiciona item
        let add_payload = AddTransferItemPayload {
            transfer_id: transfer_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 10.0,
            lot_number: Some("LOTE-001".to_string()),
            notes: None,
        };
        let response = handler.add_item(2, add_payload, &setup.employee_id).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["item"]["id"].is_string());
    }

    #[tokio::test]
    async fn test_ship_transfer() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        // Cria transferência com item
        let create_payload = CreateTransferPayload {
            from_location_id: setup.source_location.clone(),
            to_location_id: setup.destination_location.clone(),
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let transfer_id = extract_response_data(&create_response)["transfer"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let add_payload = AddTransferItemPayload {
            transfer_id: transfer_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 10.0,
            lot_number: None,
            notes: None,
        };
        handler.add_item(2, add_payload, &setup.employee_id).await;

        // Despacha
        let ship_payload = ShipTransferPayload {
            transfer_id: transfer_id.clone(),
        };
        let response = handler.ship(3, ship_payload, &setup.employee_id).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["transfer"]["status"], "SHIPPED");
    }

    #[tokio::test]
    async fn test_receive_transfer() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        // Cria, adiciona item e despacha
        let create_payload = CreateTransferPayload {
            from_location_id: setup.source_location.clone(),
            to_location_id: setup.destination_location.clone(),
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let transfer_id = extract_response_data(&create_response)["transfer"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let add_payload = AddTransferItemPayload {
            transfer_id: transfer_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 10.0,
            lot_number: None,
            notes: None,
        };
        handler.add_item(2, add_payload, &setup.employee_id).await;

        let ship_payload = ShipTransferPayload {
            transfer_id: transfer_id.clone(),
        };
        handler.ship(3, ship_payload, &setup.employee_id).await;

        // Recebe
        let receive_payload = ReceiveTransferPayload {
            transfer_id: transfer_id.clone(),
            items: None,
        };
        let response = handler
            .receive(4, receive_payload, &setup.employee_id)
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["transfer"]["status"], "RECEIVED");
    }

    #[tokio::test]
    async fn test_cancel_transfer() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        // Cria transferência
        let create_payload = CreateTransferPayload {
            from_location_id: setup.source_location.clone(),
            to_location_id: setup.destination_location.clone(),
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let transfer_id = extract_response_data(&create_response)["transfer"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        // Cancela
        let response = handler
            .cancel(
                2,
                &transfer_id,
                Some("Transferência duplicada".to_string()),
                &setup.employee_id,
            )
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["transfer"]["status"], "CANCELLED");
    }

    #[tokio::test]
    async fn test_remove_item_from_transfer() {
        let pool = setup_test_db().await;
        let setup = enterprise_setup(&pool).await;
        let handler = EnterpriseTransferHandler::new(pool.clone());

        // Cria transferência e item
        let create_payload = CreateTransferPayload {
            from_location_id: setup.source_location.clone(),
            to_location_id: setup.destination_location.clone(),
            notes: None,
        };
        let create_response = handler.create(1, create_payload, &setup.employee_id).await;
        let transfer_id = extract_response_data(&create_response)["transfer"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let add_payload = AddTransferItemPayload {
            transfer_id: transfer_id.clone(),
            product_id: setup.product_id.clone(),
            quantity: 10.0,
            lot_number: None,
            notes: None,
        };
        let add_response = handler.add_item(2, add_payload, &setup.employee_id).await;
        let item_id = extract_response_data(&add_response)["item"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        // Remove item
        let response = handler
            .remove_item(3, &transfer_id, &item_id, &setup.employee_id)
            .await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert_eq!(data["success"], true);
    }
}

// =============================================================================
// CONTEXT HANDLER TESTS
// =============================================================================

mod context_handler_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_contracts() {
        let pool = setup_test_db().await;
        let _contract_id = create_test_contract(&pool).await;
        let handler = EnterpriseContextHandler::new(pool.clone());

        let response = handler.get_contracts(1).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["contracts"].is_array());
        assert!(!data["contracts"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_get_locations() {
        let pool = setup_test_db().await;
        let _location_id = create_test_location(&pool, "ALMOXARIFADO").await;
        let handler = EnterpriseContextHandler::new(pool.clone());

        let response = handler.get_locations(1, None).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["locations"].is_array());
        assert!(!data["locations"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_get_context() {
        let pool = setup_test_db().await;
        let _contract_id = create_test_contract(&pool).await;
        let _location_id = create_test_location(&pool, "ALMOXARIFADO").await;
        let handler = EnterpriseContextHandler::new(pool.clone());

        let response = handler.get_context(1).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["contracts"].is_array());
        assert!(data["locations"].is_array());
    }

    #[tokio::test]
    async fn test_get_context_empty() {
        let pool = setup_test_db().await;
        let handler = EnterpriseContextHandler::new(pool.clone());

        let response = handler.get_context(1).await;

        assert!(response.success);
        let data = extract_response_data(&response);
        assert!(data["contracts"].as_array().unwrap().is_empty());
        assert!(data["locations"].as_array().unwrap().is_empty());
    }
}
