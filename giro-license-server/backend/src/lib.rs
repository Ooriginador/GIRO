//! GIRO License Server - API de Licenciamento
//!
//! Módulos:
//! - `config`: Configurações da aplicação
//! - `dto`: Data Transfer Objects
//! - `errors`: Tipos de erro unificados
//! - `middleware`: Middlewares (auth, rate limit)
//! - `models`: Entidades do domínio
//! - `repositories`: Acesso a dados (PostgreSQL)
//! - `routes`: Handlers HTTP
//! - `services`: Lógica de negócio
//! - `state`: Estado da aplicação
//! - `utils`: Utilitários (JWT, hashing, etc)

// Allow dead code warnings for unused structs/functions during development
// These are prepared for future features (license transfer, stripe webhooks, etc.)
#![allow(dead_code)]

pub mod config;
pub mod dto;
pub mod errors;
pub mod middleware;
pub mod models;
pub mod repositories;
pub mod routes;
pub mod services;
pub mod state;
pub mod utils;

pub use config::Settings;
pub use errors::{AppError, AppResult};
pub use state::AppState;
