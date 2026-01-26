//! Comandos Tauri para Inventário Enterprise (Mobile Integration)
//!
//! Este módulo fornece endpoints para integração com o app mobile
//! para inventário de locais de estoque enterprise.

use crate::error::AppResult;
use crate::repositories::{InventoryRepository, StockLocationRepository};
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

// ============================================================================
// Types
// ============================================================================

/// Location available for mobile inventory
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MobileLocationDto {
    pub id: String,
    pub name: String,
    pub code: String,
    pub location_type: String,
    pub is_active: bool,
}

/// Inventory count from mobile device
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MobileCountInput {
    pub product_id: String,
    pub counted_quantity: f64,
    pub notes: Option<String>,
}

/// Batch sync from mobile
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MobileBatchSyncInput {
    pub inventory_id: String,
    pub counts: Vec<MobileCountInput>,
    pub device_id: String,
}

/// Sync result
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MobileSyncResult {
    pub success: bool,
    pub processed_count: i32,
    pub failed_count: i32,
    pub errors: Vec<String>,
}

// ============================================================================
// Commands
// ============================================================================

/// Get available locations for mobile inventory
#[tauri::command]
#[specta::specta]
pub async fn get_mobile_locations(
    app_state: State<'_, AppState>,
) -> AppResult<Vec<MobileLocationDto>> {
    app_state.session.require_authenticated()?;

    let repo = StockLocationRepository::new(app_state.pool());
    let locations = repo.find_all_active().await?;

    let result: Vec<MobileLocationDto> = locations
        .into_iter()
        .map(|loc| MobileLocationDto {
            id: loc.id,
            name: loc.name,
            code: loc.code,
            location_type: loc.location_type,
            is_active: loc.is_active,
        })
        .collect();

    Ok(result)
}

/// Get location details for mobile
#[tauri::command]
#[specta::specta]
pub async fn get_mobile_location(
    location_id: String,
    app_state: State<'_, AppState>,
) -> AppResult<Option<MobileLocationDto>> {
    app_state.session.require_authenticated()?;

    let repo = StockLocationRepository::new(app_state.pool());
    let location = repo.find_by_id(&location_id).await?;

    Ok(location.map(|loc| MobileLocationDto {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        location_type: loc.location_type,
        is_active: loc.is_active,
    }))
}

/// Sync inventory counts from mobile device
#[tauri::command]
#[specta::specta]
pub async fn sync_mobile_counts(
    input: MobileBatchSyncInput,
    app_state: State<'_, AppState>,
) -> AppResult<MobileSyncResult> {
    use crate::models::inventory::InventoryItem;
    use chrono::Utc;
    use uuid::Uuid;

    let session = app_state.session.require_authenticated()?;
    let user_id = session.employee_id;

    let repo = InventoryRepository::new(app_state.pool());

    // Verify inventory exists
    let inventory = match repo.get_by_id(&input.inventory_id).await? {
        Some(inv) => inv,
        None => {
            return Ok(MobileSyncResult {
                success: false,
                processed_count: 0,
                failed_count: input.counts.len() as i32,
                errors: vec![format!("Inventory {} not found", input.inventory_id)],
            });
        }
    };

    let mut processed = 0;
    let mut failed = 0;
    let mut errors = Vec::new();

    for count in &input.counts {
        // Get expected stock for divergence calculation
        let expected = repo
            .get_expected_stock(&count.product_id)
            .await
            .unwrap_or(0.0);
        let divergence = count.counted_quantity - expected;

        let item = InventoryItem {
            id: Uuid::new_v4().to_string(),
            inventory_id: inventory.id.clone(),
            product_id: count.product_id.clone(),
            lot_id: None,
            expected_quantity: expected,
            counted_quantity: count.counted_quantity,
            divergence,
            notes: count.notes.clone(),
            counted_by: user_id.clone(),
            counted_at: Utc::now(),
            created_at: Utc::now(),
        };

        match repo.add_count(&item).await {
            Ok(()) => {
                processed += 1;
                tracing::debug!(
                    "Mobile count synced: product={}, qty={}, divergence={}",
                    count.product_id,
                    count.counted_quantity,
                    divergence
                );
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("Error for {}: {}", count.product_id, e));
                tracing::warn!("Failed to sync count for {}: {}", count.product_id, e);
            }
        }
    }

    tracing::info!(
        "Synced {} counts from device {} for inventory {} (failed: {})",
        processed,
        input.device_id,
        input.inventory_id,
        failed
    );

    Ok(MobileSyncResult {
        success: failed == 0,
        processed_count: processed,
        failed_count: failed,
        errors,
    })
}

/// Check if mobile sync is available
#[tauri::command]
#[specta::specta]
pub async fn check_mobile_sync_status(app_state: State<'_, AppState>) -> AppResult<bool> {
    app_state.session.require_authenticated()?;
    Ok(true)
}
