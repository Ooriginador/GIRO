use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Settings {
    pub app: AppSettings,
    pub database: DatabaseSettings,
    pub redis: RedisSettings,
    pub jwt: JwtSettings,
    pub rate_limit: RateLimitSettings,
    pub email: EmailSettings,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AppSettings {
    pub env: String,
    pub port: u16,
    pub host: String,
    pub secret: String,
    pub frontend_url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseSettings {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RedisSettings {
    pub url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JwtSettings {
    pub secret: String,
    pub expiration: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RateLimitSettings {
    pub requests: u64,
    pub window: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EmailSettings {
    pub resend_api_key: String,
    pub from_email: String,
    pub from_name: String,
}

impl Settings {
    pub fn from_env() -> Result<Self, anyhow::Error> {
        // Load .env file if exists
        dotenvy::dotenv().ok();

        Ok(Settings {
            app: AppSettings {
                env: env::var("APP_ENV").unwrap_or_else(|_| "development".to_string()),
                port: env::var("PORT")
                    .or_else(|_| env::var("APP_PORT"))
                    .unwrap_or_else(|_| "3000".to_string())
                    .parse()?,
                host: env::var("APP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
                secret: env::var("APP_SECRET")?,
                frontend_url: env::var("FRONTEND_URL")
                    .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            },
            database: DatabaseSettings {
                url: env::var("DATABASE_URL")?,
                max_connections: env::var("DATABASE_MAX_CONNECTIONS")
                    .unwrap_or_else(|_| "20".to_string())
                    .parse()?,
            },
            redis: RedisSettings {
                url: env::var("REDIS_URL")?,
            },
            jwt: JwtSettings {
                secret: env::var("JWT_SECRET")?,
                expiration: env::var("JWT_EXPIRATION")
                    .unwrap_or_else(|_| "86400".to_string())
                    .parse()?,
            },
            rate_limit: RateLimitSettings {
                requests: env::var("RATE_LIMIT_REQUESTS")
                    .unwrap_or_else(|_| "100".to_string())
                    .parse()?,
                window: env::var("RATE_LIMIT_WINDOW")
                    .unwrap_or_else(|_| "60".to_string())
                    .parse()?,
            },
            email: EmailSettings {
                resend_api_key: env::var("RESEND_API_KEY")
                    .unwrap_or_else(|_| "not_configured".to_string()),
                from_email: env::var("EMAIL_FROM")
                    .unwrap_or_else(|_| "noreply@giro.com.br".to_string()),
                from_name: env::var("EMAIL_FROM_NAME")
                    .unwrap_or_else(|_| "GIRO License Server".to_string()),
            },
        })
    }
}
