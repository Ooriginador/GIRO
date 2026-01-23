//! License Key Utility Tests
//!
//! Tests for license key generation and validation

use giro_license_server::utils::generate_license_key;

#[tokio::test]
async fn test_license_key_format() {
    let key = generate_license_key();
    
    // Should match GIRO-XXXX-XXXX-XXXX-XXXX (24 chars)
    assert_eq!(key.len(), 24, "Key should be 24 characters");
    assert!(key.starts_with("GIRO-"), "Key should start with GIRO-");
    
    let parts: Vec<&str> = key.split('-').collect();
    assert_eq!(parts.len(), 5, "Key should have 5 parts");
    assert_eq!(parts[0], "GIRO", "First part should be GIRO");
    
    for part in &parts[1..] {
        assert_eq!(part.len(), 4, "Each part should be 4 characters");
    }
}

#[tokio::test]
async fn test_license_key_uniqueness() {
    let key1 = generate_license_key();
    let key2 = generate_license_key();
    
    assert_ne!(key1, key2, "Generated keys should be unique");
}

#[tokio::test]
async fn test_license_key_valid_characters() {
    // Generate multiple keys and check valid characters
    for _ in 0..10 {
        let key = generate_license_key();
        
        // Should not contain confusing characters (I, O, 0, 1)
        let key_without_prefix = key.replace("GIRO-", "").replace("-", "");
        assert!(!key_without_prefix.contains('I'), "Should not contain I");
        assert!(!key_without_prefix.contains('O'), "Should not contain O");
        assert!(!key_without_prefix.contains('0'), "Should not contain 0");
        assert!(!key_without_prefix.contains('1'), "Should not contain 1");
    }
}

#[tokio::test]
async fn test_license_key_uppercase() {
    let key = generate_license_key();
    
    assert_eq!(key, key.to_uppercase(), "Key should be uppercase");
}
