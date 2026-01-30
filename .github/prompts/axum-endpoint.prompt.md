# Axum Endpoint Creation

Create a new Axum API endpoint for the License Server.

## Requirements

- Axum 0.7+ patterns
- SQLx for PostgreSQL queries
- JWT authentication via Claims extractor
- thiserror for error handling
- Proper response types

## Handler Template

```rust
// src/handlers/{name}.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use crate::{
    auth::Claims,
    error::AppError,
    models::{CreateInput, Response},
    services::{Name}Service,
    AppState,
};

/// {Description}
///
/// # Errors
/// - `401 Unauthorized` - Missing or invalid token
/// - `403 Forbidden` - Insufficient permissions
/// - `404 Not Found` - Resource not found
pub async fn create(
    State(state): State<AppState>,
    claims: Claims,
    Json(input): Json<CreateInput>,
) -> Result<(StatusCode, Json<Response>), AppError> {
    claims.require_role("admin")?;

    let service = {Name}Service::new(&state.pool);
    let result = service.create(input).await?;

    Ok((StatusCode::CREATED, Json(result)))
}

pub async fn get_by_id(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Response>, AppError> {
    let service = {Name}Service::new(&state.pool);
    let result = service.find_by_id(&id).await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(result))
}
```

## Router Template

```rust
// Add to src/routes/mod.rs
fn {name}_routes() -> Router<AppState> {
    Router::new()
        .route("/", post(handlers::{name}::create))
        .route("/:id", get(handlers::{name}::get_by_id))
        .route("/:id", put(handlers::{name}::update))
        .route("/:id", delete(handlers::{name}::delete))
}
```
