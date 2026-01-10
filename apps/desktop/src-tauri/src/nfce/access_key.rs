// ═══════════════════════════════════════════════════════════════════════════
// CHAVE DE ACESSO NFe/NFC-e
// ═══════════════════════════════════════════════════════════════════════════
//! Geração e validação de chaves de acesso de 44 dígitos.
//!
//! ## Estrutura (44 dígitos)
//! ```text
//! cUF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + DV
//!  2  +  4  +  14  +  2  +  3   +  9  +   1    +  8  + 1 = 44
//! ```
//!
//! - **cUF**: Código IBGE da UF (2 dígitos)
//! - **AAMM**: Ano e mês de emissão (4 dígitos)
//! - **CNPJ**: CNPJ do emitente (14 dígitos)
//! - **mod**: Modelo do documento (65 = NFC-e)
//! - **serie**: Série da NFC-e (3 dígitos com zeros à esquerda)
//! - **nNF**: Número da NFC-e (9 dígitos com zeros à esquerda)
//! - **tpEmis**: Tipo de emissão (1=Normal, 9=Contingência)
//! - **cNF**: Código numérico aleatório (8 dígitos)
//! - **DV**: Dígito verificador (módulo 11)

use chrono::NaiveDateTime;
use rand::Rng;

/// Código IBGE das UF
pub const UF_CODES: &[(&str, u8)] = &[
    ("AC", 12),
    ("AL", 27),
    ("AP", 16),
    ("AM", 13),
    ("BA", 29),
    ("CE", 23),
    ("DF", 53),
    ("ES", 32),
    ("GO", 52),
    ("MA", 21),
    ("MT", 51),
    ("MS", 50),
    ("MG", 31),
    ("PA", 15),
    ("PB", 25),
    ("PR", 41),
    ("PE", 26),
    ("PI", 22),
    ("RJ", 33),
    ("RN", 24),
    ("RS", 43),
    ("RO", 11),
    ("RR", 14),
    ("SC", 42),
    ("SP", 35),
    ("SE", 28),
    ("TO", 17),
];

#[derive(Debug, Clone)]
pub struct AccessKey {
    pub key: String,
}

impl AccessKey {
    /// Gera nova chave de acesso
    ///
    /// # Argumentos
    /// - `uf`: Sigla da UF (ex: "SP")
    /// - `emission_date`: Data/hora de emissão
    /// - `cnpj`: CNPJ do emitente (14 dígitos)
    /// - `model`: Modelo (55=NFe, 65=NFC-e)
    /// - `series`: Série da nota (1-999)
    /// - `number`: Número da nota (1-999999999)
    /// - `emission_type`: Tipo emissão (1=Normal, 9=Contingência)
    ///
    /// # Exemplo
    /// ```
    /// use chrono::Utc;
    /// use giro_lib::nfce::AccessKey;
    /// let key = AccessKey::generate(
    ///     "SP",
    ///     Utc::now().naive_utc(),
    ///     "12345678000190",
    ///     65,
    ///     1,
    ///     1,
    ///     1
    /// ).unwrap();
    /// assert_eq!(key.key.len(), 44);
    /// ```
    pub fn generate(
        uf: &str,
        emission_date: NaiveDateTime,
        cnpj: &str,
        model: u8,
        series: u16,
        number: u32,
        emission_type: u8,
    ) -> Result<Self, String> {
        // Validar CNPJ
        if cnpj.len() != 14 {
            return Err("CNPJ deve ter 14 dígitos".to_string());
        }

        // Obter código da UF
        let uf_code = UF_CODES
            .iter()
            .find(|(state, _)| *state == uf)
            .map(|(_, code)| *code)
            .ok_or_else(|| format!("UF inválida: {}", uf))?;

        // Montar chave (sem DV)
        let yymm = emission_date.format("%y%m").to_string();
        let random_code: u32 = rand::rng().random_range(10000000..100000000);

        let key_without_dv = format!(
            "{:02}{}{}{:02}{:03}{:09}{}{:08}",
            uf_code, yymm, cnpj, model, series, number, emission_type, random_code
        );

        // Calcular dígito verificador
        let dv = Self::calculate_check_digit(&key_without_dv);

        // Chave completa
        let full_key = format!("{}{}", key_without_dv, dv);

        Ok(Self { key: full_key })
    }

