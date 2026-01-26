//! Comandos Tauri para Importação de Catálogos de Fornecedores
//!
//! Suporta importação de:
//! - CSV (delimitador ; ou ,)
//! - XLSX (primeira aba)

use crate::error::{AppError, AppResult};
use crate::AppState;
use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::Row;
use std::path::Path;
use tauri::State;

// ═══════════════════════════════════════════════════════════════════════════════
// MODELOS
// ═══════════════════════════════════════════════════════════════════════════════

/// Configuração de mapeamento de colunas
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ColumnMapping {
    pub code: Option<usize>,          // Coluna do código do produto
    pub name: usize,                  // Coluna do nome (obrigatório)
    pub description: Option<usize>,   // Coluna da descrição
    pub unit: Option<usize>,          // Coluna da unidade
    pub barcode: Option<usize>,       // Coluna do código de barras
    pub category: Option<usize>,      // Coluna da categoria
    pub brand: Option<usize>,         // Coluna da marca
    pub cost_price: Option<usize>,    // Coluna do preço de custo
    pub sell_price: Option<usize>,    // Coluna do preço de venda
    pub min_stock: Option<usize>,     // Coluna do estoque mínimo
    pub supplier_code: Option<usize>, // Código do fornecedor no catálogo
}

/// Opções de importação
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportOptions {
    pub file_path: String,
    pub supplier_id: Option<String>,
    pub mapping: ColumnMapping,
    pub has_header: bool,
    pub delimiter: Option<String>, // Para CSV: ";" ou ","
    pub update_existing: bool,     // Atualizar produtos existentes?
    pub skip_empty_rows: bool,
    pub default_category_id: Option<String>,
}

/// Prévia de um item a ser importado
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewItem {
    pub row_number: i32,
    pub code: Option<String>,
    pub name: String,
    pub unit: String,
    pub cost_price: Option<f64>,
    pub sell_price: Option<f64>,
    pub category: Option<String>,
    pub status: String, // "new" | "update" | "skip" | "error"
    pub error_message: Option<String>,
}

/// Resultado da prévia
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewResult {
    pub total_rows: i32,
    pub new_products: i32,
    pub updates: i32,
    pub skipped: i32,
    pub errors: i32,
    pub items: Vec<ImportPreviewItem>,
}

/// Resultado da importação
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub success: bool,
    pub imported: i32,
    pub updated: i32,
    pub skipped: i32,
    pub errors: i32,
    pub error_messages: Vec<String>,
}

/// Detectar estrutura do arquivo
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileStructure {
    pub file_type: String, // "csv" | "xlsx"
    pub columns: Vec<String>,
    pub sample_rows: Vec<Vec<String>>,
    pub detected_delimiter: Option<String>,
    pub total_rows: i32,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMANDOS
// ═══════════════════════════════════════════════════════════════════════════════

/// Detecta a estrutura de um arquivo de catálogo
#[tauri::command]
#[specta::specta]
pub async fn detect_catalog_structure(
    file_path: String,
    state: State<'_, AppState>,
) -> AppResult<FileStructure> {
    state.session.require_authenticated()?;

    let path = Path::new(&file_path);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "csv" | "txt" => detect_csv_structure(&file_path),
        "xlsx" | "xls" => detect_xlsx_structure(&file_path),
        _ => Err(AppError::Validation(format!(
            "Formato não suportado: {}. Use CSV ou XLSX.",
            extension
        ))),
    }
}

