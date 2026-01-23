//! Mercado Pago Routes
use axum::{
    extract::{Json, State},
    routing::post,
    Router,
};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use crate::errors::{AppError, AppResult};
use crate::middleware::auth::AuthAdmin;
use crate::repositories::{PaymentRepository, AdminRepository};
use crate::models::payment::PaymentProvider;
use crate::AppState;

#[derive(Deserialize)]
pub struct CreatePreferenceRequest {
    pub title: String,
    pub price: f64,
    pub quantity: i32,
    pub external_reference: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct MPNotification {
    pub resource: Option<String>,
    pub topic: Option<String>,
    #[serde(rename = "type")]
    pub notification_type: Option<String>,
    pub data: Option<MPNotificationData>,
}

#[derive(Deserialize, Debug)]
pub struct MPNotificationData {
    pub id: String,
}

#[derive(Serialize)]
pub struct CreatePreferenceResponse {
    pub init_point: String,
    pub sandbox_init_point: String,
    pub id: String,
}

#[derive(Serialize)]
struct MPItem {
    title: String,
    quantity: i32,
    unit_price: f64,
    currency_id: String,
}

#[derive(Serialize)]
struct MPPreference {
    items: Vec<MPItem>,
    external_reference: Option<String>,
    back_urls: MPBackUrls,
    auto_return: String,
}

#[derive(Serialize)]
struct MPBackUrls {
    success: String,
    failure: String,
    pending: String,
}

pub fn mercadopago_routes() -> Router<AppState> {
    Router::new()
        .route("/create_preference", post(create_preference))
        .route("/webhook", post(handle_webhook))
}

async fn create_preference(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Json(payload): Json<CreatePreferenceRequest>,
) -> AppResult<Json<CreatePreferenceResponse>> {
    let access_token = &state.settings.mercadopago.access_token;
    let frontend_url = &state.settings.app.frontend_url;

    // Debug logging
    tracing::info!("[MercadoPago] Creating preference for admin: {}", auth.admin_id);
    tracing::info!("[MercadoPago] Frontend URL: {}", frontend_url);
    tracing::info!("[MercadoPago] Token starts with: {}", &access_token.chars().take(10).collect::<String>());
    tracing::info!("[MercadoPago] Payload: title={}, price={}, qty={}", payload.title, payload.price, payload.quantity);

    // Use payload.external_reference if provided, otherwise construct from auth
    let external_reference = payload.external_reference.clone().unwrap_or_else(|| {
        format!("{}:{}", auth.admin_id, payload.title.split_whitespace().last().unwrap_or("monthly").to_lowercase())
    });

    if access_token == "not_configured" {
        return Err(AppError::Internal("MERCADO_PAGO_ACCESS_TOKEN not set".to_string()));
    }

    let client = reqwest::Client::new();

    let preference = MPPreference {
        items: vec![MPItem {
            title: payload.title.clone(),
            quantity: payload.quantity,
            unit_price: payload.price,
            currency_id: "BRL".to_string(),
        }],
        external_reference: Some(external_reference.clone()),
        back_urls: MPBackUrls {
            success: format!("{}/success", frontend_url),
            failure: format!("{}/failure", frontend_url),
            pending: format!("{}/pending", frontend_url),
        },
        auto_return: "approved".to_string(),
    };

    let res = client
        .post("https://api.mercadopago.com/checkout/preferences")
        .header("Authorization", format!("Bearer {}", access_token))
        .json(&preference)
        .send()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if !res.status().is_success() {
        let status_code = res.status();
        let error_text = res.text().await.unwrap_or_default();
        tracing::error!("Mercado Pago Error [{}]: {}", status_code, error_text);
        
        // Parse error for more helpful message
        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            let message = error_json["message"].as_str()
                .or_else(|| error_json["error"].as_str())
                .unwrap_or("Erro desconhecido");
            return Err(AppError::BadRequest(format!("MercadoPago: {}", message)));
        }
        return Err(AppError::BadRequest(format!("MercadoPago error: {}", error_text)));
    }

    let mp_res: serde_json::Value = res
        .json()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let init_point = mp_res["init_point"]
        .as_str()
        .ok_or_else(|| AppError::Internal("Missing init_point in MP response".to_string()))?
        .to_string();
        
    let sandbox_init_point = mp_res["sandbox_init_point"]
        .as_str()
        .unwrap_or(&init_point)
        .to_string();

