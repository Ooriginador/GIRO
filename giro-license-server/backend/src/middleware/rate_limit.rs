//! Rate Limiting Middleware
//!
//! Token bucket rate limiting using Redis.

use axum::{
    body::Body,
    http::{Request, Response, StatusCode},
    response::IntoResponse,
    Json,
};
use redis::AsyncCommands;
use serde_json::json;
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use tower::{Layer, Service};

/// Rate limit configuration
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum requests per window
    pub max_requests: u32,
    /// Window size in seconds
    pub window_seconds: u64,
    /// Key prefix for Redis
    pub key_prefix: String,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_requests: 100,
            window_seconds: 60,
            key_prefix: "rate_limit".to_string(),
        }
    }
}

impl RateLimitConfig {
    /// Create a new rate limit config
    pub fn new(max_requests: u32, window_seconds: u64) -> Self {
        Self {
            max_requests,
            window_seconds,
            ..Default::default()
        }
    }

    /// Set the key prefix
    pub fn with_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.key_prefix = prefix.into();
        self
    }
}

/// Rate limit layer
#[derive(Debug, Clone)]
pub struct RateLimitLayer {
    config: RateLimitConfig,
    redis_url: String,
}

impl RateLimitLayer {
    pub fn new(config: RateLimitConfig, redis_url: impl Into<String>) -> Self {
        Self {
            config,
            redis_url: redis_url.into(),
        }
    }
}

impl<S> Layer<S> for RateLimitLayer {
    type Service = RateLimitService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RateLimitService {
            inner,
            config: self.config.clone(),
            redis_url: self.redis_url.clone(),
        }
    }
}

/// Rate limit service
#[derive(Debug, Clone)]
pub struct RateLimitService<S> {
    inner: S,
    config: RateLimitConfig,
    redis_url: String,
}

impl<S> Service<Request<Body>> for RateLimitService<S>
where
    S: Service<Request<Body>, Response = Response<Body>> + Clone + Send + 'static,
    S::Future: Send,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let mut inner = self.inner.clone();
        let config = self.config.clone();
        let redis_url = self.redis_url.clone();

        Box::pin(async move {
            // Extract client IP for rate limiting
            let client_ip = req
                .headers()
                .get("x-forwarded-for")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.split(',').next().unwrap_or("unknown").trim().to_string())
                .or_else(|| {
                    req.headers()
                        .get("x-real-ip")
                        .and_then(|h| h.to_str().ok())
                        .map(|s| s.to_string())
                })
                .unwrap_or_else(|| "unknown".to_string());

            // Build rate limit key
            let key = format!("{}:{}", config.key_prefix, client_ip);

            // Check rate limit in Redis
            match check_rate_limit(&redis_url, &key, &config).await {
                Ok(allowed) => {
                    if allowed {
                        inner.call(req).await
                    } else {
                        let response = rate_limit_exceeded_response();
                        Ok(response)
                    }
                }
                Err(e) => {
                    // Log error but allow request (fail open)
                    tracing::warn!("Rate limit check failed: {:?}", e);
                    inner.call(req).await
                }
            }
        })
    }
}

/// Check rate limit using Redis
async fn check_rate_limit(
    redis_url: &str,
    key: &str,
    config: &RateLimitConfig,
) -> Result<bool, redis::RedisError> {
    let client = redis::Client::open(redis_url)?;
    let mut conn = client.get_multiplexed_async_connection().await?;

    // Increment counter and set expiry atomically using Lua script
    let script = redis::Script::new(
        r#"
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return current
        "#,
    );

    let current: u32 = script
        .key(key)
        .arg(config.window_seconds)
        .invoke_async(&mut conn)
        .await?;

    Ok(current <= config.max_requests)
}

/// Build rate limit exceeded response
fn rate_limit_exceeded_response() -> Response<Body> {
    let body = Json(json!({
        "success": false,
        "error": {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Too many requests. Please try again later."
        }
    }));

    let mut response = body.into_response();
    *response.status_mut() = StatusCode::TOO_MANY_REQUESTS;
    
    // Add rate limit headers
    response.headers_mut().insert(
        "Retry-After",
        "60".parse().unwrap(),
    );

    response
}

/// Rate limit info for a client
#[derive(Debug, Clone)]
pub struct RateLimitInfo {
    pub remaining: u32,
    pub reset_at: i64,
    pub limit: u32,
}

/// Get rate limit info for a client
pub async fn get_rate_limit_info(
    redis_url: &str,
    key: &str,
    config: &RateLimitConfig,
) -> Result<RateLimitInfo, redis::RedisError> {
    let client = redis::Client::open(redis_url)?;
    let mut conn = client.get_multiplexed_async_connection().await?;

    let current: Option<u32> = conn.get(key).await?;
    let ttl: i64 = conn.ttl(key).await.unwrap_or(config.window_seconds as i64);

    let used = current.unwrap_or(0);
    let remaining = config.max_requests.saturating_sub(used);
    let reset_at = chrono::Utc::now().timestamp() + ttl;

    Ok(RateLimitInfo {
        remaining,
        reset_at,
        limit: config.max_requests,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_config_default() {
        let config = RateLimitConfig::default();
        assert_eq!(config.max_requests, 100);
        assert_eq!(config.window_seconds, 60);
    }

    #[test]
    fn test_rate_limit_config_builder() {
        let config = RateLimitConfig::new(50, 30).with_prefix("api");
        assert_eq!(config.max_requests, 50);
        assert_eq!(config.window_seconds, 30);
        assert_eq!(config.key_prefix, "api");
    }
}
