//! Comandos Tauri para Veículos - Motopeças
//!
//! Expõe funcionalidades de veículos e compatibilidades para o frontend

use crate::error::AppResult;
use crate::models::{
    AddProductCompatibility, CreateVehicleBrand, CreateVehicleModel, CreateVehicleYear,
    ProductCompatibilityWithVehicle, SaveProductCompatibilities, VehicleBrand, VehicleComplete,
    VehicleModel, VehicleYear,
};
use crate::repositories::VehicleRepository;
use crate::AppState;
use tauri::State;

// ═══════════════════════════════════════════════════════════════════════════
// MARCAS
// ═══════════════════════════════════════════════════════════════════════════

/// Lista todas as marcas de veículos ativas
#[tauri::command]
pub async fn get_vehicle_brands(state: State<'_, AppState>) -> AppResult<Vec<VehicleBrand>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_all_brands().await
}

/// Busca uma marca por ID
#[tauri::command]
pub async fn get_vehicle_brand_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<VehicleBrand>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_brand_by_id(&id).await
}

/// Cria uma nova marca
#[tauri::command]
pub async fn create_vehicle_brand(
    input: CreateVehicleBrand,
    state: State<'_, AppState>,
) -> AppResult<VehicleBrand> {
    let repo = VehicleRepository::new(state.pool());
    repo.create_brand(input).await
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS
// ═══════════════════════════════════════════════════════════════════════════

/// Lista modelos de uma marca
#[tauri::command]
pub async fn get_vehicle_models(
    brand_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<VehicleModel>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_models_by_brand(&brand_id).await
}

/// Busca um modelo por ID
#[tauri::command]
pub async fn get_vehicle_model_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<VehicleModel>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_model_by_id(&id).await
}

/// Cria um novo modelo
#[tauri::command]
pub async fn create_vehicle_model(
    input: CreateVehicleModel,
    state: State<'_, AppState>,
) -> AppResult<VehicleModel> {
    let repo = VehicleRepository::new(state.pool());
    repo.create_model(input).await
}

// ═══════════════════════════════════════════════════════════════════════════
// ANOS
// ═══════════════════════════════════════════════════════════════════════════

/// Lista anos de um modelo
#[tauri::command]
pub async fn get_vehicle_years(
    model_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<VehicleYear>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_years_by_model(&model_id).await
}

/// Busca um ano por ID
#[tauri::command]
pub async fn get_vehicle_year_by_id(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<VehicleYear>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_year_by_id(&id).await
}

/// Cria um novo ano
#[tauri::command]
pub async fn create_vehicle_year(
    input: CreateVehicleYear,
    state: State<'_, AppState>,
) -> AppResult<VehicleYear> {
    let repo = VehicleRepository::new(state.pool());
    repo.create_year(input).await
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSCA DE VEÍCULOS
// ═══════════════════════════════════════════════════════════════════════════

/// Busca veículos por texto (marca, modelo, ano)
#[tauri::command]
pub async fn search_vehicles(
    query: String,
    limit: Option<i32>,
    state: State<'_, AppState>,
) -> AppResult<Vec<VehicleComplete>> {
    let repo = VehicleRepository::new(state.pool());
    repo.search_vehicles(&query, limit.unwrap_or(20)).await
}

/// Obtém veículo completo por ID do ano
#[tauri::command]
pub async fn get_complete_vehicle(
    year_id: String,
    state: State<'_, AppState>,
) -> AppResult<Option<VehicleComplete>> {
    let repo = VehicleRepository::new(state.pool());
    repo.get_complete_vehicle(&year_id).await
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPATIBILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/// Lista compatibilidades de um produto
#[tauri::command]
pub async fn get_product_compatibilities(
    product_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<ProductCompatibilityWithVehicle>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_product_compatibilities(&product_id).await
}

/// Adiciona uma compatibilidade
#[tauri::command]
pub async fn add_product_compatibility(
    input: AddProductCompatibility,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let repo = VehicleRepository::new(state.pool());
    repo.add_compatibility(input).await?;
    Ok(())
}

/// Remove uma compatibilidade
#[tauri::command]
pub async fn remove_product_compatibility(
    product_id: String,
    vehicle_year_id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let repo = VehicleRepository::new(state.pool());
    repo.remove_compatibility(&product_id, &vehicle_year_id)
        .await
}

/// Salva todas as compatibilidades de um produto (substitui existentes)
#[tauri::command]
pub async fn save_product_compatibilities(
    input: SaveProductCompatibilities,
    state: State<'_, AppState>,
) -> AppResult<Vec<ProductCompatibilityWithVehicle>> {
    let repo = VehicleRepository::new(state.pool());
    repo.save_product_compatibilities(input).await
}

/// Lista IDs de produtos compatíveis com um veículo
#[tauri::command]
pub async fn get_products_by_vehicle(
    vehicle_year_id: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<String>> {
    let repo = VehicleRepository::new(state.pool());
    repo.find_products_by_vehicle(&vehicle_year_id).await
}
