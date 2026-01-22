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
    app_state: State<'_, AppState>,
    hw_state: State<'_, HardwareState>,
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
            match crate::commands::mobile::start_mobile_server(app_state).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "stop_mobile_server" => {
            match crate::commands::mobile::stop_mobile_server(app_state).await {
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
            match crate::commands::mobile::disconnect_mobile_device(device_id, app_state).await {
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
            match crate::commands::network::start_network_client(terminal_name).await {
                Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                Err(e) => Ok(InvokeResult::err(None, e.to_string())),
            }
        }

        "stop_network_client" => match crate::commands::network::stop_network_client().await {
            Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
            Err(e) => Ok(InvokeResult::err(None, e.to_string())),
        },

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
                Ok(cfg) => match crate::commands::hardware::configure_printer(cfg).await {
                    Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                    Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                },
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "test_printer" => match crate::commands::hardware::test_printer(app_state.clone()).await {
            Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
            Err(e) => Ok(InvokeResult::err(None, e.to_string())),
        },

        "read_weight" => match crate::commands::hardware::read_weight(app_state.clone()).await {
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
                Ok(cfg) => match crate::commands::hardware::configure_scale(cfg).await {
                    Ok(_) => Ok(InvokeResult::ok(Some(serde_json::json!({})))),
                    Err(e) => Ok(InvokeResult::err(None, e.to_string())),
                },
                Err(e) => Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    format!("Invalid payload: {}", e),
                )),
            }
        }

        "print_test_documents" => {
            match crate::commands::hardware::print_test_documents(app_state.clone()).await {
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
            match crate::commands::hardware::start_serial_scanner(port, baud).await {
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
            let input: Result<crate::models::CreateSale, _> = serde_json::from_value(val);
            match input {
                Ok(sale_input) => {
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

        "open_cash_session" => {
            if payload.is_none() {
                return Ok(InvokeResult::err(
                    Some("invalid_payload".to_string()),
                    "missing payload".to_string(),
                ));
            }
            let val = payload.unwrap();
            let input: Result<crate::models::CreateCashSession, _> = serde_json::from_value(val);
            match input {
                Ok(session_input) => {
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
                    match crate::commands::hardware::print_receipt(receipt, hw_state).await {
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

        _ => Ok(InvokeResult::err(
            Some("not_found".to_string()),
            format!("Unknown cmd: {}", cmd),
        )),
    }
}
