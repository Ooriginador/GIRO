use bcrypt::{hash, verify, DEFAULT_COST};

/// Hash a password using bcrypt
pub fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    hash(password, DEFAULT_COST)
}

/// Hash a PIN using bcrypt  
/// PINs são tratados da mesma forma que senhas por segurança
pub fn hash_pin(pin: &str) -> Result<String, bcrypt::BcryptError> {
    hash(pin, DEFAULT_COST)
}

/// Verify a password against a hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
    verify(password, hash)
}

/// Verify a PIN against a hash
pub fn verify_pin(pin: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
    verify(pin, hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify_password() {
        let password = "SuperSenhaSegura123!";
        let hashed = hash_password(password).unwrap();

        assert_ne!(password, hashed);
        assert!(verify_password(password, &hashed).unwrap());
        assert!(!verify_password("SenhaErrada", &hashed).unwrap());
    }

    #[test]
    fn test_hash_and_verify_pin() {
        let pin = "8899";
        let hashed = hash_pin(pin).unwrap();

        assert_ne!(pin, hashed);
        assert!(verify_pin(pin, &hashed).unwrap());
        assert!(!verify_pin("9999", &hashed).unwrap());
    }

    #[test]
    fn test_different_hashes_for_same_input() {
        let password = "test123";
        let hash1 = hash_password(password).unwrap();
        let hash2 = hash_password(password).unwrap();

        // Bcrypt usa salt aleatório, então hashes serão diferentes
        assert_ne!(hash1, hash2);

        // Mas ambos verificam corretamente
        assert!(verify_password(password, &hash1).unwrap());
        assert!(verify_password(password, &hash2).unwrap());
    }
}
