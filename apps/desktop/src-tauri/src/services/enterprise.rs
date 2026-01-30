//! Serviço de Regras de Negócio - Enterprise Module

use crate::commands::ApproveItemInput;
use crate::error::{AppError, AppResult};
use crate::models::enterprise::{MaterialRequest, StockLocation};
use crate::repositories::{
    MaterialConsumptionRepository, MaterialRequestRepository, StockLocationRepository,
};
use sqlx::SqlitePool;

pub struct EnterpriseService<'a> {
    _pool: &'a SqlitePool, // Renomeado para prefixo _ para indicar que é mantido para expansão futura mas não usado agora
    req_repo: MaterialRequestRepository<'a>,
    stock_repo: StockLocationRepository<'a>,
    consumption_repo: MaterialConsumptionRepository<'a>,
}

impl<'a> EnterpriseService<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self {
            _pool: pool,
            req_repo: MaterialRequestRepository::new(pool),
            stock_repo: StockLocationRepository::new(pool),
            consumption_repo: MaterialConsumptionRepository::new(pool),
        }
    }

    /// Aprova requisição com reserva de estoque
    pub async fn approve_material_request(
        &self,
        request_id: &str,
        approver_id: &str,
        items: &[ApproveItemInput],
    ) -> AppResult<MaterialRequest> {
        // 1. Busca requisição para saber o local de origem
        let request =
            self.req_repo
                .find_by_id(request_id)
                .await?
                .ok_or_else(|| AppError::NotFound {
                    entity: "MaterialRequest".into(),
                    id: request_id.to_string(),
                })?;

        let source_location_id = request.source_location_id.ok_or_else(|| {
            AppError::Validation("Requisição sem local de origem definido".into())
        })?;

        // Valida local de estoque
        let location: StockLocation = self
            .stock_repo
            .find_by_id(&source_location_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockLocation".into(),
                id: source_location_id.clone(),
            })?;

        if !location.is_active {
            return Err(AppError::BusinessRule(format!(
                "Local de estoque '{}' está inativo",
                location.name
            )));
        }

        // 2. Inicia transação
        // let mut tx = self.pool.begin().await?;

        // NOTA ARQUITETURAL: Transações cross-repository
        // Atualmente os repositórios usam self.pool diretamente, sem suporte a transações compartilhadas.
        // Para atomicidade completa, os repositórios deveriam aceitar um Executor trait object.
        // Por enquanto, operamos sequencialmente e confiamos no tratamento de erro.
        // Mitigação: Operações críticas são ordenadas para minimizar estados inconsistentes.
        // Prioridade: Baixa - SQLite local tem risco mínimo de corrupção.

        // 3. Reserva itens no estoque
        // Precisamos dos items originais para saber o product_id
        let all_request_items = self.req_repo.get_items(request_id).await?;

        for item in items {
            // Verifica se tem saldo suficiente e reserva
            if item.approved_qty > 0.0 {
                // Encontra item na lista original para pegar product_id
                if let Some(req_item) = all_request_items.iter().find(|i| i.id == item.item_id) {
                    self.stock_repo
                        .reserve_quantity(
                            &source_location_id,
                            &req_item.product_id,
                            item.approved_qty,
                        )
                        .await?;
                }
            }
        }

        // 4. Atualiza requisição
        let updated_request = self
            .req_repo
            .approve_with_items(request_id, approver_id, items)
            .await?;

        // tx.commit().await?; // Comentado pois os repos usam pool direto

        Ok(updated_request)
    }

    /// Aprova requisição totalmente, usando a quantidade solicitada como aprovada
    pub async fn approve_request_fully(
        &self,
        request_id: &str,
        approver_id: &str,
    ) -> AppResult<MaterialRequest> {
        let items = self.req_repo.get_items(request_id).await?;

        let inputs: Vec<ApproveItemInput> = items
            .into_iter()
            .map(|item| ApproveItemInput {
                item_id: item.id,
                approved_qty: item.requested_qty,
            })
            .collect();

        self.approve_material_request(request_id, approver_id, &inputs)
            .await
    }

    /// Completa separação da requisição, assumindo separação total dos itens aprovados
    pub async fn complete_separation(&self, request_id: &str) -> AppResult<MaterialRequest> {
        let items = self.req_repo.get_items(request_id).await?;

        for item in items {
            // Se não tiver quantidade separada, assume aprovada
            let qty = item
                .separated_qty
                .unwrap_or(item.approved_qty.unwrap_or(0.0));
            if qty > 0.0 {
                self.req_repo
                    .update_item_separated_qty(&item.id, qty)
                    .await?;
            }
        }

        self.req_repo.complete_separation(request_id).await
    }

    /// Realiza entrega da requisição e baixa no estoque (consumo)
    pub async fn deliver_material_request(
        &self,
        request_id: &str,
        signature: Option<String>,
    ) -> AppResult<MaterialRequest> {
        let request =
            self.req_repo
                .find_by_id(request_id)
                .await?
                .ok_or_else(|| AppError::NotFound {
                    entity: "MaterialRequest".into(),
                    id: request_id.to_string(),
                })?;

        let source_location_id = request.source_location_id.ok_or_else(|| {
            AppError::Validation("Requisição sem local de origem definido".into())
        })?;

        // Valida local de estoque
        let location: StockLocation = self
            .stock_repo
            .find_by_id(&source_location_id)
            .await?
            .ok_or_else(|| AppError::NotFound {
                entity: "StockLocation".into(),
                id: source_location_id.clone(),
            })?;

        if !location.is_active {
            return Err(AppError::BusinessRule(format!(
                "Local de estoque '{}' está inativo",
                location.name
            )));
        }

        // Busca itens da requisição
        let request_items = self.req_repo.get_items_with_products(request_id).await?;

        for item in request_items {
            let qty_to_deliver = item.item.separated_qty.unwrap_or(0.0);

            if qty_to_deliver > 0.0 {
                // 1. Baixa do estoque (remove reserva e quantidade)
                // Primeiro remove a reserva (release)
                self.stock_repo
                    .release_reservation(&source_location_id, &item.item.product_id, qty_to_deliver)
                    .await?;

                // Depois remove a quantidade física
                self.stock_repo
                    .adjust_balance(&source_location_id, &item.item.product_id, -qty_to_deliver)
                    .await?;

                // 2. Cria registro de consumo
                if let (Some(activity_id), Some(_)) = (&request.activity_id, &request.work_front_id)
                {
                    let consumption = crate::models::enterprise::MaterialConsumption {
                        id: "".to_string(), // Será gerado no repo
                        activity_id: activity_id.clone(),
                        product_id: item.item.product_id.clone(),
                        request_id: Some(request_id.to_string()),
                        request_item_id: Some(item.item.id.clone()),
                        quantity: qty_to_deliver,
                        unit_cost: item.item.unit_price,
                        total_cost: item.item.unit_price * qty_to_deliver,
                        consumed_at: chrono::Utc::now().to_rfc3339(),
                        consumed_by_id: request.requester_id.clone(), // Assumindo solicitante consome
                        notes: None,
                        created_at: "".to_string(),
                    };

                    self.consumption_repo.create(consumption).await?;
                }

                // 3. Atualiza item como entregue
                self.req_repo
                    .update_item_delivered(&item.item.id, qty_to_deliver)
                    .await?;
            }
        }

        // 3. Atualiza status da requisição
        self.req_repo.deliver(request_id, signature).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::ApproveItemInput;
    use crate::repositories::new_id;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let url = format!("file:/tmp/giro_service_test_{}?mode=rwc", ts);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();
        // Migrate
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        // Setup Basic Data
        sqlx::query("INSERT INTO categories (id, name, created_at, updated_at) VALUES ('cat1', 'Test Cat', datetime('now'), datetime('now'))").execute(&pool).await.unwrap();

        sqlx::query("INSERT INTO products (id, name, description, unit, cost_price, sale_price, internal_code, category_id, is_active, created_at, updated_at) VALUES ('p1', 'Prod 1', 'D', 'UN', 10, 20, 'CODE1', 'cat1', 1, datetime('now'), datetime('now'))").execute(&pool).await.unwrap();

        sqlx::query("INSERT INTO stock_locations (id, code, name, location_type, is_active, created_at, updated_at) VALUES ('src', 'SRC', 'Source', 'WAREHOUSE', 1, datetime('now'), datetime('now'))").execute(&pool).await.unwrap();

        sqlx::query("INSERT INTO stock_balances (id, location_id, product_id, quantity, reserved_qty, created_at, updated_at) VALUES ('sb1', 'src', 'p1', 100, 0, datetime('now'), datetime('now'))").execute(&pool).await.unwrap();

        sqlx::query("INSERT INTO employees (id, name, pin, role, is_active, created_at, updated_at) VALUES ('u1', 'User', '1234', 'ADMIN', 1, datetime('now'), datetime('now'))").execute(&pool).await.unwrap();

        // Setup Contract
        sqlx::query("INSERT INTO contracts (id, code, name, status, created_at, updated_at) VALUES ('ctr-01', 'OBRA-01', 'Obra Teste', 'ACTIVE', datetime('now'), datetime('now'))").execute(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_approve_request_reserves_stock() {
        let pool = setup_test_db().await;
        let service = EnterpriseService::new(&pool);

        // Create Request (No requested_at)
        let req_id = new_id();
        sqlx::query("INSERT INTO material_requests (id, request_number, contract_id, requester_id, source_location_id, status, created_at, updated_at) VALUES (?, 'REQ-01', 'ctr-01', 'u1', 'src', 'PENDING', datetime('now'), datetime('now'))")
            .bind(&req_id)
            .execute(&pool)
            .await
            .unwrap();

        // Create Item
        let item_id = new_id();
        sqlx::query("INSERT INTO material_request_items (id, request_id, product_id, requested_qty, unit_price, created_at, updated_at) VALUES (?, ?, 'p1', 10, 5.0, datetime('now'), datetime('now'))")
            .bind(&item_id)
            .bind(&req_id)
            .execute(&pool)
            .await
            .unwrap();

        let items = vec![ApproveItemInput {
            item_id,
            approved_qty: 10.0,
        }];

        let req = service
            .approve_material_request(&req_id, "u1", &items)
            .await
            .unwrap();
        assert_eq!(req.status, "APPROVED");

        // Verify Reserve
        let (reserved,): (f64,) = sqlx::query_as(
            "SELECT reserved_qty FROM stock_balances WHERE product_id='p1' AND location_id='src'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(reserved, 10.0);
    }

    #[tokio::test]
    async fn test_deliver_material_request() {
        let pool = setup_test_db().await;
        let service = EnterpriseService::new(&pool);

        // Create Request (Approved) (No requested_at)
        let req_id = new_id();
        sqlx::query("INSERT INTO material_requests (id, request_number, contract_id, requester_id, source_location_id, status, approved_at, created_at, updated_at) VALUES (?, 'REQ-02', 'ctr-01', 'u1', 'src', 'APPROVED', datetime('now'), datetime('now'), datetime('now'))")
            .bind(&req_id)
            .execute(&pool)
            .await
            .unwrap();

        // Create Item (With separated_qty)
        let item_id = new_id();
        sqlx::query("INSERT INTO material_request_items (id, request_id, product_id, requested_qty, approved_qty, separated_qty, unit_price, created_at, updated_at) VALUES (?, ?, 'p1', 10, 10, 10, 5.0, datetime('now'), datetime('now'))")
            .bind(&item_id)
            .bind(&req_id)
            .execute(&pool)
            .await
            .unwrap();

        // Setup initial stock (Reserved should be 10)
        sqlx::query("UPDATE stock_balances SET quantity=100, reserved_qty=10 WHERE product_id='p1' AND location_id='src'")
            .execute(&pool)
            .await
            .unwrap();

        // Deliver
        let req = service
            .deliver_material_request(&req_id, Some("signature_test".to_string()))
            .await
            .unwrap();
        assert_eq!(req.status, "DELIVERED");
        assert_eq!(
            req.delivered_by_signature,
            Some("signature_test".to_string())
        );

        // Verify Stock Release & Consumption
        let (qty, reserved): (f64, f64) = sqlx::query_as(
            "SELECT quantity, reserved_qty FROM stock_balances WHERE product_id='p1' AND location_id='src'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(qty, 90.0); // 100 - 10
        assert_eq!(reserved, 0.0); // 10 - 10

        // Verify Item Delivered Qty
        let (delivered_qty,): (f64,) =
            sqlx::query_as("SELECT delivered_qty FROM material_request_items WHERE id=?")
                .bind(&item_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(delivered_qty, 10.0);
    }
}