/// Prévia da importação (não salva no banco)
#[tauri::command]
#[specta::specta]
pub async fn preview_catalog_import(
    options: ImportOptions,
    state: State<'_, AppState>,
) -> AppResult<ImportPreviewResult> {
    state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    let path = Path::new(&options.file_path);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Parse file
    let rows = match extension.as_str() {
        "csv" | "txt" => parse_csv(&options.file_path, &options)?,
        "xlsx" | "xls" => parse_xlsx(&options.file_path, &options)?,
        _ => {
            return Err(AppError::Validation(format!(
                "Formato não suportado: {}",
                extension
            )))
        }
    };

    let mut items = Vec::new();
    let mut new_count = 0;
    let mut update_count = 0;
    let mut skip_count = 0;
    let mut error_count = 0;

    for (idx, row) in rows.iter().enumerate() {
        let row_num = (idx + if options.has_header { 2 } else { 1 }) as i32;

        // Extract name (required)
        let name = row.get(options.mapping.name).cloned().unwrap_or_default();
        if name.trim().is_empty() {
            if options.skip_empty_rows {
                skip_count += 1;
                continue;
            }
            items.push(ImportPreviewItem {
                row_number: row_num,
                code: None,
                name: String::new(),
                unit: "UN".to_string(),
                cost_price: None,
                sell_price: None,
                category: None,
                status: "error".to_string(),
                error_message: Some("Nome do produto é obrigatório".to_string()),
            });
            error_count += 1;
            continue;
        }

        // Extract other fields
        let code = options
            .mapping
            .code
            .and_then(|i| row.get(i).cloned())
            .filter(|s| !s.is_empty());
        let unit = options
            .mapping
            .unit
            .and_then(|i| row.get(i).cloned())
            .unwrap_or_else(|| "UN".to_string());
        let cost_price = options
            .mapping
            .cost_price
            .and_then(|i| row.get(i))
            .and_then(|s| parse_decimal(s));
        let sell_price = options
            .mapping
            .sell_price
            .and_then(|i| row.get(i))
            .and_then(|s| parse_decimal(s));
        let category = options.mapping.category.and_then(|i| row.get(i).cloned());

        // Check if product exists
        let exists = if let Some(ref c) = code {
            sqlx::query("SELECT 1 FROM products WHERE code = ? AND deleted_at IS NULL")
                .bind(c)
                .fetch_optional(pool)
                .await?
                .is_some()
        } else {
            sqlx::query("SELECT 1 FROM products WHERE name = ? AND deleted_at IS NULL")
                .bind(&name)
                .fetch_optional(pool)
                .await?
                .is_some()
        };

        let (status, error_msg) = if exists {
            if options.update_existing {
                update_count += 1;
                ("update".to_string(), None)
            } else {
                skip_count += 1;
                ("skip".to_string(), Some("Produto já existe".to_string()))
            }
        } else {
            new_count += 1;
            ("new".to_string(), None)
        };

        items.push(ImportPreviewItem {
            row_number: row_num,
            code,
            name,
            unit,
            cost_price,
            sell_price,
            category,
            status,
            error_message: error_msg,
        });
    }

    Ok(ImportPreviewResult {
        total_rows: rows.len() as i32,
        new_products: new_count,
        updates: update_count,
        skipped: skip_count,
        errors: error_count,
        items,
    })
}

