//! GIRO License Server
//!
//! Servidor de licenciamento para o ecossistema GIRO.
//! Gerencia ativação, validação e sincronização de licenças.

// Suppress warnings for functions/structs prepared for future features
#![allow(dead_code)]
#![allow(deprecated)] // TimeoutLayer::new deprecation

use axum::{
    http::{header, Method},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod dto;
mod errors;
mod middleware;
mod models;
mod repositories;
mod routes;
mod services;
mod state;
mod utils;

use config::Settings;
use errors::AppResult;
pub use state::AppState;

async fn create_app_state(settings: Settings) -> AppResult<AppState> {
    // Database pool
    let db = PgPoolOptions::new()
        .max_connections(settings.database.max_connections)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&settings.database.url)
        .await
        .map_err(|e| errors::AppError::Internal(format!("Database connection failed: {}", e)))?;

    tracing::info!("✅ Database connected");

    // Run migrations
    tracing::info!("🔄 Running migrations...");
    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .map_err(|e| errors::AppError::Internal(format!("Migrations failed: {}", e)))?;
    tracing::info!("✅ Migrations applied successfully");

    // Redis connection
    let redis_client = redis::Client::open(settings.redis.url.as_str())
        .map_err(|e| errors::AppError::Internal(format!("Redis client error: {}", e)))?;

    let redis = redis::aio::ConnectionManager::new(redis_client)
        .await
        .map_err(|e| errors::AppError::Internal(format!("Redis connection failed: {}", e)))?;

    tracing::info!("✅ Redis connected");

    Ok(AppState {
        db,
        redis,
        settings: Arc::new(settings),
    })
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "giro_license_server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 Starting GIRO License Server");

    // Load configuration
    let settings = Settings::from_env()?;
    tracing::info!("📝 Configuration loaded (env: {})", settings.app.env);

    // Create app state
    let state = create_app_state(settings.clone()).await?;

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::PATCH])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::HeaderName::from_static("x-api-key"),
        ]);

    // Build router
    let app = Router::new()
        .nest("/api/v1", routes::api_routes())
        .route("/metrics", axum::routing::get(routes::health::prometheus_metrics))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .layer(cors);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], settings.app.port));
    tracing::info!("🌐 Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("🛑 Shutdown signal received, starting graceful shutdown");
}