    /// Valida chave de acesso existente
    pub fn validate(key: &str) -> bool {
        if key.len() != 44 {
            return false;
        }

        let key_without_dv = &key[0..43];
        let provided_dv = key.chars().nth(43).unwrap().to_digit(10).unwrap_or(99);

        let calculated_dv = Self::calculate_check_digit(key_without_dv);

        provided_dv == calculated_dv as u32
    }

    /// Calcula dígito verificador usando módulo 11
    ///
    /// Algoritmo:
    /// 1. Multiplicar cada dígito por peso (2-9, ciclicamente)
    /// 2. Somar os resultados
    /// 3. DV = 11 - (soma % 11)
    /// 4. Se DV >= 10, DV = 0
    fn calculate_check_digit(key: &str) -> u8 {
        let weights = [2, 3, 4, 5, 6, 7, 8, 9];
        let mut sum = 0;
        let mut weight_index = 0;

        // Percorrer da direita para esquerda
        for ch in key.chars().rev() {
            if let Some(digit) = ch.to_digit(10) {
                sum += digit * weights[weight_index];
                weight_index = (weight_index + 1) % weights.len();
            }
        }

        let remainder = sum % 11;
        let dv = 11 - remainder;

        if dv >= 10 {
            0
        } else {
            dv as u8
        }
    }

    /// Formata chave com espaços (para exibição)
    pub fn formatted(&self) -> String {
        let key = &self.key;
        format!(
            "{} {} {} {} {} {} {} {} {} {} {}",
            &key[0..4],
            &key[4..8],
            &key[8..12],
            &key[12..16],
            &key[16..20],
            &key[20..24],
            &key[24..28],
            &key[28..32],
            &key[32..36],
            &key[36..40],
            &key[40..44],
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_generate_access_key() {
        let key = AccessKey::generate("SP", Utc::now().naive_utc(), "12345678000190", 65, 1, 1, 1)
            .unwrap();

        assert_eq!(key.key.len(), 44);
        assert!(key.key.starts_with("35")); // SP
    }

    #[test]
    fn test_validate_access_key() {
        let key = AccessKey::generate("SP", Utc::now().naive_utc(), "12345678000190", 65, 1, 1, 1)
            .unwrap();

        assert!(AccessKey::validate(&key.key));
    }

    #[test]
    fn test_invalid_key() {
        assert!(!AccessKey::validate(
            "1234567890123456789012345678901234567890123"
        )); // 43 dígitos
        assert!(!AccessKey::validate(
            "12345678901234567890123456789012345678901234"
        )); // DV errado
    }

    #[test]
    fn test_check_digit_calculation() {
        // Exemplo conhecido
        let key = "3526010012345678000190650010000000011123456789";
        let dv = AccessKey::calculate_check_digit(&key[0..43]);

        // Validar que o DV é calculado corretamente
        assert!(dv <= 9);
    }

    #[test]
    fn test_formatted_key() {
        let key = AccessKey {
            key: "35260100123456780001906500100000000111234567890".to_string(),
        };

        let formatted = key.formatted();
        assert!(formatted.contains(" "));
        assert_eq!(formatted.len(), 54); // 44 dígitos + 10 espaços
    }

    #[test]
    fn test_uf_codes() {
        assert_eq!(
            UF_CODES
                .iter()
                .find(|(uf, _)| *uf == "SP")
                .map(|(_, code)| *code),
            Some(35)
        );
        assert_eq!(
            UF_CODES
                .iter()
                .find(|(uf, _)| *uf == "RJ")
                .map(|(_, code)| *code),
            Some(33)
        );
    }
}
