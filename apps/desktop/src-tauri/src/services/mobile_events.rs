//! Sistema de eventos push para mobile
//!
//! Gerencia e envia eventos em tempo real para clientes mobile conectados.

use crate::services::mobile_protocol::{MobileEvent, MobileEventType};
use std::sync::Arc;
use tokio::sync::broadcast;

/// Serviço de eventos push
pub struct MobileEventService {
    tx: broadcast::Sender<MobileEvent>,
}

impl MobileEventService {
    /// Cria novo serviço
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self { tx }
    }

    /// Obtém um receiver para eventos
    pub fn subscribe(&self) -> broadcast::Receiver<MobileEvent> {
        self.tx.subscribe()
    }

    /// Obtém o sender para broadcast
    pub fn sender(&self) -> broadcast::Sender<MobileEvent> {
        self.tx.clone()
    }

    /// Envia evento de estoque baixo
    pub fn emit_low_stock(
        &self,
        product_id: &str,
        product_name: &str,
        current_stock: f64,
        min_stock: f64,
    ) {
        let event = MobileEvent::from_type(
            MobileEventType::StockLow,
            serde_json::json!({
                "productId": product_id,
                "productName": product_name,
                "currentStock": current_stock,
                "minStock": min_stock,
                "severity": if current_stock <= 0.0 { "critical" } else { "warning" }
            }),
        );

        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento StockLow emitido: {}", product_name);
    }

    /// Envia evento de estoque zerado
    pub fn emit_stock_zero(&self, product_id: &str, product_name: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::StockZero,
            serde_json::json!({
                "productId": product_id,
                "productName": product_name,
                "severity": "critical"
            }),
        );

        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento StockZero emitido: {}", product_name);
    }

    /// Envia evento de validade próxima
    pub fn emit_expiration_warning(
        &self,
        lot_id: &str,
        product_id: &str,
        product_name: &str,
        expiration_date: chrono::DateTime<chrono::Utc>,
        days_until: i64,
    ) {
        let severity = match days_until {
            d if d < 0 => "expired",
            d if d <= 7 => "critical",
            d if d <= 30 => "warning",
            _ => "info",
        };

        let event = MobileEvent::from_type(
            MobileEventType::ExpirationWarning,
            serde_json::json!({
                "lotId": lot_id,
                "productId": product_id,
                "productName": product_name,
                "expirationDate": expiration_date,
                "daysUntil": days_until,
                "severity": severity
            }),
        );

        let _ = self.tx.send(event);
        tracing::debug!(
            "📢 Evento ExpirationWarning emitido: {} ({}d)",
            product_name,
            days_until
        );
    }

    /// Envia evento de lote vencido
    pub fn emit_lot_expired(
        &self,
        lot_id: &str,
        product_id: &str,
        product_name: &str,
        quantity: f64,
    ) {
        let event = MobileEvent::from_type(
            MobileEventType::LotExpired,
            serde_json::json!({
                "lotId": lot_id,
                "productId": product_id,
                "productName": product_name,
                "quantity": quantity,
                "severity": "critical"
            }),
        );

        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento LotExpired emitido: {}", product_name);
    }

    /// Envia evento de inventário iniciado
    pub fn emit_inventory_started(&self, inventory_id: &str, name: &str, started_by: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::InventoryStarted,
            serde_json::json!({
                "inventoryId": inventory_id,
                "name": name,
                "startedBy": started_by,
                "startedAt": chrono::Utc::now()
            }),
        );

        let _ = self.tx.send(event);
        tracing::info!("📢 Evento InventoryStarted emitido: {}", name);
    }

    /// Envia evento de inventário finalizado
    pub fn emit_inventory_finished(
        &self,
        inventory_id: &str,
        name: &str,
        divergent_count: i32,
        adjustments_applied: bool,
    ) {
        let event = MobileEvent::from_type(
            MobileEventType::InventoryFinished,
            serde_json::json!({
                "inventoryId": inventory_id,
                "name": name,
                "divergentCount": divergent_count,
                "adjustmentsApplied": adjustments_applied,
                "finishedAt": chrono::Utc::now()
            }),
        );

        let _ = self.tx.send(event);
        tracing::info!("📢 Evento InventoryFinished emitido: {}", name);
    }

    /// Envia evento de cliente atualizado
    pub fn emit_customer_updated(&self, customer_id: &str, name: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::CustomerUpdated,
            serde_json::json!({
                "customerId": customer_id,
                "name": name,
                "updatedAt": chrono::Utc::now()
            }),
        );
        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento CustomerUpdated emitido: {}", name);
    }

    /// Envia evento de configuração atualizada
    pub fn emit_setting_updated(&self, key: &str, value: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::SettingUpdated,
            serde_json::json!({
                "key": key,
                "value": value,
                "updatedAt": chrono::Utc::now()
            }),
        );
        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento SettingUpdated emitido: {}", key);
    }

    /// Envia evento de ordem de serviço atualizada
    pub fn emit_service_order_updated(&self, order_id: &str, status: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::ServiceOrderUpdated,
            serde_json::json!({
                "orderId": order_id,
                "status": status,
                "updatedAt": chrono::Utc::now()
            }),
        );
        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento ServiceOrderUpdated emitido: {}", order_id);
    }

    /// Envia evento de categoria atualizada
    pub fn emit_category_updated(&self, category_id: &str, name: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::CategoryUpdated,
            serde_json::json!({
                "categoryId": category_id,
                "name": name,
                "updatedAt": chrono::Utc::now()
            }),
        );
        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento CategoryUpdated emitido: {}", name);
    }

    /// Envia evento de fornecedor atualizado
    pub fn emit_supplier_updated(&self, supplier_id: &str, name: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::SupplierUpdated,
            serde_json::json!({
                "supplierId": supplier_id,
                "name": name,
                "updatedAt": chrono::Utc::now()
            }),
        );
        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento SupplierUpdated emitido: {}", name);
    }

    /// Envia evento de produto atualizado
    pub fn emit_product_notification(&self, product_id: &str, product_name: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::ProductUpdated,
            serde_json::json!({
                "productId": product_id,
                "productName": product_name,
                "updatedAt": chrono::Utc::now()
            }),
        );

        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento ProductUpdated emitido: {}", product_name);
    }

    /// Envia evento de sincronização (Push Broadcast)
    pub fn emit_sync_push(&self, entity: &str, data: serde_json::Value) {
        let event = MobileEvent::from_type(
            MobileEventType::SyncPush,
            serde_json::json!({
                "entity": entity,
                "data": data
            }),
        );
        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento SyncPush ({}) emitido", entity);
    }

    /// Envia evento de estoque atualizado
    pub fn emit_stock_updated(
        &self,
        product_id: &str,
        product_name: &str,
        previous_stock: f64,
        new_stock: f64,
        movement_type: &str,
    ) {
        let event = MobileEvent::from_type(
            MobileEventType::StockUpdated,
            serde_json::json!({
                "productId": product_id,
                "productName": product_name,
                "previousStock": previous_stock,
                "newStock": new_stock,
                "movementType": movement_type,
                "updatedAt": chrono::Utc::now()
            }),
        );

        let _ = self.tx.send(event);
        tracing::debug!("📢 Evento StockUpdated emitido: {}", product_name);
    }

    /// Envia evento de sincronização necessária
    pub fn emit_sync_required(&self, reason: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::SyncRequired,
            serde_json::json!({
                "reason": reason,
                "timestamp": chrono::Utc::now()
            }),
        );

        let _ = self.tx.send(event);
        tracing::info!("📢 Evento SyncRequired emitido: {}", reason);
    }

    /// Envia evento de sessão expirada
    pub fn emit_session_expired(&self, employee_id: &str, reason: &str) {
        let event = MobileEvent::from_type(
            MobileEventType::SessionExpired,
            serde_json::json!({
                "employeeId": employee_id,
                "reason": reason,
                "timestamp": chrono::Utc::now()
            }),
        );

        let _ = self.tx.send(event);
        tracing::info!("📢 Evento SessionExpired emitido para: {}", employee_id);
    }
}

