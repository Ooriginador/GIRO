use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

// Envelope returned by commands
#[derive(Debug, Serialize, Deserialize)]
pub struct InvokeResult<T>
where
    T: Serialize + DeserializeOwned,
{
    pub ok: bool,
    pub code: Option<String>,
    pub error: Option<String>,
    pub data: Option<T>,
}

// Scan message from mobile scanner
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanMessage {
    pub r#type: String,
    pub barcode: String,
    pub ts: String,
    pub device_id: String,
}

// License activation request/response
#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseActivateRequest {
    pub hardware_id: String,
    pub license_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseActivateResponse {
    pub status: String,
    pub activated_at: Option<String>,
    pub expires_at: Option<String>,
    pub message: Option<String>,
}

// Helper to build successful result
impl<T> InvokeResult<T>
where
    T: Serialize + DeserializeOwned,
{
    pub fn ok(data: Option<T>) -> Self {
        Self {
            ok: true,
            code: None,
            error: None,
            data,
        }
    }

    pub fn err(code: Option<String>, error: String) -> Self {
        Self {
            ok: false,
            code,
            error: Some(error),
            data: None,
        }
    }
}
