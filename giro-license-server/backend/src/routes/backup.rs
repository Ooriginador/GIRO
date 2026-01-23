//! Backup Routes
//!
//! Handles cloud backup upload, download, and listing.

use axum::{
    body::Bytes,
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::Serialize;
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::middleware::auth::AuthAdmin;
use crate::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BackupMeta {
    pub id: Uuid,
    pub license_id: Uuid,
    pub file_key: String,
    pub file_size_bytes: i64,
    pub checksum: Option<String>,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct UploadBackupResponse {
    pub id: Uuid,
    pub file_key: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct BackupListResponse {
    pub backups: Vec<BackupMeta>,
    pub total: i64,
}

pub fn backup_routes() -> Router<AppState> {
    Router::new()
        .route("/", post(upload_backup).get(list_backups))
        .route("/{id}", get(get_backup).delete(delete_backup))
        .route("/{id}/download", get(download_backup))
}

/// POST /backups - Upload a new backup
async fn upload_backup(
    State(state): State<AppState>,
    auth: AuthAdmin,
    body: Bytes,
) -> AppResult<Json<UploadBackupResponse>> {
    // Get the license for this admin
    let license_id: Option<Uuid> = sqlx::query_scalar(
        r#"SELECT id FROM licenses WHERE admin_id = $1 LIMIT 1"#
    )
    .bind(auth.admin_id)
    .fetch_optional(&state.db)
    .await?;

    let license_id = license_id.ok_or_else(|| AppError::NotFound("No license found for this admin".into()))?;

    // Generate unique file key
    let file_key = format!("backups/{}/{}.db", auth.admin_id, chrono::Utc::now().timestamp());
    let file_size = body.len() as i64;

    // Upload to S3
    state.s3_service()?.upload(&file_key, body.to_vec()).await?;

    let backup_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO backups (license_id, admin_id, file_key, file_size_bytes)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#
    )
    .bind(license_id)
    .bind(auth.admin_id)
    .bind(&file_key)
    .bind(file_size)
    .fetch_one(&state.db)
    .await?;

    tracing::info!(
        admin_id = %auth.admin_id,
        backup_id = %backup_id,
        file_size = file_size,
        "Backup uploaded successfully"
    );

    Ok(Json(UploadBackupResponse {
        id: backup_id,
        file_key,
        message: "Backup uploaded successfully".into(),
    }))
}

/// GET /backups - List all backups for the current user
async fn list_backups(
    State(state): State<AppState>,
    auth: AuthAdmin,
) -> AppResult<Json<BackupListResponse>> {
    let backups: Vec<BackupMeta> = sqlx::query_as(
        r#"
        SELECT 
            b.id,
            b.license_id,
            b.file_key,
            b.file_size_bytes,
            b.checksum,
            b.description,
            b.created_at
        FROM backups b
        JOIN licenses l ON b.license_id = l.id
        WHERE l.admin_id = $1
        ORDER BY b.created_at DESC
        LIMIT 50
        "#
    )
    .bind(auth.admin_id)
    .fetch_all(&state.db)
    .await?;

    let total = backups.len() as i64;

    Ok(Json(BackupListResponse { backups, total }))
}

/// GET /backups/:id - Get a specific backup metadata
async fn get_backup(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Path(backup_id): Path<Uuid>,
) -> AppResult<Json<BackupMeta>> {
    let backup: Option<BackupMeta> = sqlx::query_as(
        r#"
        SELECT 
            b.id,
            b.license_id,
            b.file_key,
            b.file_size_bytes,
            b.checksum,
            b.description,
            b.created_at
        FROM backups b
        JOIN licenses l ON b.license_id = l.id
        WHERE b.id = $1 AND l.admin_id = $2
        "#
    )
    .bind(backup_id)
    .bind(auth.admin_id)
    .fetch_optional(&state.db)
    .await?;

    let backup = backup.ok_or_else(|| AppError::NotFound("Backup not found".into()))?;

    Ok(Json(backup))
}

/// DELETE /backups/:id - Delete a backup
async fn delete_backup(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Path(backup_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    // Get file_key before deleting from DB
    let file_key: Option<String> = sqlx::query_scalar(
        r#"SELECT file_key FROM backups WHERE id = $1 AND admin_id = $2"#
    )
    .bind(backup_id)
    .bind(auth.admin_id)
    .fetch_optional(&state.db)
    .await?;

    let file_key = file_key.ok_or_else(|| AppError::NotFound("Backup not found".into()))?;

    // Delete from S3
    state.s3_service()?.delete(&file_key).await?;

    let result = sqlx::query(
        r#"
        DELETE FROM backups
        WHERE id = $1 AND admin_id = $2
        "#
    )
    .bind(backup_id)
    .bind(auth.admin_id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Backup not found".into()));
    }

    tracing::info!(admin_id = %auth.admin_id, backup_id = %backup_id, "Backup deleted");

    Ok(StatusCode::NO_CONTENT)
}

/// GET /backups/:id/download - Download a backup file
async fn download_backup(
    State(state): State<AppState>,
    auth: AuthAdmin,
    Path(backup_id): Path<Uuid>,
) -> AppResult<(axum::http::HeaderMap, Vec<u8>)> {
    let backup: Option<BackupMeta> = sqlx::query_as(
        r#"
        SELECT 
            b.id,
            b.license_id,
            b.file_key,
            b.file_size_bytes,
            b.checksum,
            b.description,
            b.created_at
        FROM backups b
        JOIN licenses l ON b.license_id = l.id
        WHERE b.id = $1 AND l.admin_id = $2
        "#
    )
    .bind(backup_id)
    .bind(auth.admin_id)
    .fetch_optional(&state.db)
    .await?;

    let backup = backup.ok_or_else(|| AppError::NotFound("Backup not found".into()))?;

    // Download from S3
    let data = state.s3_service()?.download(&backup.file_key).await?;

    let filename = format!("{}.db", backup.id);

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("application/x-sqlite3"),
    );
    headers.insert(
        axum::http::header::CONTENT_DISPOSITION,
        axum::http::HeaderValue::from_str(&format!("attachment; filename=\"{}\"", filename))
            .map_err(|e| AppError::Internal(format!("Invalid header value: {}", e)))?,
    );

    Ok((headers, data))
}
