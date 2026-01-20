//! Módulo de Banco de Dados - Conexão SQLite via SQLx
pub mod decimal_config;

use crate::error::AppResult;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::path::Path;
use std::str::FromStr;

/// Gerenciador de conexão com o banco de dados
pub struct DatabaseManager {
    pool: SqlitePool,
}

impl DatabaseManager {
    /// Cria nova instância e conecta ao banco
    pub async fn new(db_path: &str) -> AppResult<Self> {
        // Garante que o diretório existe
        if let Some(parent) = Path::new(db_path).parent() {
            std::fs::create_dir_all(parent)?;
        }

        let options = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path))?
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        // Executar migrations automaticamente ao iniciar
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e.to_string()))?;

        // Apply runtime PRAGMA and maintenance tasks
        // Ensure WAL checkpoint and reasonable autockpoint
        sqlx::query("PRAGMA wal_autocheckpoint = 1000")
            .execute(&pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e.to_string()))?;

        // Perform a truncate checkpoint to keep DB file consistent after migrations
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&pool)
            .await
            .map_err(|e| crate::error::AppError::Database(e.to_string()))?;

        Ok(Self { pool })
    }

    /// Retorna referência ao pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Consome o manager e retorna o pool
    pub fn into_pool(self) -> SqlitePool {
        self.pool
    }

    /// Fecha conexões
    pub async fn close(&self) {
        self.pool.close().await;
    }
}
