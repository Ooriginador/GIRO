use crate::ipc_contract::InvokeResult;
use crate::AppState;
use serde_json::Value;
use tauri::State;

/// Generic dispatcher that exposes a single `giro_invoke` command
/// The frontend calls with `cmd` and optional `payload` and receives an `InvokeResult` envelope.
#[tauri::command]
pub async fn giro_invoke(cmd: String, payload: Option<Value>, state: State<'_, AppState>) -> InvokeResult<Value> {
    match cmd.as_str() {
        "license.get_hardware_id" => {
            let id = state.hardware_id.clone();
            InvokeResult::ok(Some(serde_json::json!(id)))
        }

        "license.get_stored" => {
            match crate::commands::license::get_stored_license(state).await {
                Ok(opt) => InvokeResult::ok(opt.map(|v| v)),
                Err(e) => InvokeResult::err(None, format!("{}", e)),
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
                None => return InvokeResult::err(Some("invalid_payload".to_string()), "missing licenseKey".to_string()),
            };

            match crate::commands::license::activate_license(license_key, state).await {
                Ok(info) => {
                    let value = serde_json::to_value(&info).ok();
                    InvokeResult::ok(value)
                }
                Err(e) => InvokeResult::err(None, format!("{}", e)),
            }
        }

        "license.get_server_time" => match crate::commands::license::get_server_time(state).await {
            Ok(t) => InvokeResult::ok(Some(serde_json::json!(t))),
            Err(e) => InvokeResult::err(None, format!("{}", e)),
        },

        "create_sale" => {
            if payload.is_none() {
                return InvokeResult::err(Some("invalid_payload".to_string()), "missing payload".to_string());
            }
            let val = payload.unwrap();
            let input: Result<crate::models::CreateSale, _> = serde_json::from_value(val);
            match input {
                Ok(sale_input) => match crate::commands::sales::create_sale(sale_input, state).await {
                    Ok(sale) => InvokeResult::ok(serde_json::to_value(sale).ok()),
                    Err(e) => InvokeResult::err(None, format!("{}", e)),
                },
                Err(e) => InvokeResult::err(Some("invalid_payload".to_string()), format!("Invalid payload: {}", e)),
            }
        }

        "open_cash_session" => {
            if payload.is_none() {
                return InvokeResult::err(Some("invalid_payload".to_string()), "missing payload".to_string());
            }
            let val = payload.unwrap();
            let input: Result<crate::models::CreateCashSession, _> = serde_json::from_value(val);
            match input {
                Ok(session_input) => match crate::commands::cash::open_cash_session(session_input, state).await {
                    Ok(sess) => InvokeResult::ok(serde_json::to_value(sess).ok()),
                    Err(e) => InvokeResult::err(None, format!("{}", e)),
                },
                Err(e) => InvokeResult::err(Some("invalid_payload".to_string()), format!("Invalid payload: {}", e)),
            }
        }

        "print_receipt" => {
            if payload.is_none() {
                return InvokeResult::err(Some("invalid_payload".to_string()), "missing payload".to_string());
            }
            let val = payload.unwrap();
            let input: Result<crate::hardware::printer::Receipt, _> = serde_json::from_value(val);
            match input {
                Ok(receipt) => match crate::commands::hardware::print_receipt(receipt, state).await {
                    Ok(()) => InvokeResult::ok(Some(serde_json::json!({}))),
                    Err(e) => InvokeResult::err(None, format!("{}", e)),
                },
                Err(e) => InvokeResult::err(Some("invalid_payload".to_string()), format!("Invalid payload: {}", e)),
            }
        }

        _ => InvokeResult::err(Some("not_found".to_string()), format!("Unknown cmd: {}", cmd)),
    }
}