    let id = mp_res["id"]
        .as_str()
        .ok_or_else(|| AppError::Internal("Missing id in MP response".to_string()))?
        .to_string();

    // Create a pending payment record in our database
    let payment_repo = PaymentRepository::new(state.db.clone());
    payment_repo.create(
        auth.admin_id,
        rust_decimal::Decimal::from_f64_retain(payload.price).unwrap_or_default(),
        PaymentProvider::MercadoPago,
        Some(id.clone()),
        Some(payload.title),
        payload.quantity
    ).await?;

    Ok(Json(CreatePreferenceResponse {
        init_point,
        sandbox_init_point,
        id,
    }))
}

async fn handle_webhook(
    State(state): State<AppState>,
    Json(payload): Json<MPNotification>,
) -> AppResult<StatusCode> {
    tracing::info!("Received Mercado Pago webhook: {:?}", payload);

    // Get payment ID from either old or new notification format
    let payment_id = if let Some(topic) = &payload.topic {
        if topic == "payment" {
            payload.resource.as_ref().and_then(|r| r.split('/').last())
        } else {
            None
        }
    } else if let Some(ntype) = &payload.notification_type {
        if ntype == "payment" {
            payload.data.as_ref().map(|d| d.id.as_str())
        } else {
            None
        }
    } else {
        None
    };

    let payment_id = match payment_id {
        Some(id) => id,
        None => return Ok(StatusCode::OK), // Ignore non-payment notifications
    };

    tracing::info!("Processing Mercado Pago payment: {}", payment_id);

    // Fetch actual payment info from Mercado Pago
    let access_token = &state.settings.mercadopago.access_token;
    let client = reqwest::Client::new();
    let res = client
        .get(format!("https://api.mercadopago.com/v1/payments/{}", payment_id))
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if !res.status().is_success() {
        tracing::error!("Failed to fetch payment info from MP: {}", payment_id);
        return Ok(StatusCode::OK); // Return OK to avoid retries if payment not found
    }

    let payment_info: serde_json::Value = res
        .json()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let status = payment_info["status"].as_str().unwrap_or_default();
    let external_reference = payment_info["external_reference"].as_str().unwrap_or_default();
    
    // Check if it's approved
    if status == "approved" {
        tracing::info!("Payment approved: {}. Provisioning license...", payment_id);
        
        let payment_repo = PaymentRepository::new(state.db.clone());
        
        // Try to find the payment by provider_id (preference id or payment id)
        // Note: For MP, if we saved the preference ID during creation, we might need to check how it maps to final payment ID
        // Often external_reference is the best source of truth
        
        // external_reference should contain admin_id:plan_type
        let parts: Vec<&str> = external_reference.split(':').collect();
        if parts.len() >= 2 {
            let admin_id = uuid::Uuid::parse_str(parts[0]).map_err(|_| AppError::BadRequest("Invalid admin_id in reference".to_string()))?;
            let plan_type = parts[1].parse::<crate::models::PlanType>().map_err(|_| AppError::BadRequest("Invalid plan_type in reference".to_string()))?;
            
            // Logic to create license (provisioning)
            let license_service = state.license_service();
            let licenses = license_service.create_licenses(admin_id, plan_type, 1).await?;
            
            // Mark payment as completed in our DB
            if let Some(payment) = payment_repo.find_by_provider_id(payment_id).await? {
                payment_repo.complete(payment.id, payment_info["receipt_url"].as_str().map(|s| s.to_string())).await?;
            } else {
                // If we didn't find it by payment_id, maybe we can create it now or find by external_reference (though find_by_provider_id is preferred)
                tracing::info!("Payment record not found for {}, creating completed one...", payment_id);
            }
            
            // Send license email to admin
            if !licenses.is_empty() {
                let admin_repo = AdminRepository::new(state.db.clone());
                if let Ok(Some(admin)) = admin_repo.find_by_id(admin_id).await {
                    let email_service = state.email_service();
                    let _ = email_service.send_license_issued(
                        &admin.email,
                        &admin.name,
                        &licenses[0].license_key
                    ).await;
                }
            }
            
            tracing::info!("Provisioned {} license(s) for admin {}", licenses.len(), admin_id);
        } else {
            tracing::warn!("Invalid external_reference format: {}", external_reference);
        }
    }

    Ok(StatusCode::OK)
}
