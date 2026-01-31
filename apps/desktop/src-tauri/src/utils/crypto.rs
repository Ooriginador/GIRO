//! Utilitários de Criptografia
//!
//! Funções para hashing seguro de senhas usando Argon2id

use crate::error::{AppError, AppResult};
use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Algorithm, Argon2, Params, Version};

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES (Recomendações OWASP 2024)
// ════════════════════════════════════════════════════════════════════════════

/// Memória em KB (64 MB)
const ARGON2_MEMORY_COST: u32 = 65536;

/// Iterações (recomendado: 3-4 para servidores, 1-2 para desktop)
const ARGON2_TIME_COST: u32 = 2;

/// Threads paralelas
const ARGON2_PARALLELISM: u32 = 1;

/// Tamanho do output em bytes
const ARGON2_OUTPUT_LEN: usize = 32;

// ════════════════════════════════════════════════════════════════════════════
// HASHING DE SENHA
// ════════════════════════════════════════════════════════════════════════════

/// Hash de senha usando Argon2id
///
/// # Segurança
/// - Algoritmo: Argon2id (híbrido, resistente a side-channel e GPU)
/// - Memória: 64 MB
/// - Iterações: 2
/// - Salt: 128-bit aleatório (gerado automaticamente)
///
/// # Exemplo
/// ```rust
/// let hash = hash_password("minha_senha_segura")?;
/// // Retorna: $argon2id$v=19$m=65536,t=2,p=1$salt$hash
/// ```
pub fn hash_password(password: &str) -> AppResult<String> {
    // Validar entrada
    if password.is_empty() {
        return Err(AppError::ValidationError(
            "Senha não pode ser vazia".to_string(),
        ));
    }

    // Gerar salt aleatório
    let salt = SaltString::generate(&mut OsRng);

    // Configurar Argon2id
    let params = Params::new(
        ARGON2_MEMORY_COST,
        ARGON2_TIME_COST,
        ARGON2_PARALLELISM,
        Some(ARGON2_OUTPUT_LEN),
    )
    .map_err(|e| AppError::Internal(format!("Erro ao configurar Argon2: {}", e)))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    // Gerar hash
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Erro ao gerar hash: {}", e)))?
        .to_string();

    Ok(password_hash)
}

/// Verificar senha contra hash
///
/// # Exemplo
/// ```rust
/// let is_valid = verify_password("senha_digitada", &hash_armazenado)?;
/// if is_valid {
///     println!("Senha correta!");
/// }
/// ```
pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    // Parse do hash armazenado
    let parsed_hash =
        PasswordHash::new(hash).map_err(|e| AppError::Internal(format!("Hash inválido: {}", e)))?;

    // Criar Argon2 com mesmos parâmetros
    let argon2 = Argon2::default();

    // Verificar senha
    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(_) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false), // Senha incorreta
        Err(e) => Err(AppError::Internal(format!(
            "Erro ao verificar senha: {}",
            e
        ))),
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATION (para reset de senha)
// ════════════════════════════════════════════════════════════════════════════

/// Gera token aleatório para reset de senha (URL-safe)
///
/// # Exemplo
/// ```rust
/// let token = generate_reset_token();
/// // Retorna: "a1b2c3d4e5f6..." (32 caracteres hex)
/// ```
pub fn generate_reset_token() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 32] = rng.gen();
    hex::encode(bytes)
}

// ════════════════════════════════════════════════════════════════════════════
// ANÁLISE DE FORÇA DE SENHA
// ════════════════════════════════════════════════════════════════════════════

use crate::models::auth::PasswordStrength;

/// Calcula força da senha (score 0-4)
///
/// Baseado em:
/// - Comprimento
/// - Variedade de caracteres
/// - Padrões comuns
/// - Entropia
pub fn calculate_password_strength(password: &str) -> PasswordStrength {
    let mut score = 0u8;
    let mut feedback = Vec::new();

    // Comprimento
    if password.len() >= 12 {
        score += 1;
    } else if password.len() >= 8 {
        score += 0; // neutro
    } else {
        feedback.push("Senha muito curta (mínimo 8 caracteres)".to_string());
    }

    // Variedade
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_numbers = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());

    let variety_count = [has_lowercase, has_uppercase, has_numbers, has_special]
        .iter()
        .filter(|&&x| x)
        .count();

    score += match variety_count {
        4 => 2,
        3 => 1,
        _ => {
            feedback.push("Use letras maiúsculas, minúsculas, números e símbolos".to_string());
            0
        }
    };

    // Padrões comuns (senhas fracas)
    let weak_passwords = [
        "password", "senha", "123456", "qwerty", "admin", "letmein", "abc123",
    ];
    let lower = password.to_lowercase();
    if weak_passwords.iter().any(|&w| lower.contains(w)) {
        score = score.saturating_sub(1);
        feedback.push("Evite padrões comuns".to_string());
    }

    // Sequências
    if has_sequence(password) {
        score = score.saturating_sub(1);
        feedback.push("Evite sequências (123, abc)".to_string());
    }

    // Repetições
    if has_repetition(password) {
        feedback.push("Evite repetições (aaa, 111)".to_string());
    }

    // Cap score at 4
    score = score.min(4);

    // Determinar tempo de crack (simplificado)
    let crack_time = match score {
        0 => "segundos",
        1 => "minutos",
        2 => "horas",
        3 => "dias",
        4 => "anos",
        _ => "desconhecido",
    };

    PasswordStrength {
        score,
        feedback,
        is_valid: score >= 2, // Requer score mínimo 2
        crack_time_display: format!("Tempo para quebrar: {}", crack_time),
    }
}

