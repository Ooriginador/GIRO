use crate::ipc_contract::InvokeResult;
use crate::AppState;
use serde_json::Value;
use tauri::State;

/// Generic dispatcher that exposes a single `giro_invoke` command
/// The frontend calls with `cmd` and optional `payload` and receives an `InvokeResult` envelope.
use crate::HardwareState;

#[tauri::command]
pub async fn giro_invoke(
    cmd: String,
    payload: Option<Value>,
    app_handle: tauri::AppHandle,
    app_state: State<'_, AppState>,
    hw_state: State<'_, HardwareState>,
    network_state: State<'_, tokio::sync::RwLock<crate::commands::network::NetworkState>>,
    mobile_state: State<'_, tokio::sync::RwLock<crate::commands::mobile::MobileServerState>>,
) -> Result<InvokeResult<Value>, String> {
    match cmd.as_str() {
        "license.get_hardware_id" => {
            let id = app_state.hardware_id.clone();
            Ok(InvokeResult::ok(Some(serde_json::json!(id))))
        }

        "license.get_stored" => {
            match crate::commands::license::get_stored_license(app_state).await {
                Ok(opt) => Ok(InvokeResult::ok(opt)),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "license.activate" => {
            // expect payload.licenseKey
            let license_key = payload
                .as_ref()
                .and_then(|p| p.get("licenseKey"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let license_key = match license_key {
                Some(k) => k,
                None => {
                    return Ok(InvokeResult::err(
                        Some("invalid_payload".to_string()),
                        "missing licenseKey".to_string(),
                    ))
                }
            };

            match crate::commands::license::activate_license(license_key, app_state).await {
                Ok(info) => {
                    let value = serde_json::to_value(&info).ok();
                    Ok(InvokeResult::ok(value))
                }
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "license.get_server_time" => {
            match crate::commands::license::get_server_time(app_state).await {
                Ok(t) => Ok(InvokeResult::ok(Some(serde_json::json!(t)))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "license.restore_license" => {
            match crate::commands::license::restore_license(app_state).await {
                Ok(opt) => Ok(InvokeResult::ok(serde_json::to_value(opt).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }
        // Direct / legacy aliases (no namespace)
        "activate_license" => {
            let license_key = payload
                .as_ref()
                .and_then(|p| p.get("licenseKey"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let license_key = match license_key {
                Some(k) => k,
                None => {
                    return Ok(InvokeResult::err(
                        Some("invalid_payload".to_string()),
                        "missing licenseKey".to_string(),
                    ))
                }
            };

            match crate::commands::license::activate_license(license_key, app_state).await {
                Ok(info) => Ok(InvokeResult::ok(serde_json::to_value(&info).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "recover_license_from_login" => {
            let p_res = if let Some(val) = payload.as_ref() {
                // Try direct, then nested
                serde_json::from_value::<crate::commands::license::LoginPayload>(val.clone())
                    .or_else(|_| {
                        val.get("payload")
                            .map(|v| serde_json::from_value(v.clone()))
                            .unwrap_or(serde_json::from_value(val.clone()))
                    })
            } else {
                return Ok(InvokeResult::err(
                    Some("missing_payload".to_string()),
                    "Missing payload".to_string(),
                ));
            };

            match p_res {
                Ok(data) => {
                    match crate::commands::license::recover_license_from_login(data, app_state)
                        .await
                    {
                        Ok(info) => Ok(InvokeResult::ok(Some(serde_json::to_value(info).unwrap()))),
                        Err(e) => Ok(InvokeResult::err(None, e)),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}. Received: {:?}", e, payload),
                )),
            }
        }

        "get_stored_license" => {
            match crate::commands::license::get_stored_license(app_state).await {
                Ok(opt) => Ok(InvokeResult::ok(serde_json::to_value(opt).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_hardware_id" => {
            let id = app_state.hardware_id.clone();
            Ok(InvokeResult::ok(Some(serde_json::json!(id))))
        }

        "get_server_time" => match crate::commands::license::get_server_time(app_state).await {
            Ok(t) => Ok(InvokeResult::ok(Some(serde_json::json!(t)))),
            Err(e) => Ok(InvokeResult::err(None, e.to_string())),
        },

        "restore_license" => match crate::commands::license::restore_license(app_state).await {
            Ok(opt) => Ok(InvokeResult::ok(serde_json::to_value(opt).ok())),
            Err(e) => Ok(InvokeResult::err(None, e.to_string())),
        },

        // NFCE aliases
        "update_fiscal_settings" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let input: Result<crate::models::UpdateFiscalSettings, _> = serde_json::from_value(val);
            match input {
                Ok(data) => {
                    match crate::nfce::commands::update_fiscal_settings(app_state, data).await {
                        Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        // Mobile server aliases
        "start_mobile_server" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let input: Result<crate::commands::mobile::StartServerConfig, _> =
                serde_json::from_value(val);

            match input {
                Ok(config) => {
                    match crate::commands::mobile::start_mobile_server(
                        config,
                        app_state,
                        mobile_state,
                    )
                    .await
                    {
                        Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "stop_mobile_server" => {
            match crate::commands::mobile::stop_mobile_server(mobile_state, app_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "disconnect_mobile_device" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let device_id = val
                .get("deviceId")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let device_id = match device_id {
                Some(d) => d,
                None => {
                    return Ok(InvokeResult::err(
                        Some("invalid_payload".to_string()),
                        "missing deviceId".to_string(),
                    ))
                }
            };
            match crate::commands::mobile::disconnect_mobile_device(
                device_id,
                mobile_state,
                app_state,
            )
            .await
            {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        // Network aliases
        "start_network_client" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let terminal_name = val
                .get("terminalName")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_default();
            match crate::commands::network::start_network_client(
                terminal_name,
                app_handle,
                app_state,
                network_state,
            )
            .await
            {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "stop_network_client" => {
            match crate::commands::network::stop_network_client(network_state, app_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        // Hardware aliases
        "configure_printer" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let config = val
                .get("config")
                .cloned()
                .unwrap_or_else(|| serde_json::json!({}));
            let input: Result<crate::hardware::printer::PrinterConfig, _> =
                serde_json::from_value(config);
            match input {
                Ok(cfg) => {
                    match crate::commands::hardware::configure_printer(cfg, app_state, hw_state)
                        .await
                    {
                        Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "test_printer" => {
            match crate::commands::hardware::test_printer(hw_state, app_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "read_weight" => match crate::commands::hardware::read_weight(hw_state, app_state).await {
            Ok(reading) => Ok(InvokeResult::ok(serde_json::to_value(reading).ok())),
            Err(e) => Ok(InvokeResult::err(None, e.to_string())),
        },

        "configure_scale" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let config = val
                .get("config")
                .cloned()
                .unwrap_or_else(|| serde_json::json!({}));
            let input: Result<crate::hardware::scale::ScaleConfig, _> =
                serde_json::from_value(config);
            match input {
                Ok(cfg) => {
                    match crate::commands::hardware::configure_scale(cfg, app_state, hw_state).await
                    {
                        Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "print_test_documents" => {
            match crate::commands::hardware::print_test_documents(hw_state, app_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "start_serial_scanner" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let port = val
                .get("port")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_default();
            let baud = val
                .get("baud")
                .and_then(|v| v.as_u64())
                .map(|n| n as u32)
                .unwrap_or(9600);
            match crate::commands::hardware::start_serial_scanner(port, baud, hw_state, app_state)
                .await
            {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_sale" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();

            // Try wrapping 'input' or direct root
            let input: Result<crate::models::CreateSale, _> = val
                .get("input")
                .map(|v| serde_json::from_value(v.clone()))
                .unwrap_or_else(|| serde_json::from_value(val.clone()));

            match input {
                Ok(mut sale_input) => {
                    let info = app_state
                        .session
                        .require_authenticated()
                        .map_err(|e| e.to_string())?;
                    sale_input.employee_id = info.employee_id;
                    match crate::commands::sales::create_sale(sale_input, app_state).await {
                        Ok(sale) => Ok(InvokeResult::ok(serde_json::to_value(sale).ok())),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "cancel_sale" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let reason = val
                .get("reason")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_default();

            match crate::commands::sales::cancel_sale(id, reason, app_state).await {
                Ok(sale) => Ok(InvokeResult::ok(serde_json::to_value(sale).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "open_cash_session" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();

            // Try wrapping 'input' or direct root
            let input: Result<crate::models::CreateCashSession, _> = val
                .get("input")
                .map(|v| serde_json::from_value(v.clone()))
                .unwrap_or_else(|| serde_json::from_value(val.clone()));

            match input {
                Ok(mut session_input) => {
                    let info = app_state
                        .session
                        .require_authenticated()
                        .map_err(|e| e.to_string())?;
                    session_input.employee_id = info.employee_id;
                    match crate::commands::cash::open_cash_session(session_input, app_state).await {
                        Ok(sess) => Ok(InvokeResult::ok(serde_json::to_value(sess).ok())),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "create_product" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateProduct =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::create_product(input, app_state, network_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_product" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let input: crate::models::UpdateProduct =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::update_product(id, input, app_state, network_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_category" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateCategory =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::create_category(input, app_state, network_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_category" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let input: crate::models::UpdateCategory =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;
            match crate::commands::update_category(id, input, app_state, network_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_employee" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateEmployee =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;
            match crate::commands::create_employee(input, app_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_employee" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let input: crate::models::UpdateEmployee =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;
            match crate::commands::update_employee(id, input, app_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "deactivate_employee" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            match crate::commands::deactivate_employee(id, app_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "close_cash_session" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let actual_balance = val
                .get("actualBalance")
                .or_else(|| val.get("actual_balance"))
                .and_then(|v| v.as_f64())
                .ok_or_else(|| "missing actualBalance".to_string())?;
            let notes = val
                .get("notes")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match crate::commands::cash::close_cash_session(id, actual_balance, notes, app_state)
                .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_stock_movement" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateStockMovement =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::create_stock_movement(input, app_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_service_order" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateServiceOrder =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::service_orders::create_service_order(
                app_state,
                input,
                network_state,
            )
            .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "start_service_order" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;

            match crate::commands::service_orders::start_service_order(app_state, id, network_state)
                .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "complete_service_order" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let diagnosis = val
                .get("diagnosis")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match crate::commands::service_orders::complete_service_order(
                app_state,
                id,
                diagnosis,
                network_state,
            )
            .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "deliver_service_order" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let payment_method = val
                .get("payment_method")
                .or_else(|| val.get("paymentMethod"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing payment_method".to_string())?;

            match crate::commands::service_orders::deliver_service_order(
                app_state,
                id,
                payment_method,
                network_state,
            )
            .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "cancel_service_order" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let notes = val
                .get("notes")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match crate::commands::service_orders::cancel_service_order(
                app_state,
                id,
                notes,
                network_state,
            )
            .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_service_order" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let input: crate::models::UpdateServiceOrder =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::service_orders::update_service_order(
                app_state,
                id,
                input,
                network_state,
            )
            .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "finish_service_order" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;

            // Try wrapping 'payments' or use empty vec
            let payments: Vec<crate::models::CreateSalePayment> = val
                .get("payments")
                .map(|v| serde_json::from_value(v.clone()))
                .unwrap_or_else(|| Ok(Vec::new()))
                .map_err(|e| format!("Invalid payments: {}", e))?;

            let amount_paid = val
                .get("amount_paid")
                .or_else(|| val.get("amountPaid"))
                .and_then(|v| v.as_f64())
                .ok_or_else(|| "missing amount_paid".to_string())?;
            let cash_session_id = val
                .get("cash_session_id")
                .or_else(|| val.get("cashSessionId"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing cash_session_id".to_string())?;

            match crate::commands::service_orders::finish_service_order(
                app_state,
                id,
                payments,
                amount_paid,
                cash_session_id,
                network_state,
            )
            .await
            {
                Ok(sale_id) => Ok(InvokeResult::ok(Some(serde_json::json!(sale_id)))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "add_service_order_item" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::AddServiceOrderItem =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::service_orders::add_service_order_item(
                app_state,
                input.order_id,
                input.product_id,
                input.item_type,
                input.description,
                input.quantity,
                input.unit_price,
                input.discount,
                input.notes,
            )
            .await
            {
                Ok(item) => Ok(InvokeResult::ok(serde_json::to_value(item).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_service" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateService =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::service_orders::create_service(app_state, input).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_service" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let input: crate::models::UpdateService =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::service_orders::update_service(app_state, id, input).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_customer" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateCustomer =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::create_customer(input, app_state, network_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_customer" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let input: crate::models::UpdateCustomer =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::update_customer(id, input, app_state, network_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_customer_vehicle" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateCustomerVehicle =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::create_customer_vehicle(input, app_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "create_supplier" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::CreateSupplier =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::suppliers::create_supplier(input, app_state, network_state).await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_supplier" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;
            let input: crate::models::UpdateSupplier =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::suppliers::update_supplier(id, input, app_state, network_state)
                .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "deactivate_supplier" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;

            match crate::commands::suppliers::deactivate_supplier(id, app_state, network_state)
                .await
            {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "reactivate_supplier" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let id = val
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing id".to_string())?;

            match crate::commands::suppliers::reactivate_supplier(id, app_state, network_state)
                .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_sales_report" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let start_date = val
                .get("startDate")
                .or_else(|| val.get("start_date"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing startDate".to_string())?;
            let end_date = val
                .get("endDate")
                .or_else(|| val.get("end_date"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing endDate".to_string())?;

            match crate::commands::reports::get_sales_report(start_date, end_date, app_state).await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_top_products" => {
            let val = payload
                .as_ref()
                .ok_or_else(|| "missing payload".to_string())?;
            let limit = val
                .get("limit")
                .and_then(|v| v.as_i64())
                .map(|n| n as i32)
                .unwrap_or(20);

            match crate::commands::reports::get_top_products(limit, app_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_stock_report" => {
            let category_id = payload
                .as_ref()
                .and_then(|p| p.get("categoryId").or_else(|| p.get("category_id")))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match crate::commands::reports::get_stock_report(category_id, app_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "update_service_order_item" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let item_id = val
                .get("itemId")
                .or_else(|| val.get("item_id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing itemId".to_string())?;
            let quantity = val.get("quantity").and_then(|v| v.as_f64());
            let unit_price = val
                .get("unitPrice")
                .or_else(|| val.get("unit_price"))
                .and_then(|v| v.as_f64());
            let discount = val.get("discount").and_then(|v| v.as_f64());
            let notes = val
                .get("notes")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            match crate::commands::service_orders::update_service_order_item(
                app_state, item_id, quantity, unit_price, discount, notes,
            )
            .await
            {
                Ok(item) => Ok(InvokeResult::ok(serde_json::to_value(item).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "remove_service_order_item" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let item_id = val
                .get("itemId")
                .or_else(|| val.get("item_id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing itemId".to_string())?;

            match crate::commands::service_orders::remove_service_order_item(app_state, item_id)
                .await
            {
                Ok(()) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_motoparts_dashboard_stats" => {
            match crate::commands::reports_motoparts::get_motoparts_dashboard_stats(app_state).await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_service_order_stats" => {
            match crate::commands::reports_motoparts::get_service_order_stats(app_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_top_products_motoparts" => {
            let limit = payload
                .as_ref()
                .and_then(|p| p.get("limit"))
                .and_then(|v| v.as_i64())
                .map(|n| n as i32)
                .unwrap_or(10);
            match crate::commands::reports_motoparts::get_top_products_motoparts(limit, app_state)
                .await
            {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "add_cash_movement" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let input: Result<crate::models::CreateCashMovement, _> = val
                .get("input")
                .map(|v| serde_json::from_value(v.clone()))
                .unwrap_or_else(|| serde_json::from_value(val.clone()));

            match input {
                Ok(mut movement_input) => {
                    let info = app_state
                        .session
                        .require_authenticated()
                        .map_err(|e| e.to_string())?;
                    movement_input.employee_id = info.employee_id.clone();

                    match crate::commands::cash::add_cash_movement(movement_input, app_state).await
                    {
                        Ok(mv) => Ok(InvokeResult::ok(serde_json::to_value(mv).ok())),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "print_receipt" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let input: Result<crate::hardware::printer::Receipt, _> = serde_json::from_value(val);
            match input {
                Ok(receipt) => {
                    match crate::commands::hardware::print_receipt(receipt, hw_state, app_state)
                        .await
                    {
                        Ok(()) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                        Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                    }
                }
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "set_setting" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let input: crate::models::SetSetting =
                serde_json::from_value(val.get("input").cloned().unwrap_or_else(|| val.clone()))
                    .map_err(|e| format!("Invalid input: {}", e))?;

            match crate::commands::settings::set_setting(input, app_state, network_state).await {
                Ok(res) => Ok(InvokeResult::ok(serde_json::to_value(res).ok())),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "delete_setting" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let key = val
                .get("key")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing key".to_string())?;

            match crate::commands::settings::delete_setting(key, app_state, network_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "list_cloud_backups_cmd" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let bearer_token = val
                .get("bearerToken")
                .or_else(|| val.get("bearer_token"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing bearerToken".to_string())?;

            match crate::commands::backup::list_cloud_backups_cmd(app_state, bearer_token).await {
                Ok(res) => Ok(InvokeResult::ok(Some(res))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "upload_cloud_backup_cmd" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let bearer_token = val
                .get("bearerToken")
                .or_else(|| val.get("bearer_token"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing bearerToken".to_string())?;
            let filename = val
                .get("filename")
                .or_else(|| val.get("fileName"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing filename".to_string())?;

            match crate::commands::backup::upload_cloud_backup_cmd(
                app_state,
                bearer_token,
                filename,
            )
            .await
            {
                Ok(res) => Ok(InvokeResult::ok(Some(res))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "get_cloud_backup_cmd" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let bearer_token = val
                .get("bearerToken")
                .or_else(|| val.get("bearer_token"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing bearerToken".to_string())?;
            let backup_id = val
                .get("backupId")
                .or_else(|| val.get("backup_id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing backupId".to_string())?;

            match crate::commands::backup::get_cloud_backup_cmd(app_state, bearer_token, backup_id)
                .await
            {
                Ok(res) => Ok(InvokeResult::ok(Some(res))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "delete_cloud_backup_cmd" => {
            let val = payload.ok_or_else(|| "missing payload".to_string())?;
            let bearer_token = val
                .get("bearerToken")
                .or_else(|| val.get("bearer_token"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing bearerToken".to_string())?;
            let backup_id = val
                .get("backupId")
                .or_else(|| val.get("backup_id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| "missing backupId".to_string())?;

            match crate::commands::backup::delete_cloud_backup_cmd(
                app_state,
                bearer_token,
                backup_id,
            )
            .await
            {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        _ => Ok(InvokeResult::err(
            Some("not_found".to_string()),
            format!("Unknown cmd: {}", cmd),
        )),
    }
}
