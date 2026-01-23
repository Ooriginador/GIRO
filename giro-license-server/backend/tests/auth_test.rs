//! Auth Service Unit Tests
//!
//! Tests for password hashing and JWT token management

use giro_license_server::utils::{
    hash_password, verify_password,
    encode_access_token, decode_access_token,
    AccessTokenClaims,
};
use uuid::Uuid;

#[tokio::test]
async fn test_password_hashing() {
    let password = "test_password_123";
    let hash = hash_password(password).expect("Should hash password");
    
    assert!(verify_password(password, &hash).expect("Should verify"));
    assert!(!verify_password("wrong_password", &hash).expect("Should not verify"));
}

#[tokio::test]
async fn test_password_hash_uniqueness() {
    let password = "same_password";
    let hash1 = hash_password(password).unwrap();
    let hash2 = hash_password(password).unwrap();
    
    // Hashes should be different due to salt
    assert_ne!(hash1, hash2);
    
    // But both should verify
    assert!(verify_password(password, &hash1).unwrap());
    assert!(verify_password(password, &hash2).unwrap());
}

#[tokio::test]
async fn test_jwt_token_generation() {
    let admin_id = Uuid::new_v4();
    let email = "test@example.com";
    let secret = "test_secret_key_32_chars_long!!!";
    
    let claims = AccessTokenClaims::new(admin_id, email, 3600);
    let token = encode_access_token(&claims, secret)
        .expect("Should create token");
    
    let decoded = decode_access_token(&token, secret)
        .expect("Should verify token");
    
    assert_eq!(decoded.sub, admin_id);
    assert_eq!(decoded.email, email);
}

#[tokio::test]
async fn test_jwt_token_wrong_secret() {
    let admin_id = Uuid::new_v4();
    let email = "test@example.com";
    let secret = "test_secret_key_32_chars_long!!!";
    let wrong_secret = "wrong_secret_key_32_chars_long!!";
    
    let claims = AccessTokenClaims::new(admin_id, email, 3600);
    let token = encode_access_token(&claims, secret)
        .expect("Should create token");
    
    let result = decode_access_token(&token, wrong_secret);
    assert!(result.is_err());
}

#[tokio::test]
async fn test_password_empty_rejected() {
    let password = "";
    let hash = hash_password("valid_password").unwrap();
    
    // Empty password should not verify
    assert!(!verify_password(password, &hash).unwrap());
}

#[tokio::test]
async fn test_password_special_characters() {
    let password = "P@$$w0rd!#%^&*()";
    let hash = hash_password(password).expect("Should hash password with special chars");
    
    assert!(verify_password(password, &hash).unwrap());
}
