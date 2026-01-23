//! Ponto de entrada do aplicativo GIRO Desktop

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use giro_lib::commands::mobile::MobileServerState;
use giro_lib::commands::network::NetworkState;
use giro_lib::{commands, nfce, AppState, DatabaseManager, HardwareState};
use specta_typescript::Typescript;
use std::path::PathBuf;
use tauri::Manager;
use tauri_specta::collect_commands;
use tokio::sync::RwLock;

mod bindings_test;

#[tokio::main]
async fn main() {
    // SPECTA EXPORT (Type Safety)
    #[cfg(debug_assertions)]
    {
        let builder = tauri_specta::Builder::<tauri::Wry>::new().commands(collect_commands![
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
            // Categories
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
            // Employees
            commands::get_employees,
            commands::get_employee_by_id,
            commands::authenticate_by_pin,
            commands::authenticate_employee,
            commands::has_admin,
            commands::create_first_admin,
            commands::has_any_employee,
            commands::create_employee,
            commands::update_employee,
            commands::deactivate_employee,
            commands::reactivate_employee,
            commands::employees::logout,
            commands::employees::get_current_user,
            commands::get_inactive_employees,
            // Sales
            commands::get_sales,
            commands::get_sales_today,
            commands::get_today_sales,
            commands::get_sale_by_id,
            commands::get_sales_by_session,
            commands::create_sale,
            commands::cancel_sale,
            commands::get_daily_summary,
            commands::get_daily_sales_total,
            commands::get_monthly_summary,
            // Cash
            commands::get_current_session,
            commands::get_current_cash_session,
            commands::get_session_history,
            commands::get_cash_session_history,
            commands::get_session_movements,
            commands::open_cash_session,
            commands::close_cash_session,
            commands::add_cash_movement,
            commands::get_cash_session_summary,
            // Stock
            commands::get_recent_stock_movements,
            commands::get_product_stock_movements,
            commands::create_stock_movement,
            commands::get_product_lots,
            commands::get_expiring_lots,
            commands::get_expired_lots,
            // Suppliers
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
            // Customers
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
            // Settings
            commands::get_all_settings,
            commands::get_settings_by_group,
            commands::get_setting,
            commands::get_setting_bool,
            commands::get_setting_number,
            commands::set_setting,
            commands::delete_setting,
            // Vehicles
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
            // Reports
            commands::get_stock_report,
            commands::get_top_products,
            commands::get_sales_report,
            commands::get_financial_report,
            commands::get_employee_performance,
            commands::get_motoparts_dashboard_stats,
            commands::get_service_order_stats,
            commands::get_top_products_motoparts,
            // Alerts
            commands::get_alerts,
            commands::get_unread_alerts,
            commands::get_unread_alert_count,
            commands::get_unread_alerts_count,
            commands::mark_alert_read,
            commands::mark_all_alerts_read,
            commands::create_alert,
            commands::delete_alert,
            // Price History
            commands::get_price_history_by_product,
            commands::get_recent_price_history,
            commands::get_price_history_by_id,
            // System
            commands::get_app_data_path,
            commands::get_database_path,
            commands::get_disk_usage,
            commands::fix_firewall_rules,
            // Service Orders
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
            commands::finish_service_order,
            commands::get_service_order_items,
            commands::add_service_order_item,
            commands::remove_service_order_item,
            commands::update_service_order_item,
            commands::get_services,
            commands::get_service_by_id,
            commands::get_service_by_code,
            commands::create_service,
            commands::update_service,
            commands::get_vehicle_services_history,
            // Hardware
            commands::list_serial_ports,
            commands::list_hardware_ports,
            commands::check_port_exists,
            commands::configure_printer,
            commands::print_receipt,
            commands::print_sale_by_id,
            commands::print_service_order,
            commands::test_printer,
            commands::test_printer_connection,
            commands::print_test_documents,
            commands::get_printer_config,
            commands::configure_scale,
            commands::load_hardware_configs,
            commands::hardware_health_check,
            commands::read_weight,
            commands::read_scale_weight,
            commands::test_scale_connection,
            commands::auto_detect_scale,
            commands::get_scale_config,
            commands::configure_drawer,
            commands::open_drawer,
            commands::open_cash_drawer,
            commands::get_drawer_config,
            commands::start_scanner_server,
            commands::start_serial_scanner,
            commands::stop_scanner_server,
            commands::list_scanner_devices,
            commands::get_scanner_server_info,
            commands::generate_pairing_qr,
            commands::generate_qr_svg,
            // Backups
            commands::backup::create_backup,
            commands::backup::restore_backup,
            commands::backup::list_backups,
            commands::backup::cleanup_old_backups,
            commands::backup::upload_backup_to_drive,
            commands::backup::download_backup_from_drive,
            commands::backup::list_drive_backups,
            commands::backup::exchange_google_code,
            commands::backup::get_google_auth_url,
            commands::backup::list_cloud_backups_cmd,
            commands::backup::upload_cloud_backup_cmd,
            commands::backup::get_cloud_backup_cmd,
            commands::backup::delete_cloud_backup_cmd,
            // Network
            commands::network::start_network_client,
            commands::network::stop_network_client,
            commands::network::get_network_status,
            // Mobile
            commands::start_mobile_server,
            commands::stop_mobile_server,
            commands::get_mobile_server_info,
            commands::get_mobile_server_status,
            commands::get_connected_devices,
            commands::disconnect_mobile_device,
            // License
            commands::get_hardware_id,
            commands::activate_license,
            commands::validate_license,
            commands::get_stored_license,
            commands::sync_metrics,
            commands::get_server_time,
            commands::restore_license,
            commands::update_license_admin,
            commands::recover_license_from_login,
            commands::license_server_login,
        ]);

        builder
            .export(
                Typescript::default().header("// @ts-nocheck"),
                "../src/lib/bindings.ts",
            )
            .expect("Failed to export typescript bindings");
    }

    let app_data = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("GIRO");
    let log_dir = app_data.join("logs");
    std::fs::create_dir_all(&log_dir).ok();

    // 1. Setup File Logging
    let file_appender = tracing_appender::rolling::daily(&log_dir, "giro.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    use tracing_subscriber::prelude::*;
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "giro_lib=info,tauri=warn,giro_desktop=info".into());

    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer()) // Log to stdout
        .with(tracing_subscriber::fmt::layer().with_writer(non_blocking)) // Log to file
        .init();

    // 2. Setup Panic Hook for Windows
    #[cfg(target_os = "windows")]
    {
        std::panic::set_hook(Box::new(|info| {
            let message = format!("CRITICAL ERROR (Panic):\n\n{}", info);
            tracing::error!("{}", message);

            // Try to show a message box if possible
            // Note: Since we are in a panic, we can't use complex Tauri calls easily
            // but we can at least ensure it's in the log file above.
            println!("{}", message);
        }));
    }

    // Load .env file if it exists
    dotenv::dotenv().ok();

    tracing::info!("====================================================");
    tracing::info!("🚀 Iniciando GIRO Desktop v{}", env!("CARGO_PKG_VERSION"));
    tracing::info!("📂 Logs salvos em: {:?}", log_dir);
    tracing::info!("====================================================");

    let db_path = app_data.join("giro.db");
    tracing::info!("DATABASE VERIFICATION PATH: {:?}", db_path);

    // CRITICAL: Verify write permissions
    if let Some(parent) = db_path.parent() {
        let test_file = parent.join(".perm_check");
        if let Err(e) = std::fs::write(&test_file, "ok") {
            tracing::error!("❌ FATAL: Write permission denied in AppData: {:?}", e);
        } else {
            tracing::info!("✅ Write permission verified in AppData");
            let _ = std::fs::remove_file(test_file);
        }
    }

    let db = match DatabaseManager::new(db_path.to_str().unwrap()).await {
        Ok(db) => db,
        Err(e) => {
            tracing::error!("❌ FATAL: Falha ao conectar com banco de dados: {:?}", e);
            panic!("Falha ao conectar com banco de dados: {}", e);
        }
    };

    let app_dir = db_path
        .parent()
        .expect("Falha ao obter diretório da aplicação")
        .to_path_buf();
    let backup_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).ok();

    // === DIAGNOSTIC LOGGING ===
    tracing::warn!("============================================");
    tracing::warn!("📂 DATABASE PATH: {:?}", db_path);
    if db_path.exists() {
        tracing::warn!("✅ DB FILE EXISTS on disk");
    } else {
        tracing::warn!("🆕 DB FILE DOES NOT EXIST (Fresh Install?)");
    }
    tracing::warn!("============================================");

    // Generate hardware ID (MAC address based)
    let hardware_id = generate_hardware_id();
    tracing::info!("Hardware ID: {}", hardware_id);

    // AUTOMATED SETUP CHECK
    // Verifies firewall rules and critical configurations
    giro_lib::services::setup_checks::check_network_setup().await;

    // License server configuration (from env or default)
    // Em produção (release), usa o servidor da Railway. Em dev, usa localhost ou env var.
    // IMPORTANTE: A URL base NÃO deve incluir /api/v1 - o LicenseClient adiciona isso
    #[cfg(debug_assertions)]
    let default_server_url = "https://giro-license-server-production.up.railway.app";

    #[cfg(not(debug_assertions))]
    let default_server_url = "https://giro-license-server-production.up.railway.app";

    let license_server_url =
        std::env::var("LICENSE_SERVER_URL").unwrap_or_else(|_| default_server_url.to_string());

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
        .manage(RwLock::new(NetworkState::default()))
        .setup(|app| {
            let handle = app.handle().clone();

            // Log WebView2 version for diagnostics
            #[cfg(target_os = "windows")]
            {
                match tauri::webview_version() {
                    Ok(v) => tracing::info!("✅ WebView2 Version: {}", v),
                    Err(e) => tracing::error!("❌ WebView2 ERR: {:?}", e),
                }
            }

            tauri::async_runtime::spawn(async move {
                let state = handle.state::<AppState>();
                let hw_state = handle.state::<HardwareState>();
                if let Err(e) = commands::load_hardware_configs(state, hw_state).await {
                    tracing::error!("Erro ao carregar configurações de hardware: {:?}", e);
                }
            });
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
            commands::has_admin,
            commands::has_any_employee,
            commands::create_first_admin,
            commands::create_employee,
            commands::update_employee,
            commands::deactivate_employee,
            commands::reactivate_employee,
            commands::get_inactive_employees,
            commands::employees::logout,
            commands::employees::get_current_user,
            // Vendas
            commands::get_sales,
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
            commands::get_cash_session_summary,
            commands::get_cash_session_history,
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
            commands::get_financial_report,
            commands::get_employee_performance,
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
            // Sistema
            commands::get_app_data_path,
            commands::get_database_path,
            commands::get_disk_usage,
            commands::fix_firewall_rules,
            // Dispatcher
            commands::dispatcher::giro_invoke,
            // Backups
            commands::backup::create_backup,
            commands::backup::restore_backup,
            commands::backup::list_backups,
            commands::backup::cleanup_old_backups,
            commands::backup::upload_backup_to_drive,
            commands::backup::download_backup_from_drive,
            commands::backup::list_drive_backups,
            commands::backup::exchange_google_code,
            commands::backup::get_google_auth_url,
            // Cloud backups via License Server
            commands::backup::list_cloud_backups_cmd,
            commands::backup::upload_cloud_backup_cmd,
            commands::backup::get_cloud_backup_cmd,
            commands::backup::delete_cloud_backup_cmd,
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
            commands::print_sale_by_id,
            commands::print_service_order,
            commands::test_printer,
            commands::test_printer_connection,
            commands::print_test_documents,
            commands::get_printer_config,
            commands::configure_scale,
            commands::load_hardware_configs,
            commands::hardware_health_check,
            commands::read_weight,
            commands::read_scale_weight,
            commands::test_scale_connection,
            commands::auto_detect_scale,
            commands::get_scale_config,
            commands::configure_drawer,
            commands::open_drawer,
            commands::open_cash_drawer,
            commands::get_drawer_config,
            commands::start_scanner_server,
            commands::start_serial_scanner,
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
            // Rede (PC-to-PC Syn)
            commands::network::start_network_client,
            commands::network::stop_network_client,
            commands::network::get_network_status,
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
            // commands::create_service_order,
            // commands::update_service_order,
            // commands::start_service_order,
            // commands::complete_service_order,
            // commands::deliver_service_order,
            // commands::cancel_service_order,
            // commands::finish_service_order,
            commands::get_service_order_items,
            // commands::add_service_order_item,
            // commands::remove_service_order_item,
            // commands::update_service_order_item,
            commands::get_services,
            commands::get_service_by_id,
            commands::get_service_by_code,
            // commands::create_service,
            // commands::update_service,
            commands::get_vehicle_services_history,
            // Garantias (Motopeças)
            commands::get_active_warranties,
            commands::get_warranties_paginated,
            commands::get_warranty_by_id,
            commands::get_warranty_details,
            commands::get_warranties_by_customer,
            commands::get_warranties_by_product,
            commands::create_warranty_claim,
            commands::update_warranty_claim,
            commands::approve_warranty,
            commands::deny_warranty,
            commands::resolve_warranty,
            commands::get_warranty_stats,
            // Seeding
            #[cfg(debug_assertions)]
            commands::seed::seed_database,
            // NFC-e
            nfce::commands::emit_nfce,
            nfce::commands::check_sefaz_status,
            nfce::commands::list_offline_notes,
            nfce::commands::transmit_offline_note,
            nfce::commands::get_fiscal_settings,
            nfce::commands::update_fiscal_settings,
            // License
            commands::get_hardware_id,
            commands::activate_license,
            commands::validate_license,
            commands::get_stored_license,
            commands::sync_metrics,
            commands::get_server_time,
            commands::restore_license,
            commands::update_license_admin,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}

/// Generate hardware ID following server specification:
/// Format: SHA256 hash (64 chars) of CPU:xxx|MB:xxx|MAC:xxx|DISK:xxx
/// This creates a unique fingerprint for hardware binding
fn generate_hardware_id() -> String {
    use sha2::{Digest, Sha256};

    let cpu_id = get_cpu_id();
    let mb_serial = get_motherboard_serial();
    let mac_address = get_primary_mac_address();
    let disk_serial = get_disk_serial();

    // Format raw fingerprint
    let raw_fingerprint = format!(
        "CPU:{}|MB:{}|MAC:{}|DISK:{}",
        cpu_id, mb_serial, mac_address, disk_serial
    );

    // Hash with SHA256 to create 64-char hex string (required by server)
    let mut hasher = Sha256::new();
    hasher.update(raw_fingerprint.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// Get CPU identifier
fn get_cpu_id() -> String {
    #[cfg(target_os = "linux")]
    {
        // Linux: Read from /proc/cpuinfo
        if let Ok(content) = std::fs::read_to_string("/proc/cpuinfo") {
            for line in content.lines() {
                if line.starts_with("model name") || line.starts_with("Serial") {
                    if let Some(value) = line.split(':').nth(1) {
                        return value.trim().chars().take(32).collect();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // 1. Try WMIC with timeout
        let wmic_cmd = std::process::Command::new("wmic")
            .args(["cpu", "get", "ProcessorId"])
            .output();

        if let Ok(output) = wmic_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
                if lines.len() > 1 {
                    return lines[1].trim().to_string();
                }
            }
        }

        // 2. Try PowerShell (Fallback)
        let ps_cmd = std::process::Command::new("powershell")
            .args(["-Command", "Get-CimInstance -ClassName Win32_Processor | Select-Object -ExpandProperty ProcessorId"])
            .output();

        if let Ok(output) = ps_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let id = stdout.trim();
                if !id.is_empty() {
                    return id.to_string();
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: Use sysctl
        if let Ok(output) = std::process::Command::new("sysctl")
            .args(["-n", "machdep.cpu.brand_string"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                return stdout.trim().chars().take(32).collect();
            }
        }
    }

    "UNKNOWN-CPU".to_string()
}

/// Get motherboard serial number
fn get_motherboard_serial() -> String {
    #[cfg(target_os = "linux")]
    {
        // Linux: Read from DMI
        if let Ok(serial) = std::fs::read_to_string("/sys/class/dmi/id/board_serial") {
            let serial = serial.trim();
            if !serial.is_empty() && serial != "To Be Filled By O.E.M." {
                return serial.to_string();
            }
        }
        // Fallback to product_uuid
        if let Ok(uuid) = std::fs::read_to_string("/sys/class/dmi/id/product_uuid") {
            return uuid.trim().chars().take(36).collect();
        }
    }

    #[cfg(target_os = "windows")]
    {
        // 1. WMIC
        let wmic_cmd = std::process::Command::new("wmic")
            .args(["baseboard", "get", "serialnumber"])
            .output();

        if let Ok(output) = wmic_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
                if lines.len() > 1 {
                    let serial = lines[1].trim();
                    if !serial.is_empty() && serial != "To be filled by O.E.M." {
                        return serial.to_string();
                    }
                }
            }
        }

        // 2. PowerShell
        let ps_cmd = std::process::Command::new("powershell")
            .args(["-Command", "Get-CimInstance -ClassName Win32_BaseBoard | Select-Object -ExpandProperty SerialNumber"])
            .output();

        if let Ok(output) = ps_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let serial = stdout.trim();
                if !serial.is_empty() && serial != "To be filled by O.E.M." {
                    return serial.to_string();
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                for line in stdout.lines() {
                    if line.contains("IOPlatformSerialNumber") {
                        if let Some(serial) = line.split('"').nth(3) {
                            return serial.to_string();
                        }
                    }
                }
            }
        }
    }

    "O.E.M.".to_string()
}

/// Get primary MAC address (physical, non-virtual)
fn get_primary_mac_address() -> String {
    // Use mac_address crate or fallback to interface names
    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        // Filter physical interfaces
        let physical_interfaces: Vec<_> = interfaces
            .iter()
            .filter(|(name, _)| {
                !name.starts_with("lo")
                    && !name.starts_with("docker")
                    && !name.starts_with("veth")
                    && !name.starts_with("br-")
                    && !name.contains("VMware")
                    && !name.contains("VirtualBox")
            })
            .collect();

        if let Some((name, ip)) = physical_interfaces.first() {
            // Return a hash of interface name + IP for consistency
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(format!("{}:{}", name, ip).as_bytes());
            let result = hasher.finalize();
            return format!(
                "{:02X}-{:02X}-{:02X}-{:02X}-{:02X}-{:02X}",
                result[0], result[1], result[2], result[3], result[4], result[5]
            );
        }
    }

    "00-00-00-00-00-00".to_string()
}

/// Get primary disk serial number
fn get_disk_serial() -> String {
    #[cfg(target_os = "linux")]
    {
        // Linux: Read from /dev/disk/by-id
        if let Ok(entries) = std::fs::read_dir("/dev/disk/by-id") {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("ata-")
                    || name.starts_with("nvme-")
                    || name.starts_with("scsi-")
                {
                    // Extract serial from name
                    if let Some(serial) = name.split('_').next_back() {
                        return serial.chars().take(20).collect();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // 1. WMIC
        let wmic_cmd = std::process::Command::new("wmic")
            .args(["diskdrive", "get", "serialnumber"])
            .output();

        if let Ok(output) = wmic_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
                if lines.len() > 1 {
                    return lines[1].trim().to_string();
                }
            }
        }

        // 2. PowerShell
        let ps_cmd = std::process::Command::new("powershell")
            .args(["-Command", "Get-CimInstance -ClassName Win32_DiskDrive | Select-Object -ExpandProperty SerialNumber | Select-Object -First 1"])
            .output();

        if let Ok(output) = ps_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let serial = stdout.trim();
                if !serial.is_empty() {
                    return serial.to_string();
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("diskutil")
            .args(["info", "disk0"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                for line in stdout.lines() {
                    if line.contains("Volume UUID") || line.contains("Disk / Partition UUID") {
                        if let Some(uuid) = line.split(':').nth(1) {
                            return uuid.trim().to_string();
                        }
                    }
                }
            }
        }
    }

    "UNKNOWN-DISK".to_string()
}