impl Default for MobileEventService {
    fn default() -> Self {
        Self::new()
    }
}

/// Trait para emissão de eventos
pub trait EventEmitter: Send + Sync {
    fn emit(&self, event: MobileEvent);
}

impl EventEmitter for MobileEventService {
    fn emit(&self, event: MobileEvent) {
        let _ = self.tx.send(event);
    }
}

/// Wrapper thread-safe
pub type SharedEventService = Arc<MobileEventService>;

/// Cria serviço compartilhado
pub fn create_shared_event_service() -> SharedEventService {
    Arc::new(MobileEventService::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_service() {
        let service = MobileEventService::new();
        let mut rx = service.subscribe();

        // Emitir evento
        service.emit_low_stock("prod-1", "Café", 5.0, 10.0);

        // Verificar recebimento
        let event = rx.try_recv();
        assert!(event.is_ok());

        let event = event.unwrap();
        assert_eq!(event.event, "stock.low");
        assert_eq!(event.data["productId"], "prod-1");
    }

    #[test]
    fn test_multiple_subscribers() {
        let service = MobileEventService::new();
        let mut rx1 = service.subscribe();
        let mut rx2 = service.subscribe();

        service.emit_stock_zero("prod-2", "Açúcar");

        assert!(rx1.try_recv().is_ok());
        assert!(rx2.try_recv().is_ok());
    }
}
