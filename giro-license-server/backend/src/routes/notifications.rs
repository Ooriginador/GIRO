//! Notifications Routes
//!
//! Handles push notifications, alerts, and notification preferences.

use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::{
    errors::{AppError, AppResult},
    middleware::auth::AuthAdmin,
    AppState,
};

/// Notification routes
pub fn notification_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_notifications))
        .route("/subscribe", post(subscribe_push))
        .route("/unsubscribe", post(unsubscribe_push))
        .route("/preferences", get(get_preferences))
        .route("/preferences", put(update_preferences))
        .route("/{id}/read", post(mark_as_read))
        .route("/read-all", post(mark_all_as_read))
        .route("/{id}", delete(delete_notification))
}

/// Notification type
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum NotificationType {
    LicenseExpiring,
    LicenseExpired,
    PaymentFailed,
    PaymentSuccess,
    NewDevice,
    DeviceDeactivated,
    SystemAlert,
    SecurityAlert,
}

/// Notification priority
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum NotificationPriority {
    Low,
    Normal,
    High,
    Urgent,
}

/// Notification
#[derive(Debug, Serialize)]
pub struct Notification {
    pub id: String,
    pub admin_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub message: String,
    pub priority: NotificationPriority,
    pub is_read: bool,
    pub action_url: Option<String>,
    pub created_at: String,
}

/// Push subscription request
#[derive(Debug, Deserialize)]
pub struct PushSubscription {
    pub endpoint: String,
    pub keys: PushKeys,
}

#[derive(Debug, Deserialize)]
pub struct PushKeys {
    pub p256dh: String,
    pub auth: String,
}

/// Notification preferences
#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationPreferences {
    pub email_enabled: bool,
    pub push_enabled: bool,
    pub license_expiring_days: i32,
    pub notify_license_expiring: bool,
    pub notify_payment_failed: bool,
    pub notify_new_device: bool,
    pub notify_security_alerts: bool,
}

impl Default for NotificationPreferences {
    fn default() -> Self {
        Self {
            email_enabled: true,
            push_enabled: true,
            license_expiring_days: 7,
            notify_license_expiring: true,
            notify_payment_failed: true,
            notify_new_device: true,
            notify_security_alerts: true,
        }
    }
}

/// List notifications
async fn list_notifications(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
) -> AppResult<Json<Vec<Notification>>> {
    tracing::info!("Listing notifications for admin: {}", admin_id);
    
    // TODO: Query database for notifications
    // Placeholder with sample notifications
    let notifications = vec![
        Notification {
            id: "notif-1".to_string(),
            admin_id: admin_id.to_string(),
            notification_type: NotificationType::LicenseExpiring,
            title: "Licença expirando em 7 dias".to_string(),
            message: "A licença GIRO-XXXX-YYYY expira em 7 dias. Renove para evitar interrupções.".to_string(),
            priority: NotificationPriority::High,
            is_read: false,
            action_url: Some("/dashboard/licenses".to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
        },
    ];
    
    Ok(Json(notifications))
}

/// Subscribe to push notifications
async fn subscribe_push(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Json(subscription): Json<PushSubscription>,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!(
        "Push subscription for admin {} - endpoint: {}...",
        admin_id, &subscription.endpoint[..50.min(subscription.endpoint.len())]
    );
    
    // TODO: Store subscription in database
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Push notifications enabled"
    })))
}

/// Unsubscribe from push notifications
async fn unsubscribe_push(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("Push unsubscription for admin: {}", admin_id);
    
    // TODO: Remove subscription from database
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Push notifications disabled"
    })))
}

/// Get notification preferences
async fn get_preferences(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
) -> AppResult<Json<NotificationPreferences>> {
    tracing::info!("Getting notification preferences for admin: {}", admin_id);
    
    // TODO: Query database
    Ok(Json(NotificationPreferences::default()))
}

/// Update notification preferences
async fn update_preferences(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Json(prefs): Json<NotificationPreferences>,
) -> AppResult<Json<NotificationPreferences>> {
    tracing::info!("Updating notification preferences for admin: {}", admin_id);
    
    // Validate
    if prefs.license_expiring_days < 1 || prefs.license_expiring_days > 30 {
        return Err(AppError::BadRequest("Expiring days must be between 1 and 30".to_string()));
    }
    
    // TODO: Update in database
    Ok(Json(prefs))
}

/// Mark notification as read
async fn mark_as_read(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("Marking notification {} as read for admin: {}", id, admin_id);
    
    // TODO: Update in database
    Ok(Json(serde_json::json!({
        "id": id,
        "is_read": true
    })))
}

/// Mark all notifications as read
async fn mark_all_as_read(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("Marking all notifications as read for admin: {}", admin_id);
    
    // TODO: Update in database
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "All notifications marked as read"
    })))
}

/// Delete a notification
async fn delete_notification(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("Deleting notification {} for admin: {}", id, admin_id);
    
    // TODO: Delete from database
    Ok(Json(serde_json::json!({
        "id": id,
        "deleted": true
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification_type_serialization() {
        let license_expiring = NotificationType::LicenseExpiring;
        let json = serde_json::to_string(&license_expiring).unwrap();
        assert!(json.contains("license_expiring"));
    }

    #[test]
    fn test_notification_priority_serialization() {
        let urgent = NotificationPriority::Urgent;
        let json = serde_json::to_string(&urgent).unwrap();
        assert!(json.contains("urgent"));
    }

    #[test]
    fn test_default_preferences() {
        let prefs = NotificationPreferences::default();
        
        assert!(prefs.email_enabled);
        assert!(prefs.push_enabled);
        assert_eq!(prefs.license_expiring_days, 7);
        assert!(prefs.notify_license_expiring);
    }

    #[test]
    fn test_expiring_days_validation() {
        let valid_days = [1, 7, 14, 30];
        let invalid_days = [0, -1, 31, 100];
        
        for days in valid_days {
            assert!(days >= 1 && days <= 30);
        }
        
        for days in invalid_days {
            assert!(!(days >= 1 && days <= 30));
        }
    }
}
