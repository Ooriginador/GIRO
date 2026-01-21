//! Ponto de entrada do aplicativo GIRO Desktop

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use giro_lib::commands::mobile::MobileServerState;
use giro_lib::commands::network::NetworkState;
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
    tracing::info!("DATABASE VERIFICATION PATH: {:?}", db_path);

    let db = DatabaseManager::new(db_path.to_str().unwrap())
        .await
        .expect("Falha ao conectar com banco de dados");

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

    let api_key = std::env::var("LICENSE_API_KEY").expect(
        "Environment variable LICENSE_API_KEY is required. Set LICENSE_API_KEY in the environment.",
    );

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
            commands::has_admin,
            commands::has_any_employee,
            commands::create_first_admin,
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
            // Sistema
            commands::get_app_data_path,
            commands::get_database_path,
            commands::get_disk_usage,
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
            commands::hardware_health_check,
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
            // Garantias (Motopeças)
            commands::get_active_warranties,
            commands::get_warranties_paginated,
            commands::get_warranty_by_id,
            commands::get_warranty_details,
            commands::create_warranty_claim,
            commands::update_warranty_claim,
            commands::approve_warranty,
            commands::deny_warranty,
            commands::resolve_warranty,
            commands::get_warranties_by_customer,
            commands::get_warranties_by_product,
            commands::get_warranty_stats,
            // Seeding
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
        // Windows: Use WMIC
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["cpu", "get", "ProcessorId"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
                if lines.len() > 1 {
                    return lines[1].trim().to_string();
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
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["baseboard", "get", "serialnumber"])
            .output()
        {
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
                    if let Some(serial) = name.split('_').last() {
                        return serial.chars().take(20).collect();
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["diskdrive", "get", "serialnumber"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
                if lines.len() > 1 {
                    return lines[1].trim().to_string();
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