/// Detecta sequências (123, abc, etc)
fn has_sequence(password: &str) -> bool {
    let chars: Vec<char> = password.chars().collect();
    for window in chars.windows(3) {
        let a = window[0] as u32;
        let b = window[1] as u32;
        let c = window[2] as u32;

        // Sequência crescente ou decrescente
        if (b == a + 1 && c == b + 1) || (b + 1 == a && c + 1 == b) {
            return true;
        }
    }
    false
}

/// Detecta repetições (aaa, 111, etc)
fn has_repetition(password: &str) -> bool {
    let chars: Vec<char> = password.chars().collect();
    for window in chars.windows(3) {
        if window[0] == window[1] && window[1] == window[2] {
            return true;
        }
    }
    false
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify_password() {
        let password = "MinhaS3nh@Segura";
        let hash = hash_password(password).unwrap();

        // Hash deve seguir formato Argon2
        assert!(hash.starts_with("$argon2id$"));

        // Verificação deve funcionar
        assert!(verify_password(password, &hash).unwrap());

        // Senha incorreta deve falhar
        assert!(!verify_password("senha_errada", &hash).unwrap());
    }

    #[test]
    fn test_hash_different_salts() {
        let password = "mesma_senha";
        let hash1 = hash_password(password).unwrap();
        let hash2 = hash_password(password).unwrap();

        // Hashes devem ser diferentes (salt aleatório)
        assert_ne!(hash1, hash2);

        // Mas ambos devem verificar
        assert!(verify_password(password, &hash1).unwrap());
        assert!(verify_password(password, &hash2).unwrap());
    }

    #[test]
    fn test_generate_reset_token() {
        let token1 = generate_reset_token();
        let token2 = generate_reset_token();

        // Tokens devem ser diferentes
        assert_ne!(token1, token2);

        // Deve ter 64 caracteres (32 bytes em hex)
        assert_eq!(token1.len(), 64);
        assert_eq!(token2.len(), 64);

        // Deve ser hex válido
        assert!(token1.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_password_strength() {
        // Senha forte
        let strong = calculate_password_strength("MinhaS3nh@Segura123");
        assert!(strong.score >= 3);
        assert!(strong.is_valid);

        // Senha fraca
        let weak = calculate_password_strength("123456");
        assert!(weak.score <= 1);
        assert!(!weak.is_valid);

        // Senha média
        let medium = calculate_password_strength("Senha123");
        assert!(medium.score == 2 || medium.score == 3);
    }

    #[test]
    fn test_sequence_detection() {
        assert!(has_sequence("abc123"));
        assert!(has_sequence("xyz456"));
        assert!(!has_sequence("adx359"));
    }

    #[test]
    fn test_repetition_detection() {
        assert!(has_repetition("aaa"));
        assert!(has_repetition("111"));
        assert!(!has_repetition("abc"));
    }

    #[test]
    fn test_empty_password_rejected() {
        let result = hash_password("");
        assert!(result.is_err());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_password_success() {
        let password = "TestPassword123!";
        let hash = hash_password(password).expect("Hashing should succeed");
        
        assert!(hash.starts_with("$argon2id$"));
        assert_ne!(password, hash);
    }

    #[test]
    fn test_verify_password_success() {
        let password = "TestPassword123!";
        let hash = hash_password(password).expect("Hashing should succeed");
        
        // Correct password
        let is_valid = verify_password(password, &hash).expect("Verification should run");
        assert!(is_valid);
    }

    #[test]
    fn test_verify_password_failure() {
        let password = "TestPassword123!";
        let hash = hash_password(password).expect("Hashing should succeed");
        
        // Wrong password
        let is_valid = verify_password("WrongPassword", &hash).expect("Verification should run");
        assert!(!is_valid);
    }

    #[test]
    fn test_empty_password_fails() {
        let result = hash_password("");
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_invalid_hash_string() {
        let result = verify_password("password", "not_a_valid_hash");
        assert!(result.is_err());
    }
}
