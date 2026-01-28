//! Ponto de entrada do aplicativo GIRO Desktop

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use giro_lib::commands::mobile::MobileServerState;
use giro_lib::commands::network::NetworkState;
use giro_lib::{commands, nfce, AppState, DatabaseManager, HardwareState};
#[cfg(debug_assertions)]
use specta_typescript::Typescript;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
#[cfg(debug_assertions)]
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
            commands::get_products_paginated,
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
            // Held Sales (PDV Persistence)
            commands::get_held_sales,
            commands::get_waiting_orders,
            commands::save_held_sale,
            commands::update_held_sale_status,
            commands::delete_held_sale,
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
            // Audit
            commands::get_audit_logs,
            commands::get_audit_summary,
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
            commands::print_attendant_order,
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
            commands::network::force_network_sync,
            commands::network::scan_network_for_masters,
            commands::network::test_master_connection,
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
            commands::test_license_connection,
            // Enterprise Module - Contracts
            commands::get_contracts,
            commands::get_contracts_paginated,
            commands::get_contract_by_id,
            commands::get_contract_by_code,
            commands::create_contract,
            commands::update_contract,
            commands::delete_contract,
            commands::get_contract_dashboard,
            // Enterprise Module - Work Fronts
            commands::get_work_fronts_by_contract,
            commands::get_work_fronts_by_supervisor,
            commands::get_work_front_by_id,
            commands::create_work_front,
            commands::update_work_front,
            commands::delete_work_front,
            // Enterprise Module - Activities
            commands::get_activities_by_work_front,
            commands::get_activities_by_cost_center,
            commands::get_activity_by_id,
            commands::create_activity,
            commands::update_activity,
            commands::update_activity_progress,
            commands::delete_activity,
            // Enterprise Module - Stock Locations
            commands::get_stock_locations,
            commands::get_stock_locations_by_type,
            commands::get_stock_locations_by_contract,
            commands::get_stock_location_by_id,
            commands::get_stock_location_by_code,
            commands::create_stock_location,
            commands::delete_stock_location,
            commands::get_location_balances,
            commands::adjust_location_balance,
            // Enterprise Module - Material Requests
            commands::get_material_requests_paginated,
            commands::get_pending_requests,
            commands::get_material_request_by_id,
            commands::get_material_request_by_number,
            commands::create_material_request,
            commands::add_request_item,
            commands::get_request_items,
            commands::remove_request_item,
            commands::submit_material_request,
            commands::approve_material_request,
            commands::approve_material_request_with_items,
            commands::reject_material_request,
            commands::start_request_separation,
            commands::complete_request_separation,
            commands::deliver_material_request,
            commands::cancel_material_request,
            // Enterprise Module - Stock Transfers
            commands::get_transfers_by_source,
            commands::get_transfers_by_destination,
            commands::get_pending_transfers,
            commands::get_in_transit_transfers,
            commands::get_stock_transfer_by_id,
            commands::get_stock_transfer_by_number,
            commands::create_stock_transfer,
            commands::add_transfer_item,
            commands::get_transfer_items,
            commands::approve_stock_transfer,
            commands::reject_stock_transfer,
            commands::ship_stock_transfer,
            commands::receive_stock_transfer,
            commands::cancel_stock_transfer,
            // Enterprise Module - Reports
            commands::report_consumption_by_contract,
            commands::report_consumption_by_activity,
            commands::report_consumption_by_cost_center,
            commands::report_stock_position,
            commands::report_pending_requests,
        ]);

        builder
            .export(
                Typescript::default()
                    .header("// @ts-nocheck")
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "../src/lib/bindings.ts",
            )
            .expect("Failed to export typescript bindings");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. CRITICAL: Windows WebView2 Pre-Check (BEFORE anything else)
    // ═══════════════════════════════════════════════════════════════════════════
    #[cfg(target_os = "windows")]
    {
        if let Err(e) = check_webview2_availability() {
            show_windows_error(
                "WebView2 Não Encontrado",
                &format!(
                    "O componente WebView2 é necessário para executar o GIRO.\n\n\
                    Erro: {}\n\n\
                    O WebView2 será instalado automaticamente.\n\
                    Por favor, reinicie o GIRO após a instalação.",
                    e
                ),
            );
            // The Tauri embedBootstrapper should handle this, but we warn early
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. Setup App Data Directory (with safer fallback)
    // ═══════════════════════════════════════════════════════════════════════════
    let app_data = dirs::data_local_dir()
        .map(|p| p.join("GIRO"))
        .or_else(|| {
            // Safer fallback: use user's home directory
            dirs::home_dir().map(|h| h.join(".giro"))
        })
        .unwrap_or_else(|| {
            // Last resort: current directory (not ideal but prevents crash)
            std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join(".giro")
        });

    // Verify we can write to app_data BEFORE proceeding
    if let Err(e) = std::fs::create_dir_all(&app_data) {
        #[cfg(target_os = "windows")]
        show_windows_error(
            "Erro de Permissão",
            &format!(
                "Não foi possível criar o diretório de dados:\n{}\n\nErro: {}\n\n\
                Execute o GIRO como Administrador ou verifique as permissões.",
                app_data.display(),
                e
            ),
        );
        panic!("Cannot create app data directory: {}", e);
    }

    let log_dir = app_data.join("logs");
    std::fs::create_dir_all(&log_dir).ok();

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. Setup File Logging (EARLY - to catch all errors)
    // ═══════════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. Setup Enhanced Panic Hook for Windows
    // ═══════════════════════════════════════════════════════════════════════════
    #[cfg(target_os = "windows")]
    {
        let log_dir_clone = log_dir.clone();
        std::panic::set_hook(Box::new(move |info| {
            let backtrace = std::backtrace::Backtrace::capture();
            let message = format!(
                "CRITICAL ERROR (Panic):\n\n{}\n\nBacktrace:\n{}",
                info, backtrace
            );

            // Log to file
            tracing::error!("{}", message);

            // Save crash dump
            let crash_file = log_dir_clone.join(format!(
                "crash_{}.log",
                chrono::Local::now().format("%Y%m%d_%H%M%S")
            ));
            let _ = std::fs::write(&crash_file, &message);

            // Show native Windows message box
            show_windows_error(
                "GIRO - Erro Crítico",
                &format!(
                    "O GIRO encontrou um erro crítico e precisa fechar.\n\n\
                    Um log de erro foi salvo em:\n{}\n\n\
                    Por favor, envie este arquivo ao suporte técnico.",
                    crash_file.display()
                ),
            );
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

    // Verify DB integrity (basic size check)
    if db_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&db_path) {
            if metadata.len() == 0 {
                tracing::warn!(
                    "⚠️ Arquivo de banco de dados vazio detectado. Tentando recuperar..."
                );
                let _ = std::fs::remove_file(&db_path);
            }
        }
    }

    let db = match DatabaseManager::new(db_path.to_str().unwrap()).await {
        Ok(db) => db,
        Err(e) => {
            let err_msg = e.to_string();
            if err_msg.contains("database is locked") {
                tracing::error!(
                    "❌ FATAL: O banco de dados está bloqueado por outra instância do GIRO."
                );
                panic!("O banco de dados está bloqueado. Verifique se o GIRO já está aberto ou encerre o processo 'giro-desktop.exe' no Gerenciador de Tarefas.");
            }
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
    let default_server_url = "http://localhost:3000";

    #[cfg(not(debug_assertions))]
    let default_server_url = "https://giro-license-server-production.up.railway.app";

    let license_server_url =
        std::env::var("LICENSE_SERVER_URL").unwrap_or_else(|_| default_server_url.to_string());

    // API Key: usa valor padrão se não configurado
    // Em produção, o instalador deve configurar via arquivo .env ou registry
    // Se não encontrar, usa chave de fallback que permite modo offline
    let api_key = std::env::var("LICENSE_API_KEY").unwrap_or_else(|_| {
        #[cfg(debug_assertions)]
        {
            "dev-key".to_string()
        }
        #[cfg(not(debug_assertions))]
        {
            // Tenta ler de arquivo de configuração local
            let config_key = std::fs::read_to_string(
                dirs::config_dir()
                    .unwrap_or_default()
                    .join("GIRO")
                    .join("license.key"),
            )
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());

            config_key.unwrap_or_else(|| {
                tracing::warn!("LICENSE_API_KEY not found - running in offline/demo mode");
                "offline-mode".to_string()
            })
        }
    });

    let event_service = Arc::new(giro_lib::services::mobile_events::MobileEventService::new());

    let app_state = AppState::new(
        db.pool().clone(),
        db_path.clone(),
        backup_dir,
        license_server_url,
        api_key,
        hardware_id,
        event_service,
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
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
                let mobile_state = handle.state::<RwLock<MobileServerState>>();
                let network_state = handle.state::<RwLock<NetworkState>>();

                // 1. Carregar configurações de hardware
                if let Err(e) = commands::load_hardware_configs_internal(&state, &hw_state).await {
                    tracing::error!("Erro ao carregar configurações de hardware: {:?}", e);
                }

                // 2. Verificar Auto-start de Rede (Master/Satellite)
                let settings_repo = giro_lib::repositories::SettingsRepository::new(state.pool());
                let role = settings_repo.get_value("network.role").await.ok().flatten().unwrap_or_else(|| "STANDALONE".to_string());

                match role.as_str() {
                    "MASTER" => {
                        tracing::info!("Auto-start: Este terminal está configurado como MASTER. Iniciando servidor...");
                        let config = giro_lib::commands::mobile::StartServerConfig {
                            port: 3847,
                            max_connections: 10,
                        };
                        // Chamamos o comando diretamente (usando clones para evitar o erro de move)
                        if let Err(e) = commands::start_mobile_server(config, state.clone(), mobile_state.clone()).await {
                            tracing::error!("Erro no auto-start do Master: {:?}", e);
                        }
                    },
                    "SATELLITE" => {
                        tracing::info!("Auto-start: Este terminal está configurado como SATELLITE. Iniciando busca pelo Master...");
                        let terminal_name = settings_repo.get_value("terminal.name").await.ok().flatten().unwrap_or_else(|| "Satellite Terminal".into());
                        if let Err(e) = commands::network::start_network_client(terminal_name, handle.clone(), state.clone(), network_state.clone()).await {
                            tracing::error!("Erro no auto-start do Satellite: {:?}", e);
                        }
                    },
                    _ => tracing::info!("Auto-start: Modo STANDALONE (Nenhum serviço de rede iniciado)"),
                }

                // 3. Verificar Garantias de OS expirando
                let alert_repo = giro_lib::repositories::AlertRepository::new(state.pool());
                match alert_repo.check_os_warranties().await {
                    Ok(count) if count > 0 => {
                        tracing::info!("✅ Alertas de Garantia: {} novos alertas gerados", count);
                        giro_lib::services::NotificationService::alert(
                            &handle,
                            &format!("Você tem {} novas garantias de OS expirando em breve!", count)
                        );
                    },
                    Ok(_) => tracing::info!("✅ Alertas de Garantia: Nenhuma garantia expirando em breve"),
                    Err(e) => tracing::error!("❌ Erro ao verificar garantias de OS: {:?}", e),
                }
            });
            tracing::info!("Aplicação inicializada com sucesso");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Produtos
            commands::get_products,
            commands::get_products_paginated,
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
            commands::print_attendant_order,
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
            // Rede (PC-to-PC Sync)
            commands::network::start_network_client,
            commands::network::stop_network_client,
            commands::network::get_network_status,
            commands::network::force_network_sync,
            commands::network::scan_network_for_masters,
            commands::network::test_master_connection,
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
            commands::test_license_connection,
            // LGPD Compliance
            commands::lgpd_hard_delete_customer,
            commands::lgpd_hard_delete_employee,
            commands::lgpd_export_customer_data,
            commands::lgpd_export_employee_data,
            // Enterprise Module - Contracts
            commands::get_contracts,
            commands::get_contracts_paginated,
            commands::get_contract_by_id,
            commands::get_contract_by_code,
            commands::create_contract,
            commands::update_contract,
            commands::delete_contract,
            commands::get_contract_dashboard,
            // Enterprise Module - Work Fronts
            commands::get_work_fronts_by_contract,
            commands::get_work_fronts_by_supervisor,
            commands::get_work_front_by_id,
            commands::create_work_front,
            commands::update_work_front,
            commands::delete_work_front,
            // Enterprise Module - Activities
            commands::get_activities_by_work_front,
            commands::get_activities_by_cost_center,
            commands::get_activity_by_id,
            commands::create_activity,
            commands::update_activity,
            commands::update_activity_progress,
            commands::delete_activity,
            // Enterprise Module - Stock Locations
            commands::get_stock_locations,
            commands::get_stock_locations_by_type,
            commands::get_stock_locations_by_contract,
            commands::get_stock_location_by_id,
            commands::get_stock_location_by_code,
            commands::create_stock_location,
            commands::delete_stock_location,
            commands::get_location_balances,
            commands::adjust_location_balance,
            // Enterprise Module - Material Requests
            commands::get_material_requests_paginated,
            commands::get_pending_requests,
            commands::get_material_request_by_id,
            commands::get_material_request_by_number,
            commands::create_material_request,
            commands::add_request_item,
            commands::get_request_items,
            commands::remove_request_item,
            commands::submit_material_request,
            commands::approve_material_request,
            commands::approve_material_request_with_items,
            commands::reject_material_request,
            commands::start_request_separation,
            commands::complete_request_separation,
            commands::deliver_material_request,
            commands::cancel_material_request,
            // Enterprise Module - Stock Transfers
            commands::get_transfers_by_source,
            commands::get_transfers_by_destination,
            commands::get_pending_transfers,
            commands::get_in_transit_transfers,
            commands::get_stock_transfer_by_id,
            commands::get_stock_transfer_by_number,
            commands::create_stock_transfer,
            commands::add_transfer_item,
            commands::get_transfer_items,
            commands::approve_stock_transfer,
            commands::reject_stock_transfer,
            commands::ship_stock_transfer,
            commands::receive_stock_transfer,
            commands::cancel_stock_transfer,
            // Enterprise Module - Reports
            commands::report_consumption_by_contract,
            commands::report_consumption_by_activity,
            commands::report_consumption_by_cost_center,
            commands::report_stock_position,
            commands::report_pending_requests,
            // Enterprise Module - ERP Exports
            commands::export_sienge_csv,
            commands::export_uau_xml,
            // Enterprise Module - Catalog Import
            commands::detect_catalog_structure,
            commands::preview_catalog_import,
            commands::import_supplier_catalog,
            // Enterprise Module - Mobile Integration
            commands::get_mobile_locations,
            commands::get_mobile_location,
            commands::sync_mobile_counts,
            commands::check_mobile_sync_status,
            // Multi-PC Sync
            commands::get_sync_status,
            commands::sync_push,
            commands::sync_pull,
            commands::sync_reset,
            commands::sync_full,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}

/// Generate hardware ID following server specification:
/// Format: SHA256 hash (64 chars) of CPU:xxx|MB:xxx|MAC:xxx|BIOS:xxx
/// This creates a unique fingerprint for hardware binding without dynamic IP instability
fn generate_hardware_id() -> String {
    use sha2::{Digest, Sha256};

    let cpu_id = get_cpu_id();
    let mb_serial = get_motherboard_serial();
    let mac_address = get_primary_mac_address();
    let bios_serial = get_bios_serial();

    // Format raw fingerprint (REMOVED IP dependency)
    let raw_fingerprint = format!(
        "CPU:{}|MB:{}|MAC:{}|BIOS:{}",
        cpu_id, mb_serial, mac_address, bios_serial
    );

    tracing::debug!("Raw Hardware Fingerprint source: {}", raw_fingerprint);

    // Hash with SHA256 to create 64-char hex string (required by server)
    let mut hasher = Sha256::new();
    hasher.update(raw_fingerprint.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// Get BIOS serial number (Highly stable on Windows)
/// Uses WMIC with PowerShell fallback for Windows 11 compatibility
fn get_bios_serial() -> String {
    #[cfg(target_os = "windows")]
    {
        // Try WMIC first (faster, but deprecated in Windows 11)
        let wmic_result = std::process::Command::new("wmic")
            .args(["bios", "get", "serialnumber"])
            .output();

        if let Ok(out) = wmic_result {
            if let Ok(stdout) = String::from_utf8(out.stdout) {
                let lines: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
                if lines.len() > 1 {
                    let serial = lines[1].trim();
                    if !serial.is_empty() && serial != "To be filled by O.E.M." {
                        return serial.to_string();
                    }
                }
            }
        }

        // PowerShell fallback for Windows 11
        let ps_result = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_BIOS | Select-Object -ExpandProperty SerialNumber"])
            .output();

        if let Ok(out) = ps_result {
            if let Ok(stdout) = String::from_utf8(out.stdout) {
                let serial = stdout.trim();
                if !serial.is_empty() && serial != "To be filled by O.E.M." {
                    return serial.to_string();
                }
            }
        }
    }
    "UNKNOWN-BIOS".to_string()
}

/// Get CPU identifier
/// Uses WMIC with PowerShell fallback for Windows 11 compatibility
fn get_cpu_id() -> String {
    #[cfg(target_os = "linux")]
    {
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
        // Try WMIC first (faster, but deprecated in Windows 11)
        let wmic_cmd = std::process::Command::new("wmic")
            .args(["cpu", "get", "ProcessorId"])
            .output();

        if let Ok(output) = wmic_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().filter(|l| !l.trim().is_empty()).collect();
                if lines.len() > 1 {
                    let cpu_id = lines[1].trim();
                    if !cpu_id.is_empty() {
                        return cpu_id.to_string();
                    }
                }
            }
        }

        // PowerShell fallback for Windows 11
        let ps_cmd = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_Processor | Select-Object -ExpandProperty ProcessorId"])
            .output();

        if let Ok(output) = ps_cmd {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let cpu_id = stdout.trim();
                if !cpu_id.is_empty() {
                    return cpu_id.to_string();
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

        // 2. PowerShell fallback (Windows 11)
        let ps_cmd = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_BaseBoard | Select-Object -ExpandProperty SerialNumber"])
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
    #[cfg(target_os = "windows")]
    {
        // Use getmac on Windows for reliable physical MAC
        let output = std::process::Command::new("getmac")
            .args(["/FO", "CSV", "/NH", "/V"])
            .output();

        if let Ok(out) = output {
            if let Ok(stdout) = String::from_utf8(out.stdout) {
                for line in stdout.lines() {
                    // Try to find a physical adapter (Ethernet or Wi-Fi)
                    if (line.contains("Ethernet") || line.contains("Wi-Fi"))
                        && !line.contains("Virtual")
                    {
                        let parts: Vec<&str> = line.split(',').collect();
                        if parts.len() > 3 {
                            let mac = parts[2].trim().replace("\"", "").replace("-", ":");
                            if !mac.is_empty() && mac != "N/A" {
                                return mac;
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback/Non-Windows logic (Linux/MacOS)
    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        let physical_interfaces: Vec<_> = interfaces
            .iter()
            .filter(|(name, _)| {
                !name.starts_with("lo")
                    && !name.starts_with("docker")
                    && !name.starts_with("veth")
                    && !name.starts_with("br-")
                    && !name.contains("VMware")
                    && !name.contains("VirtualBox")
                    && !name.contains("wsl")
            })
            .collect();

        if let Some((name, _)) = physical_interfaces.first() {
            return name.to_string(); // Stable interface name
        }
    }

    "00-00-00-00-00-00".to_string()
}

// ═══════════════════════════════════════════════════════════════════════════
// WINDOWS-SPECIFIC HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/// Check if WebView2 runtime is available on Windows
#[cfg(target_os = "windows")]
fn check_webview2_availability() -> Result<String, String> {
    use std::process::Command;

    // Method 1: Check via Tauri's built-in detection
    if let Ok(version) = tauri::webview_version() {
        return Ok(version);
    }

    // Method 2: Check registry for WebView2 installation
    let reg_check = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "/v",
            "pv",
        ])
        .output();

    if let Ok(output) = reg_check {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("pv") && !stdout.contains("0.0.0.0") {
                return Ok("Registry check passed".to_string());
            }
        }
    }

    // Method 3: Check for user-level installation
    let user_reg_check = Command::new("reg")
        .args([
            "query",
            r"HKCU\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "/v",
            "pv",
        ])
        .output();

    if let Ok(output) = user_reg_check {
        if output.status.success() {
            return Ok("User-level WebView2 found".to_string());
        }
    }

    Err("WebView2 runtime not found. Please install Microsoft Edge WebView2 Runtime.".to_string())
}

/// Show a native Windows message box (works even during panic)
#[cfg(target_os = "windows")]
fn show_windows_error(title: &str, message: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr::null_mut;

    // Convert strings to wide strings for Windows API
    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    let title_wide = to_wide(title);
    let message_wide = to_wide(message);

    // MB_OK | MB_ICONERROR | MB_SYSTEMMODAL
    const MB_OK: u32 = 0x00000000;
    const MB_ICONERROR: u32 = 0x00000010;
    const MB_SYSTEMMODAL: u32 = 0x00001000;

    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(hwnd: *mut (), text: *const u16, caption: *const u16, utype: u32) -> i32;
    }

    unsafe {
        MessageBoxW(
            null_mut(),
            message_wide.as_ptr(),
            title_wide.as_ptr(),
            MB_OK | MB_ICONERROR | MB_SYSTEMMODAL,
        );
    }
}

/// Dummy function for non-Windows platforms
#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
fn show_windows_error(_title: &str, _message: &str) {
    // No-op on non-Windows
}
