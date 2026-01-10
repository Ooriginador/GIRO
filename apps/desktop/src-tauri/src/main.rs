//! Ponto de entrada do aplicativo GIRO Desktop

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use giro_lib::commands::mobile::MobileServerState;
use giro_lib::{commands, nfce, AppState, DatabaseManager, HardwareState};
use std::path::PathBuf;
use tokio::sync::RwLock;

fn get_database_path() -> PathBuf {
    let app_data = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("GIRO");

    std::fs::create_dir_all(&app_data).ok();
    app_data.join("giro.db")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "giro_lib=info,tauri=warn".into()),
        )
        .init();

    tracing::info!("Iniciando GIRO Desktop v{}", env!("CARGO_PKG_VERSION"));

    let db_path = get_database_path();
    tracing::info!("Banco de dados: {:?}", db_path);

    let db = DatabaseManager::new(db_path.to_str().unwrap())
        .await
        .expect("Falha ao conectar com banco de dados");

    let app_dir = db_path
        .parent()
        .expect("Falha ao obter diretório da aplicação")
        .to_path_buf();
    let backup_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).ok();

    // Generate hardware ID (MAC address based)
    let hardware_id = generate_hardware_id();
    tracing::info!("Hardware ID: {}", hardware_id);

    // License server configuration (from env or default)
    let license_server_url = std::env::var("LICENSE_SERVER_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    let api_key = std::env::var("LICENSE_API_KEY").unwrap_or_else(|_| "dev-key".to_string());

    let app_state = AppState::new(
        db.pool().clone(),
        db_path.clone(),
        backup_dir,
        license_server_url,
        api_key,
        hardware_id,
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .manage(app_state)
        .manage(HardwareState::default())
        .manage(RwLock::new(MobileServerState::default()))
        .setup(|_app| {
            tracing::info!("Aplicação inicializada com sucesso");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Produtos
            commands::get_products,
            commands::get_product_by_id,
            commands::get_product_by_barcode,
            commands::search_products,
            commands::get_low_stock_products,
            commands::create_product,
            commands::update_product,
            commands::delete_product,
            commands::deactivate_product,
            commands::reactivate_product,
            commands::get_all_products,
            commands::get_inactive_products,
            // Categorias
            commands::get_categories,
            commands::get_categories_with_count,
            commands::get_category_by_id,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::deactivate_category,
            commands::reactivate_category,
            commands::get_all_categories,
            commands::get_inactive_categories,
            // Funcionários
            commands::get_employees,
            commands::get_employee_by_id,
            commands::authenticate_by_pin,
            commands::authenticate_employee, // alias
            commands::create_employee,
            commands::update_employee,
            commands::deactivate_employee,
            commands::reactivate_employee,
            commands::get_inactive_employees,
            // Vendas
            commands::get_sales_today,
            commands::get_today_sales, // alias
            commands::get_sale_by_id,
            commands::get_sales_by_session,
            commands::create_sale,
            commands::cancel_sale,
            commands::get_daily_summary,
            commands::get_daily_sales_total,
            commands::get_monthly_summary,
            // Caixa
            commands::get_current_session,
            commands::get_current_cash_session, // alias
            commands::get_session_history,
            commands::get_session_movements,
            commands::open_cash_session,
            commands::close_cash_session,
            commands::add_cash_movement,
            // Estoque
            commands::get_recent_stock_movements,
            commands::get_product_stock_movements,
            commands::create_stock_movement,
            commands::get_product_lots,
            commands::get_expiring_lots,
            commands::get_expired_lots,
            // Alertas
            commands::get_alerts,
            commands::get_unread_alerts,
            commands::get_unread_alert_count,
            commands::get_unread_alerts_count,
            commands::mark_alert_read,
            commands::mark_all_alerts_read,
            commands::create_alert,
            commands::delete_alert,
            // Relatórios
            commands::get_stock_report,
            commands::get_top_products,
            commands::get_sales_report,
            commands::get_motoparts_dashboard_stats,
            commands::get_service_order_stats,
            commands::get_top_products_motoparts,
            // Configurações
            commands::get_all_settings,
            commands::get_settings_by_group,
            commands::get_setting,
            commands::get_setting_bool,
            commands::get_setting_number,
            commands::set_setting,
            commands::delete_setting,
            // Fornecedores
            commands::get_suppliers,
            commands::get_supplier_by_id,
            commands::search_suppliers,
            commands::create_supplier,
            commands::update_supplier,
            commands::delete_supplier,
            commands::deactivate_supplier,
            commands::reactivate_supplier,
            commands::get_all_suppliers,
            commands::get_inactive_suppliers,
            // Hardware
            commands::list_serial_ports,
            commands::check_port_exists,
            commands::configure_printer,
            commands::print_receipt,
            commands::test_printer,
            commands::print_test_documents,
            commands::get_printer_config,
            commands::configure_scale,
            commands::read_weight,
            commands::auto_detect_scale,
            commands::get_scale_config,
            commands::configure_drawer,
            commands::open_drawer,
            commands::get_drawer_config,
            commands::start_scanner_server,
            commands::stop_scanner_server,
            commands::list_scanner_devices,
            commands::get_scanner_server_info,
            commands::generate_pairing_qr,
            commands::generate_qr_svg,
            commands::start_mobile_server,
            commands::stop_mobile_server,
            commands::get_mobile_server_info,
            commands::get_mobile_server_status,
            commands::get_connected_devices,
            commands::disconnect_mobile_device,
            // Histórico de Preços
            commands::get_price_history_by_product,
            commands::get_recent_price_history,
            commands::get_price_history_by_id,
            // Veículos (Motopeças)
            commands::get_vehicle_brands,
            commands::get_vehicle_brand_by_id,
            commands::create_vehicle_brand,
            commands::get_vehicle_models,
            commands::get_vehicle_model_by_id,
            commands::create_vehicle_model,
            commands::get_vehicle_years,
            commands::get_vehicle_year_by_id,
            commands::create_vehicle_year,
            commands::search_vehicles,
            commands::get_complete_vehicle,
            commands::get_product_compatibilities,
            commands::add_product_compatibility,
            commands::remove_product_compatibility,
            commands::save_product_compatibilities,
            commands::get_products_by_vehicle,
            // Clientes (Motopeças)
            commands::get_customers,
            commands::get_customers_paginated,
            commands::get_customer_by_id,
            commands::get_customer_by_cpf,
            commands::search_customers,
            commands::create_customer,
            commands::update_customer,
            commands::deactivate_customer,
            commands::reactivate_customer,
            commands::get_customer_vehicles,
            commands::get_customer_vehicle_by_id,
            commands::create_customer_vehicle,
            commands::update_customer_vehicle,
            commands::deactivate_customer_vehicle,
            commands::update_vehicle_km,
            // Ordens de Serviço (Motopeças)
            commands::get_open_service_orders,
            commands::get_service_orders_paginated,
            commands::get_service_order_by_id,
            commands::get_service_order_by_number,
            commands::get_service_order_details,
            commands::create_service_order,
            commands::update_service_order,
            commands::start_service_order,
            commands::complete_service_order,
            commands::deliver_service_order,
            commands::cancel_service_order,
            commands::get_service_order_items,
            commands::add_service_order_item,
            commands::remove_service_order_item,
            commands::get_services,
            commands::get_service_by_id,
            commands::get_service_by_code,
            commands::create_service,
            commands::update_service,
            // Garantias (Motopeças) - DISABLED: warranty_claims table not created yet
            // commands::get_active_warranties,
            // commands::get_warranties_paginated,
            // commands::get_warranty_by_id,
            // commands::get_warranty_details,
            // commands::create_warranty_claim,
            // commands::update_warranty_claim,
            // commands::approve_warranty,
            // commands::deny_warranty,
            // commands::resolve_warranty,
            // commands::get_warranties_by_customer,
            // commands::get_warranties_by_product,
            // commands::get_warranty_stats,

            // Seeding
            commands::seed::seed_database,
            // NFC-e
            nfce::commands::emit_nfce,
            nfce::commands::check_sefaz_status,
            nfce::commands::list_offline_notes,
            nfce::commands::transmit_offline_note,
            // License
            commands::activate_license,
            commands::validate_license,
            commands::sync_metrics,
            commands::get_server_time,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}

/// Generate hardware ID based on MAC address
fn generate_hardware_id() -> String {
    use sha2::{Digest, Sha256};

    // Get MAC addresses
    let interfaces = match local_ip_address::list_afinet_netifas() {
        Ok(interfaces) => interfaces,
        Err(_) => return "UNKNOWN-HARDWARE-ID".to_string(),
    };

    // Find first non-loopback interface
    let mac_candidates: Vec<String> = interfaces
        .iter()
        .filter(|(name, _)| !name.starts_with("lo"))
        .map(|(name, _)| name.clone())
        .collect();

    let identifier = if let Some(first) = mac_candidates.first() {
        first.clone()
    } else {
        hostname::get()
            .ok()
            .and_then(|h| h.into_string().ok())
            .unwrap_or_else(|| "unknown-host".to_string())
    };

    // Hash for privacy
    let mut hasher = Sha256::new();
    hasher.update(identifier.as_bytes());
    let result = hasher.finalize();

    format!("{:x}", result)
}
