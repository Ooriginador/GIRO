//! Comandos LGPD - Hard Delete, Anonymização e Portabilidade de Dados

use crate::error::AppResult;
use crate::repositories::{CustomerRepository, EmployeeRepository};
use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct HardDeleteResult {
    pub success: bool,
    pub deleted_records: u32,
    pub anonymized_records: u32,
}

#[derive(Debug, Serialize)]
pub struct DataExportMetadata {
    pub export_version: String,
    pub exported_at: String,
    pub subject: String,
    pub total_records: u32,
    pub format: String,
    pub encoding: String,
}

#[derive(Debug, Serialize)]
pub struct CustomerDataExport {
    pub metadata: DataExportMetadata,
    pub personal_info: serde_json::Value,
    pub vehicles: Vec<serde_json::Value>,
    pub service_orders: Vec<serde_json::Value>,
    pub sales_history: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct EmployeeDataExport {
    pub metadata: DataExportMetadata,
    pub personal_info: serde_json::Value,
    pub cash_sessions: Vec<serde_json::Value>,
    pub sales_history: Vec<serde_json::Value>,
}

/// LGPD: Hard delete de cliente com anonimização de histórico
#[tauri::command]
pub async fn lgpd_hard_delete_customer(
    customer_id: String,
    state: State<'_, AppState>,
) -> AppResult<HardDeleteResult> {
    let pool = state.pool();
    let mut tx = pool.begin().await?;

    let mut deleted_records = 0;
    let mut anonymized_records = 0;

    // 1. Anonimizar dados do cliente em vendas
    let sales_updated = sqlx::query("UPDATE sales SET customer_id = NULL WHERE customer_id = ?")
        .bind(&customer_id)
        .execute(&mut *tx)
        .await?;
    anonymized_records += sales_updated.rows_affected() as u32;

    // 2. Anonimizar em ordens de serviço
    let so_updated =
        sqlx::query("UPDATE service_orders SET customer_id = NULL WHERE customer_id = ?")
            .bind(&customer_id)
            .execute(&mut *tx)
            .await?;
    anonymized_records += so_updated.rows_affected() as u32;

    // 3. Deletar veículos do cliente permanentemente
    let vehicles_deleted = sqlx::query("DELETE FROM customer_vehicles WHERE customer_id = ?")
        .bind(&customer_id)
        .execute(&mut *tx)
        .await?;
    deleted_records += vehicles_deleted.rows_affected() as u32;

    // 4. Deletar cliente permanentemente
    let customer_deleted = sqlx::query("DELETE FROM customers WHERE id = ?")
        .bind(&customer_id)
        .execute(&mut *tx)
        .await?;
    deleted_records += customer_deleted.rows_affected() as u32;

    tx.commit().await?;

    tracing::info!(
        "LGPD: Hard delete de cliente {} - {} registros deletados, {} anonimizados",
        customer_id,
        deleted_records,
        anonymized_records
    );

    Ok(HardDeleteResult {
        success: true,
        deleted_records,
        anonymized_records,
    })
}

/// LGPD: Hard delete de funcionário com anonimização de histórico
#[tauri::command]
pub async fn lgpd_hard_delete_employee(
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<HardDeleteResult> {
    let pool = state.pool();
    let mut tx = pool.begin().await?;

    let mut deleted_records = 0;
    let mut anonymized_records = 0;

    // 1. Anonimizar dados do funcionário em vendas
    let sales_updated = sqlx::query("UPDATE sales SET employee_id = NULL WHERE employee_id = ?")
        .bind(&employee_id)
        .execute(&mut *tx)
        .await?;
    anonymized_records += sales_updated.rows_affected() as u32;

    // 2. Anonimizar em sessões de caixa
    let cash_updated =
        sqlx::query("UPDATE cash_sessions SET employee_id = NULL WHERE employee_id = ?")
            .bind(&employee_id)
            .execute(&mut *tx)
            .await?;
    anonymized_records += cash_updated.rows_affected() as u32;

    // 3. Anonimizar em logs de auditoria
    let audit_updated = sqlx::query(
        "UPDATE audit_logs SET user_id = 'ANONYMIZED', user_name = 'ANONYMIZED' WHERE user_id = ?",
    )
    .bind(&employee_id)
    .execute(&mut *tx)
    .await?;
    anonymized_records += audit_updated.rows_affected() as u32;

    // 4. Deletar funcionário permanentemente
    let employee_deleted = sqlx::query("DELETE FROM employees WHERE id = ?")
        .bind(&employee_id)
        .execute(&mut *tx)
        .await?;
    deleted_records += employee_deleted.rows_affected() as u32;

    tx.commit().await?;

    tracing::info!(
        "LGPD: Hard delete de funcionário {} - {} registros deletados, {} anonimizados",
        employee_id,
        deleted_records,
        anonymized_records
    );

    Ok(HardDeleteResult {
        success: true,
        deleted_records,
        anonymized_records,
    })
}

/// LGPD: Exportar dados do cliente para portabilidade (Art. 18)
#[tauri::command]
pub async fn lgpd_export_customer_data(
    customer_id: String,
    state: State<'_, AppState>,
) -> AppResult<CustomerDataExport> {
    let pool = state.pool();
    let repo = CustomerRepository::new(pool);

    // Dados pessoais
    let customer =
        repo.find_by_id(&customer_id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Customer".to_string(),
                id: customer_id.clone(),
            })?;

    let personal_info = serde_json::to_value(&customer)?;

    // Veículos
    let vehicles = repo.find_customer_vehicles(&customer_id).await?;
    let vehicles_json: Vec<serde_json::Value> = vehicles
        .into_iter()
        .map(|v| serde_json::to_value(v).unwrap_or_default())
        .collect();

    // Ordens de serviço
    let service_orders: Vec<serde_json::Value> = sqlx::query(
        r#"SELECT id, vehicle_id, description, status, total, created_at, updated_at
           FROM service_orders WHERE customer_id = ? ORDER BY created_at DESC"#,
    )
    .bind(&customer_id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| {
        use sqlx::Row;
        serde_json::json!({
            "id": row.get::<String, _>("id"),
            "vehicle_id": row.get::<Option<String>, _>("vehicle_id"),
            "description": row.get::<Option<String>, _>("description"),
            "status": row.get::<String, _>("status"),
            "total": row.get::<f64, _>("total"),
            "created_at": row.get::<String, _>("created_at"),
            "updated_at": row.get::<String, _>("updated_at"),
        })
    })
    .collect();

    // Histórico de vendas
    let sales_history: Vec<serde_json::Value> = sqlx::query(
        r#"SELECT id, total, payment_method, status, created_at
           FROM sales WHERE customer_id = ? ORDER BY created_at DESC"#,
    )
    .bind(&customer_id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| {
        use sqlx::Row;
        serde_json::json!({
            "id": row.get::<String, _>("id"),
            "total": row.get::<f64, _>("total"),
            "payment_method": row.get::<Option<String>, _>("payment_method"),
            "status": row.get::<String, _>("status"),
            "created_at": row.get::<String, _>("created_at"),
        })
    })
    .collect();

    let total_records = 1 + vehicles_json.len() + service_orders.len() + sales_history.len();

    Ok(CustomerDataExport {
        metadata: DataExportMetadata {
            export_version: "1.0".to_string(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            subject: format!("LGPD Data Portability - Customer {}", customer.name),
            total_records: total_records as u32,
            format: "JSON".to_string(),
            encoding: "UTF-8".to_string(),
        },
        personal_info,
        vehicles: vehicles_json,
        service_orders,
        sales_history,
    })
}

/// LGPD: Exportar dados do funcionário para portabilidade (Art. 18)
#[tauri::command]
pub async fn lgpd_export_employee_data(
    employee_id: String,
    state: State<'_, AppState>,
) -> AppResult<EmployeeDataExport> {
    let pool = state.pool();
    let repo = EmployeeRepository::new(pool);

    // Dados pessoais (sem senha/PIN)
    let employee =
        repo.find_by_id(&employee_id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound {
                entity: "Employee".to_string(),
                id: employee_id.clone(),
            })?;

    let personal_info = serde_json::json!({
        "id": employee.id,
        "name": employee.name,
        "cpf": employee.cpf,
        "phone": employee.phone,
        "email": employee.email,
        "role": employee.role,
        "commission_rate": employee.commission_rate,
        "is_active": employee.is_active,
        "created_at": employee.created_at,
        "updated_at": employee.updated_at,
    });

    // Sessões de caixa
    let cash_sessions: Vec<serde_json::Value> = sqlx::query(
        r#"SELECT id, opened_at, closed_at, opening_balance, closing_balance, difference, status
           FROM cash_sessions WHERE employee_id = ? ORDER BY opened_at DESC"#,
    )
    .bind(&employee_id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| {
        use sqlx::Row;
        serde_json::json!({
            "id": row.get::<String, _>("id"),
            "opened_at": row.get::<String, _>("opened_at"),
            "closed_at": row.get::<Option<String>, _>("closed_at"),
            "opening_balance": row.get::<f64, _>("opening_balance"),
            "closing_balance": row.get::<Option<f64>, _>("closing_balance"),
            "difference": row.get::<Option<f64>, _>("difference"),
            "status": row.get::<String, _>("status"),
        })
    })
    .collect();

    // Histórico de vendas
    let sales_history: Vec<serde_json::Value> = sqlx::query(
        r#"SELECT id, total, payment_method, status, created_at
           FROM sales WHERE employee_id = ? ORDER BY created_at DESC LIMIT 1000"#,
    )
    .bind(&employee_id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| {
        use sqlx::Row;
        serde_json::json!({
            "id": row.get::<String, _>("id"),
            "total": row.get::<f64, _>("total"),
            "payment_method": row.get::<Option<String>, _>("payment_method"),
            "status": row.get::<String, _>("status"),
            "created_at": row.get::<String, _>("created_at"),
        })
    })
    .collect();

    let total_records = 1 + cash_sessions.len() + sales_history.len();

    Ok(EmployeeDataExport {
        metadata: DataExportMetadata {
            export_version: "1.0".to_string(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            subject: format!("LGPD Data Portability - Employee {}", employee.name),
            total_records: total_records as u32,
            format: "JSON".to_string(),
            encoding: "UTF-8".to_string(),
        },
        personal_info,
        cash_sessions,
        sales_history,
    })
}