/// Executa a importação do catálogo
#[tauri::command]
#[specta::specta]
pub async fn import_supplier_catalog(
    options: ImportOptions,
    state: State<'_, AppState>,
) -> AppResult<ImportResult> {
    let user = state.session.require_authenticated()?;
    let pool = state.db_pool.as_ref();

    let path = Path::new(&options.file_path);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Parse file
    let rows = match extension.as_str() {
        "csv" | "txt" => parse_csv(&options.file_path, &options)?,
        "xlsx" | "xls" => parse_xlsx(&options.file_path, &options)?,
        _ => {
            return Err(AppError::Validation(format!(
                "Formato não suportado: {}",
                extension
            )))
        }
    };

    let mut imported = 0;
    let mut updated = 0;
    let mut skipped = 0;
    let mut errors = 0;
    let mut error_messages = Vec::new();

    for (idx, row) in rows.iter().enumerate() {
        let row_num = idx + if options.has_header { 2 } else { 1 };

        // Extract name
        let name = row.get(options.mapping.name).cloned().unwrap_or_default();
        if name.trim().is_empty() {
            if options.skip_empty_rows {
                skipped += 1;
                continue;
            }
            errors += 1;
            error_messages.push(format!("Linha {}: Nome vazio", row_num));
            continue;
        }

        // Extract fields
        let code = options
            .mapping
            .code
            .and_then(|i| row.get(i).cloned())
            .filter(|s| !s.is_empty());
        let description = options
            .mapping
            .description
            .and_then(|i| row.get(i).cloned());
        let unit = options
            .mapping
            .unit
            .and_then(|i| row.get(i).cloned())
            .unwrap_or_else(|| "UN".to_string());
        let barcode = options.mapping.barcode.and_then(|i| row.get(i).cloned());
        let brand = options.mapping.brand.and_then(|i| row.get(i).cloned());
        let cost_price = options
            .mapping
            .cost_price
            .and_then(|i| row.get(i))
            .and_then(|s| parse_decimal(s))
            .unwrap_or(0.0);
        let sell_price = options
            .mapping
            .sell_price
            .and_then(|i| row.get(i))
            .and_then(|s| parse_decimal(s))
            .unwrap_or(0.0);
        let min_stock = options
            .mapping
            .min_stock
            .and_then(|i| row.get(i))
            .and_then(|s| parse_decimal(s))
            .unwrap_or(0.0);
        let supplier_code = options
            .mapping
            .supplier_code
            .and_then(|i| row.get(i).cloned());

        // Check for existing product
        let existing = if let Some(ref c) = code {
            sqlx::query("SELECT id FROM products WHERE code = ? AND deleted_at IS NULL")
                .bind(c)
                .fetch_optional(pool)
                .await?
        } else {
            sqlx::query("SELECT id FROM products WHERE name = ? AND deleted_at IS NULL")
                .bind(&name)
                .fetch_optional(pool)
                .await?
        };

        if let Some(row) = existing {
            if options.update_existing {
                let product_id: String = row.try_get("id")?;

                // Update product
                sqlx::query(
                    r#"
                    UPDATE products SET
                        name = ?,
                        description = COALESCE(?, description),
                        unit = ?,
                        barcode = COALESCE(?, barcode),
                        brand = COALESCE(?, brand),
                        cost_price = CASE WHEN ? > 0 THEN ? ELSE cost_price END,
                        sell_price = CASE WHEN ? > 0 THEN ? ELSE sell_price END,
                        min_stock = CASE WHEN ? > 0 THEN ? ELSE min_stock END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    "#,
                )
                .bind(&name)
                .bind(&description)
                .bind(&unit)
                .bind(&barcode)
                .bind(&brand)
                .bind(cost_price)
                .bind(cost_price)
                .bind(sell_price)
                .bind(sell_price)
                .bind(min_stock)
                .bind(min_stock)
                .bind(&product_id)
                .execute(pool)
                .await?;

                // Link to supplier if provided
                if let (Some(ref sup_id), Some(ref sup_code)) =
                    (&options.supplier_id, &supplier_code)
                {
                    sqlx::query(
                        r#"
                        INSERT OR REPLACE INTO product_suppliers 
                        (product_id, supplier_id, supplier_code, updated_at)
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                        "#,
                    )
                    .bind(&product_id)
                    .bind(sup_id)
                    .bind(sup_code)
                    .execute(pool)
                    .await?;
                }

                updated += 1;
            } else {
                skipped += 1;
            }
        } else {
            // Generate code if not provided
            let product_code = code.unwrap_or_else(|| format!("IMP{:06}", idx + 1));

            let product_id = uuid::Uuid::new_v4().to_string();

            // Insert new product
            let result = sqlx::query(
                r#"
                INSERT INTO products (
                    id, code, name, description, unit, barcode, brand,
                    cost_price, sell_price, min_stock, category_id,
                    is_active, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                "#,
            )
            .bind(&product_id)
            .bind(&product_code)
            .bind(&name)
            .bind(&description)
            .bind(&unit)
            .bind(&barcode)
            .bind(&brand)
            .bind(cost_price)
            .bind(sell_price)
            .bind(min_stock)
            .bind(&options.default_category_id)
            .execute(pool)
            .await;

            match result {
                Ok(_) => {
                    // Link to supplier if provided
                    if let (Some(ref sup_id), Some(ref sup_code)) =
                        (&options.supplier_id, &supplier_code)
                    {
                        let _ = sqlx::query(
                            r#"
                            INSERT INTO product_suppliers 
                            (product_id, supplier_id, supplier_code, created_at)
                            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                            "#,
                        )
                        .bind(&product_id)
                        .bind(sup_id)
                        .bind(sup_code)
                        .execute(pool)
                        .await;
                    }

                    imported += 1;
                }
                Err(e) => {
                    errors += 1;
                    error_messages.push(format!("Linha {}: {}", row_num, e));
                }
            }
        }
    }

    tracing::info!(
        "Catalog import completed: {} imported, {} updated, {} skipped, {} errors",
        imported,
        updated,
        skipped,
        errors
    );

    Ok(ImportResult {
        success: errors == 0,
        imported,
        updated,
        skipped,
        errors,
        error_messages,
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

fn detect_csv_structure(file_path: &str) -> AppResult<FileStructure> {
    let content = std::fs::read_to_string(file_path)?;
    let lines: Vec<&str> = content.lines().collect();

    if lines.is_empty() {
        return Err(AppError::Validation("Arquivo vazio".into()));
    }

    // Detect delimiter
    let first_line = lines[0];
    let delimiter = if first_line.contains(';') {
        ";"
    } else if first_line.contains(',') {
        ","
    } else if first_line.contains('\t') {
        "\t"
    } else {
        ";"
    };

    // Parse columns from first line (header)
    let columns: Vec<String> = first_line
        .split(delimiter)
        .map(|s| s.trim().to_string())
        .collect();

    // Get sample rows (up to 5)
    let mut sample_rows = Vec::new();
    for line in lines.iter().skip(1).take(5) {
        let row: Vec<String> = line
            .split(delimiter)
            .map(|s| s.trim().to_string())
            .collect();
        sample_rows.push(row);
    }

    Ok(FileStructure {
        file_type: "csv".to_string(),
        columns,
        sample_rows,
        detected_delimiter: Some(delimiter.to_string()),
        total_rows: (lines.len() - 1) as i32,
    })
}

fn detect_xlsx_structure(file_path: &str) -> AppResult<FileStructure> {
    use calamine::{open_workbook, Reader, Xlsx};

    let mut workbook: Xlsx<_> = open_workbook(file_path)
        .map_err(|e| AppError::Validation(format!("Erro ao abrir XLSX: {}", e)))?;

    let sheet_name = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or_else(|| AppError::Validation("Planilha vazia".into()))?;

    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| AppError::Validation(format!("Erro ao ler planilha: {}", e)))?;

    let mut rows_iter = range.rows();

    // First row as headers
    let columns: Vec<String> = rows_iter
        .next()
        .map(|row| row.iter().map(|c| c.to_string()).collect())
        .unwrap_or_default();

    // Sample rows
    let mut sample_rows = Vec::new();
    for row in rows_iter.take(5) {
        let values: Vec<String> = row.iter().map(|c| c.to_string()).collect();
        sample_rows.push(values);
    }

    let total_rows = range.height() as i32 - 1;

    Ok(FileStructure {
        file_type: "xlsx".to_string(),
        columns,
        sample_rows,
        detected_delimiter: None,
        total_rows,
    })
}

fn parse_csv(file_path: &str, options: &ImportOptions) -> AppResult<Vec<Vec<String>>> {
    let content = std::fs::read_to_string(file_path)?;
    let delimiter = options.delimiter.as_deref().unwrap_or(";");
    let delim_char = delimiter.chars().next().unwrap_or(';');

    let mut rows = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    let start = if options.has_header { 1 } else { 0 };

    for line in lines.iter().skip(start) {
        let row: Vec<String> = line
            .split(delim_char)
            .map(|s| s.trim().to_string())
            .collect();
        rows.push(row);
    }

    Ok(rows)
}

fn parse_xlsx(file_path: &str, options: &ImportOptions) -> AppResult<Vec<Vec<String>>> {
    use calamine::{open_workbook, Reader, Xlsx};

    let mut workbook: Xlsx<_> = open_workbook(file_path)
        .map_err(|e| AppError::Validation(format!("Erro ao abrir XLSX: {}", e)))?;

    let sheet_name = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or_else(|| AppError::Validation("Planilha vazia".into()))?;

    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| AppError::Validation(format!("Erro ao ler planilha: {}", e)))?;

    let mut rows = Vec::new();
    let start = if options.has_header { 1 } else { 0 };

    for row in range.rows().skip(start) {
        let values: Vec<String> = row.iter().map(|c| c.to_string()).collect();
        rows.push(values);
    }

    Ok(rows)
}

fn parse_decimal(s: &str) -> Option<f64> {
    // Handle Brazilian format (1.234,56) and international (1,234.56)
    let cleaned = s
        .trim()
        .replace("R$", "")
        .replace(" ", "")
        .replace(".", "")
        .replace(",", ".");

    cleaned.parse::<f64>().ok()
}
