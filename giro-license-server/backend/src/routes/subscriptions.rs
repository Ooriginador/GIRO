//! Subscription Management Routes
//!
//! Handles subscription lifecycle: create, cancel, update, status.

use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::{
    errors::{AppError, AppResult},
    middleware::auth::AuthAdmin,
    AppState,
};

/// Subscription routes
pub fn subscription_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_subscriptions))
        .route("/", post(create_subscription))
        .route("/{id}", get(get_subscription))
        .route("/{id}/cancel", post(cancel_subscription))
        .route("/{id}/update", put(update_subscription))
        .route("/{id}/reactivate", post(reactivate_subscription))
}

/// Subscription status
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionStatus {
    Active,
    Canceled,
    PastDue,
    Trialing,
    Paused,
}

/// Subscription details
#[derive(Debug, Serialize)]
pub struct Subscription {
    pub id: String,
    pub admin_id: String,
    pub stripe_subscription_id: Option<String>,
    pub plan_type: String,
    pub status: SubscriptionStatus,
    pub current_period_start: String,
    pub current_period_end: String,
    pub cancel_at_period_end: bool,
    pub quantity: i32,
    pub created_at: String,
}

/// Create subscription request
#[derive(Debug, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub plan_type: String,
    pub quantity: i32,
    pub payment_method_id: Option<String>,
}

/// Update subscription request
#[derive(Debug, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub plan_type: Option<String>,
    pub quantity: Option<i32>,
}

/// List subscriptions
async fn list_subscriptions(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
) -> AppResult<Json<Vec<Subscription>>> {
    // TODO: Query database for subscriptions
    tracing::info!("Listing subscriptions for admin: {}", admin_id);
    
    // Placeholder response
    Ok(Json(vec![]))
}

/// Get subscription details
async fn get_subscription(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Path(id): Path<String>,
) -> AppResult<Json<Subscription>> {
    tracing::info!("Getting subscription {} for admin: {}", id, admin_id);
    
    // TODO: Query database
    Err(AppError::NotFound(format!("Subscription {} not found", id)))
}

/// Create a new subscription
async fn create_subscription(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Json(payload): Json<CreateSubscriptionRequest>,
) -> AppResult<Json<Subscription>> {
    tracing::info!(
        "Creating subscription for admin {} - plan: {}, qty: {}",
        admin_id, payload.plan_type, payload.quantity
    );
    
    // Validate plan type
    if !["basic", "professional", "enterprise"].contains(&payload.plan_type.as_str()) {
        return Err(AppError::BadRequest("Invalid plan type".to_string()));
    }
    
    // Validate quantity
    if payload.quantity < 1 || payload.quantity > 100 {
        return Err(AppError::BadRequest("Quantity must be between 1 and 100".to_string()));
    }
    
    // TODO: Create subscription in Stripe and database
    let subscription = Subscription {
        id: format!("sub_{}", uuid::Uuid::new_v4()),
        admin_id: admin_id.to_string(),
        stripe_subscription_id: None,
        plan_type: payload.plan_type,
        status: SubscriptionStatus::Active,
        current_period_start: chrono::Utc::now().to_rfc3339(),
        current_period_end: (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339(),
        cancel_at_period_end: false,
        quantity: payload.quantity,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    
    Ok(Json(subscription))
}

/// Cancel a subscription
async fn cancel_subscription(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("Canceling subscription {} for admin: {}", id, admin_id);
    
    // TODO: Cancel in Stripe and update database
    Ok(Json(serde_json::json!({
        "id": id,
        "status": "canceled",
        "cancel_at_period_end": true,
        "message": "Subscription will be canceled at the end of the billing period"
    })))
}

/// Update a subscription
async fn update_subscription(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateSubscriptionRequest>,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("Updating subscription {} for admin: {}", id, admin_id);
    
    // Validate plan type if provided
    if let Some(ref plan) = payload.plan_type {
        if !["basic", "professional", "enterprise"].contains(&plan.as_str()) {
            return Err(AppError::BadRequest("Invalid plan type".to_string()));
        }
    }
    
    // Validate quantity if provided
    if let Some(qty) = payload.quantity {
        if qty < 1 || qty > 100 {
            return Err(AppError::BadRequest("Quantity must be between 1 and 100".to_string()));
        }
    }
    
    // TODO: Update in Stripe and database
    Ok(Json(serde_json::json!({
        "id": id,
        "updated": true,
        "plan_type": payload.plan_type,
        "quantity": payload.quantity
    })))
}

/// Reactivate a canceled subscription
async fn reactivate_subscription(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("Reactivating subscription {} for admin: {}", id, admin_id);
    
    // TODO: Reactivate in Stripe and update database
    Ok(Json(serde_json::json!({
        "id": id,
        "status": "active",
        "cancel_at_period_end": false,
        "message": "Subscription reactivated successfully"
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subscription_status_serialization() {
        let active = SubscriptionStatus::Active;
        let json = serde_json::to_string(&active).unwrap();
        assert!(json.contains("active"));
    }

    #[test]
    fn test_plan_validation() {
        let valid_plans = ["basic", "professional", "enterprise"];
        let invalid_plans = ["free", "premium", ""];
        
        for plan in valid_plans {
            assert!(valid_plans.contains(&plan));
        }
        
        for plan in invalid_plans {
            assert!(!valid_plans.contains(&plan));
        }
    }

    #[test]
    fn test_quantity_validation() {
        let valid_quantities = [1, 10, 50, 100];
        let invalid_quantities = [0, -1, 101, 1000];
        
        for qty in valid_quantities {
            assert!(qty >= 1 && qty <= 100);
        }
        
        for qty in invalid_quantities {
            assert!(!(qty >= 1 && qty <= 100));
        }
    }
}
