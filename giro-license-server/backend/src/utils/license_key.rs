//! License Key Generation
//!
//! Generate unique license keys in format: GIRO-XXXX-XXXX-XXXX-XXXX

use rand::Rng;

const LICENSE_PREFIX: &str = "GIRO";
const SEGMENT_LENGTH: usize = 4;
const NUM_SEGMENTS: usize = 4;
const ALLOWED_CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion

/// Generate a new unique license key
/// Format: GIRO-XXXX-XXXX-XXXX-XXXX
pub fn generate_license_key() -> String {
    let mut rng = rand::thread_rng();
    let mut segments = Vec::with_capacity(NUM_SEGMENTS);

    for _ in 0..NUM_SEGMENTS {
        let segment: String = (0..SEGMENT_LENGTH)
            .map(|_| {
                let idx = rng.gen_range(0..ALLOWED_CHARS.len());
                ALLOWED_CHARS[idx] as char
            })
            .collect();
        segments.push(segment);
    }

    format!("{}-{}", LICENSE_PREFIX, segments.join("-"))
}

/// Validate license key format
pub fn validate_license_key_format(key: &str) -> bool {
    // Must match: GIRO-XXXX-XXXX-XXXX-XXXX (24 chars)
    if key.len() != 24 {
        return false;
    }

    if !key.starts_with("GIRO-") {
        return false;
    }

    let parts: Vec<&str> = key.split('-').collect();
    if parts.len() != 5 {
        return false;
    }

    // First part must be "GIRO"
    if parts[0] != "GIRO" {
        return false;
    }

    // Other parts must be 4 chars from allowed set
    for part in &parts[1..] {
        if part.len() != SEGMENT_LENGTH {
            return false;
        }
        if !part.chars().all(|c| ALLOWED_CHARS.contains(&(c as u8))) {
            return false;
        }
    }

    true
}

/// Normalize a license key (uppercase, remove extra spaces)
pub fn normalize_license_key(key: &str) -> String {
    key.trim().to_uppercase().replace(' ', "")
}

/// Normalize machine name for comparison
pub fn normalize_machine_name(name: Option<&str>) -> String {
    name.unwrap_or_default().trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_license_key() {
        let key = generate_license_key();

        assert!(key.starts_with("GIRO-"));
        assert_eq!(key.len(), 24); // GIRO-XXXX-XXXX-XXXX-XXXX = 24 chars
        assert!(validate_license_key_format(&key));
    }

    #[test]
    fn test_validate_license_key_format() {
        assert!(validate_license_key_format("GIRO-ABCD-EFGH-JKLM-NPQR"));
        assert!(validate_license_key_format("GIRO-2345-6789-ABCD-EFGH"));

        // Invalid cases
        assert!(!validate_license_key_format("GIRO-ABCD-EFGH-JKLM")); // Too short
        assert!(!validate_license_key_format("ABCD-EFGH-JKLM-NPQR-STUV")); // Wrong prefix
        assert!(!validate_license_key_format("GIRO-ABCD-EFGH-IJKL-MNOP")); // Contains I
        assert!(!validate_license_key_format("GIRO-ABCD-EFGH-0123-4567")); // Contains 0, 1
    }

    #[test]
    fn test_normalize_license_key() {
        assert_eq!(
            normalize_license_key("  giro-abcd-efgh-jklm-npqr  "),
            "GIRO-ABCD-EFGH-JKLM-NPQR"
        );
    }
}
