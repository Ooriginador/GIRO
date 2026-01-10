//! Stripe Integration Routes
//!
//! Webhooks e checkout sessions para pagamentos recorrentes.
//! 
//! TODO: Full Stripe integration pending - this is a placeholder.

use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::{
    errors::{AppError, AppResult},
    middleware::auth::AuthAdmin,
    AppState,
};

/// Stripe webhook secret for signature verification
fn get_webhook_secret() -> String {
    std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default()
}

/// Get Stripe API key
fn get_stripe_key() -> String {
    std::env::var("STRIPE_SECRET_KEY").unwrap_or_default()
}

/// Check if Stripe is configured
fn is_stripe_configured() -> bool {
    !get_stripe_key().is_empty()
}

/// Stripe routes
pub fn stripe_routes() -> Router<AppState> {
    Router::new()
        .route("/webhook", post(handle_webhook))
        .route("/checkout", post(create_checkout_session))
        .route("/portal", get(create_portal_session))
        .route("/prices", get(get_prices))
        .route("/status", get(get_stripe_status))
}

/// Price configuration
#[derive(Debug, Serialize)]
pub struct PriceInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub price_monthly: i64,
    pub price_yearly: i64,
    pub max_devices: i32,
    pub features: Vec<&'static str>,
}

/// Get Stripe status
async fn get_stripe_status() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "configured": is_stripe_configured(),
        "mode": if get_stripe_key().starts_with("sk_live_") { "live" } else { "test" }
    }))
}

/// Get available prices
async fn get_prices() -> Json<Vec<PriceInfo>> {
    let prices = vec![
        PriceInfo {
            id: "basic",
            name: "Basic",
            description: "Para pequenos negócios",
            price_monthly: 4990,  // R$ 49,90
            price_yearly: 47900,  // R$ 479,00 (2 meses grátis)
            max_devices: 1,
            features: vec![
                "1 dispositivo",
                "Suporte por email",
                "Atualizações incluídas",
            ],
        },
        PriceInfo {
            id: "professional",
            name: "Professional",
            description: "Para negócios em crescimento",
            price_monthly: 9990,  // R$ 99,90
            price_yearly: 95900,  // R$ 959,00
            max_devices: 3,
            features: vec![
                "Até 3 dispositivos",
                "Suporte prioritário",
                "Relatórios avançados",
                "Backup na nuvem",
            ],
        },
        PriceInfo {
            id: "enterprise",
            name: "Enterprise",
            description: "Para grandes operações",
            price_monthly: 19990, // R$ 199,90
            price_yearly: 191900, // R$ 1.919,00
            max_devices: -1, // unlimited
            features: vec![
                "Dispositivos ilimitados",
                "Suporte 24/7",
                "API access",
                "Integrações personalizadas",
                "Gerente de conta dedicado",
            ],
        },
    ];

    Json(prices)
}

/// Create checkout session request
#[derive(Debug, Deserialize)]
pub struct CreateCheckoutRequest {
    pub plan: String,          // basic, professional, enterprise
    pub interval: String,      // monthly, yearly
    pub success_url: String,
    pub cancel_url: String,
    #[serde(default)]
    pub customer_email: Option<String>,
}

/// Create checkout session response
#[derive(Debug, Serialize)]
pub struct CheckoutResponse {
    pub session_id: String,
    pub url: String,
}

/// Create a Stripe checkout session
async fn create_checkout_session(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, email: _ }: AuthAdmin,
    Json(payload): Json<CreateCheckoutRequest>,
) -> AppResult<impl IntoResponse> {
    if !is_stripe_configured() {
        return Err(AppError::Internal("Stripe not configured".to_string()));
    }

    // Validate plan
    if !["basic", "professional", "enterprise"].contains(&payload.plan.as_str()) {
        return Err(AppError::BadRequest("Invalid plan".to_string()));
    }

    // Validate interval
    if !["monthly", "yearly"].contains(&payload.interval.as_str()) {
        return Err(AppError::BadRequest("Invalid interval".to_string()));
    }

    // TODO: Implement actual Stripe checkout session creation
    // For now, return a placeholder
    tracing::info!(
        "Creating checkout session for admin {} - plan: {}, interval: {}",
        admin_id, payload.plan, payload.interval
    );

    Ok(Json(CheckoutResponse {
        session_id: format!("cs_placeholder_{}", admin_id),
        url: format!(
            "https://checkout.stripe.com/placeholder?plan={}&interval={}",
            payload.plan, payload.interval
        ),
    }))
}

/// Create customer portal session
async fn create_portal_session(
    State(_state): State<AppState>,
    AuthAdmin { admin_id, .. }: AuthAdmin,
) -> AppResult<impl IntoResponse> {
    if !is_stripe_configured() {
        return Err(AppError::Internal("Stripe not configured".to_string()));
    }

    // TODO: Look up Stripe customer ID from database and create portal session
    Ok(Json(serde_json::json!({
        "url": format!("https://billing.stripe.com/p/session/{}", admin_id)
    })))
}

/// Handle Stripe webhook
async fn handle_webhook(
    State(_state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> AppResult<impl IntoResponse> {
    let webhook_secret = get_webhook_secret();
    if webhook_secret.is_empty() {
        tracing::warn!("Stripe webhook secret not configured");
        return Ok(StatusCode::OK);
    }

    // Get signature from headers
    let signature = headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing stripe-signature header".to_string()))?;

    // Get payload as string
    let payload = std::str::from_utf8(&body)
        .map_err(|_| AppError::BadRequest("Invalid payload encoding".to_string()))?;

    tracing::info!("Received Stripe webhook with signature: {}...", &signature[..20.min(signature.len())]);

    // TODO: Verify signature with Stripe library
    // For now, just log the event type if present
    if let Ok(event) = serde_json::from_str::<serde_json::Value>(payload) {
        if let Some(event_type) = event.get("type").and_then(|t| t.as_str()) {
            tracing::info!("Stripe webhook event type: {}", event_type);
            
            match event_type {
                "checkout.session.completed" => {
                    tracing::info!("Checkout completed - TODO: Create license");
                }
                "customer.subscription.created" => {
                    tracing::info!("Subscription created - TODO: Activate license");
                }
                "customer.subscription.deleted" => {
                    tracing::warn!("Subscription cancelled - TODO: Suspend license");
                }
                "invoice.paid" => {
                    tracing::info!("Invoice paid - TODO: Extend license");
                }
                "invoice.payment_failed" => {
                    tracing::warn!("Payment failed - TODO: Send reminder");
                }
                _ => {
                    tracing::debug!("Unhandled webhook event: {}", event_type);
                }
            }
        }
    }

    Ok(StatusCode::OK)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stripe_not_configured() {
        assert!(!is_stripe_configured());
    }

    #[test]
    fn test_get_prices_valid() {
        // Prices should have valid yearly discount
        let prices = vec![
            (4990_i64, 47900_i64),   // Basic
            (9990, 95900),           // Professional
            (19990, 191900),         // Enterprise
        ];

        for (monthly, yearly) in prices {
            assert!(monthly > 0);
            assert!(yearly > 0);
            assert!(yearly < monthly * 12, "Yearly should be cheaper than 12 months");
        }
    }
}
