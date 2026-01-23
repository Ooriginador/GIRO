//! API Routes
//!
//! HTTP route handlers.

pub mod api_keys;
pub mod auth;
pub mod backup;
pub mod hardware;
pub mod health;
pub mod licenses;
pub mod mercadopago;
pub mod metrics;
pub mod notifications;
pub mod profile;
pub mod stripe;
pub mod subscriptions;

use crate::AppState;
use axum::Router;

pub fn api_routes() -> Router<AppState> {
    Router::new()
        .nest("/health", health::health_routes())
        .nest("/auth", auth::auth_routes())
        .nest("/profile", profile::profile_routes())
        .nest("/licenses", licenses::license_routes())
        .nest("/hardware", hardware::hardware_routes())
        .nest("/metrics", metrics::metrics_routes())
        .nest("/api-keys", api_keys::api_key_routes())
        .nest("/stripe", stripe::stripe_routes())
        .nest("/subscriptions", subscriptions::subscription_routes())
        .nest("/notifications", notifications::notification_routes())
        .nest("/mercadopago", mercadopago::mercadopago_routes())
        .nest("/backups", backup::backup_routes())
}
