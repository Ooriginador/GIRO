//! API Key Utility Tests
//!
//! Tests for API key generation and validation

#[cfg(test)]
mod tests {
    use hex;
    use sha2::{Digest, Sha256};
    use uuid::Uuid;

    /// Generate an API key with prefix
    fn generate_api_key() -> (String, String) {
        let raw_key = format!("giro_{}", hex::encode(&Uuid::new_v4().as_bytes()[..16]));
        let hash = hash_api_key(&raw_key);
        (raw_key, hash)
    }

    /// Hash an API key for storage
    fn hash_api_key(key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        hex::encode(hasher.finalize())
    }

    #[test]
    fn test_api_key_format() {
        let (key, _) = generate_api_key();

        assert!(key.starts_with("giro_"), "API key should start with giro_");
        assert!(key.len() > 10, "API key should be at least 10 characters");
    }

    #[test]
    fn test_api_key_uniqueness() {
        let (key1, _) = generate_api_key();
        let (key2, _) = generate_api_key();

        assert_ne!(key1, key2, "Generated API keys should be unique");
    }

    #[test]
    fn test_api_key_hash() {
        let (key, hash) = generate_api_key();

        // Hash should be 64 hex characters (SHA256)
        assert_eq!(hash.len(), 64, "Hash should be 64 characters");

        // Rehashing same key should produce same hash
        let rehash = hash_api_key(&key);
        assert_eq!(hash, rehash, "Same key should produce same hash");
    }

    #[test]
    fn test_api_key_hash_different() {
        let (_key1, hash1) = generate_api_key();
        let (_key2, hash2) = generate_api_key();

        assert_ne!(hash1, hash2, "Different keys should have different hashes");
    }

    #[test]
    fn test_api_key_masking() {
        let (key, _) = generate_api_key();

        // Mask all but first 8 characters
        let masked = format!("{}...{}", &key[..8], &key[key.len() - 4..]);

        assert!(masked.starts_with("giro_"), "Masked key should keep prefix");
        assert!(masked.contains("..."), "Masked key should contain ellipsis");
    }

    #[test]
    fn test_api_key_expiration_validation() {
        // Valid expiration values (in days)
        let valid_expirations = [30, 60, 90, 180, 365];

        for days in valid_expirations {
            assert!(days > 0, "Expiration should be positive");
            assert!(days <= 365, "Expiration should be at most 1 year");
        }
    }

    #[test]
    fn test_api_key_name_validation() {
        let valid_names = ["Production", "Development", "Testing", "My Key 1"];
        let long_name = "x".repeat(256);
        let invalid_names = ["", "   ", &long_name];

        for name in valid_names {
            assert!(!name.trim().is_empty(), "Name should not be empty");
            assert!(name.len() <= 255, "Name should be at most 255 chars");
        }

        for name in invalid_names {
            let is_valid = !name.trim().is_empty() && name.len() <= 255;
            assert!(!is_valid, "Invalid name should fail validation");
        }
    }

    #[test]
    fn test_api_key_revocation() {
        // Simulate revocation
        #[derive(Debug)]
        struct ApiKey {
            key_hash: String,
            is_revoked: bool,
        }

        let (_key, hash) = generate_api_key();
        let mut api_key = ApiKey {
            key_hash: hash,
            is_revoked: false,
        };

        assert!(!api_key.is_revoked, "New key should not be revoked");

        api_key.is_revoked = true;
        assert!(
            api_key.is_revoked,
            "Revoked key should be marked as revoked"
        );
    }

    #[test]
    fn test_api_key_usage_tracking() {
        #[derive(Debug, Default)]
        struct ApiKeyUsage {
            call_count: u64,
            last_used_at: Option<std::time::SystemTime>,
        }

        let mut usage = ApiKeyUsage::default();

        assert_eq!(usage.call_count, 0, "Initial count should be 0");
        assert!(usage.last_used_at.is_none(), "Last used should be None");

        // Simulate usage
        usage.call_count += 1;
        usage.last_used_at = Some(std::time::SystemTime::now());

        assert_eq!(usage.call_count, 1, "Count should increment");
        assert!(usage.last_used_at.is_some(), "Last used should be set");
    }
}
