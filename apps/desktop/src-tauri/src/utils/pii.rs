//! PII encryption utilities
//!
//! Encrypts sensitive fields like CPF/CNPJ at rest using AES-256-GCM.

use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;

use crate::error::{AppError, AppResult};

const PREFIX: &str = "enc:";
const KEY_ENV: &str = "GIRO_PII_KEY";

fn load_key() -> Option<[u8; 32]> {
    let key_b64 = std::env::var(KEY_ENV).ok()?;
    let decoded = BASE64.decode(key_b64).ok()?;
    if decoded.len() != 32 {
        tracing::warn!("PII key inválida: tamanho incorreto");
        return None;
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&decoded);
    Some(key)
}

pub fn is_enabled() -> bool {
    load_key().is_some()
}

pub fn encrypt_optional(value: Option<String>) -> AppResult<Option<String>> {
    let Some(value) = value else {
        return Ok(None);
    };

    if value.starts_with(PREFIX) {
        return Ok(Some(value));
    }

    let Some(key) = load_key() else {
        return Ok(Some(value));
    };

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| AppError::Internal(format!("PII cipher error: {e}")))?;

    let mut nonce_bytes = [0u8; 12];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, value.as_bytes())
        .map_err(|e| AppError::Internal(format!("PII encrypt error: {e}")))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);

    Ok(Some(format!("{}{}", PREFIX, BASE64.encode(combined))))
}

pub fn decrypt_optional(value: Option<String>) -> AppResult<Option<String>> {
    let Some(value) = value else {
        return Ok(None);
    };

    if !value.starts_with(PREFIX) {
        return Ok(Some(value));
    }

    let Some(key) = load_key() else {
        return Ok(Some(value));
    };

    let encoded = value.trim_start_matches(PREFIX);
    let combined = BASE64
        .decode(encoded)
        .map_err(|e| AppError::Internal(format!("PII decode error: {e}")))?;

    if combined.len() < 13 {
        return Err(AppError::Internal("PII ciphertext inválido".into()));
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| AppError::Internal(format!("PII cipher error: {e}")))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| AppError::Internal(format!("PII decrypt error: {e}")))?;

    let result = String::from_utf8(plaintext)
        .map_err(|e| AppError::Internal(format!("PII utf8 error: {e}")))?;

    Ok(Some(result))
}

pub fn decrypt_optional_lossy(value: Option<String>) -> Option<String> {
    match decrypt_optional(value.clone()) {
        Ok(result) => result,
        Err(error) => {
            tracing::warn!("Falha ao descriptografar PII: {error:?}");
            value
        }
    }
}
