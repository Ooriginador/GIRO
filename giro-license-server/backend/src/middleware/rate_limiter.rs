//! Rate Limiting
//!
//! Redis-based rate limiting for API protection.

use axum::{
    body::Body,
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use redis::AsyncCommands;
use std::net::IpAddr;

use crate::{errors::AppError, AppState};

const RATE_LIMIT_WINDOW: u64 = 60; // 1 minute  
const RATE_LIMIT_MAX_REQUESTS: i32 = 100;
const AUTH_RATE_LIMIT: i32 = 10; // Stricter for auth

/// General API rate limiting
pub async fn rate_limit_middleware(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let ip = extract_ip(&request);
    check_limit(&state, &format!("rl:{}", ip), RATE_LIMIT_MAX_REQUESTS).await?;
    Ok(next.run(request).await)
}

/// Stricter rate limit for authentication endpoints
pub async fn auth_rate_limit_middleware(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let ip = extract_ip(&request);
    check_limit(&state, &format!("auth_rl:{}", ip), AUTH_RATE_LIMIT).await?;
    Ok(next.run(request).await)
}

fn extract_ip(request: &Request<Body>) -> IpAddr {
    request
        .extensions()
        .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
        .map(|ci| ci.0.ip())
        .unwrap_or(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)))
}

async fn check_limit(state: &AppState, key: &str, max: i32) -> Result<(), AppError> {
    let mut conn = state.redis.clone();
    
    let count: i32 = conn
        .incr(key, 1)
        .await
        .map_err(|e| AppError::Internal(format!("Redis: {}", e)))?;
    
    if count == 1 {
        let _: () = conn.expire(key, RATE_LIMIT_WINDOW as i64).await.unwrap_or(());
    }
    
    if count > max {
        return Err(AppError::RateLimitExceeded);
    }
    
    Ok(())
}
