// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICADO DIGITAL A1
// ═══════════════════════════════════════════════════════════════════════════
//! Gerenciamento de certificados digitais para assinatura de NFC-e.
//!
//! ## Formato
//! - Certificado A1 no formato PKCS#12 (.pfx ou .p12)
//! - Validade: 1 ano
//! - Emitido por Autoridade Certificadora credenciada (ICP-Brasil)
//!
//! ## Armazenamento
//! - Arquivo .pfx criptografado
//! - Senha armazenada de forma segura (hash)
//! - Backup automático

use openssl::pkcs12::Pkcs12;
use openssl::pkey::PKey;
use openssl::x509::X509;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct Certificate {
    /// Certificado X.509
    pub x509: X509,
    /// Chave privada
    pub private_key: PKey<openssl::pkey::Private>,
    /// CNPJ do titular
    pub cnpj: String,
    /// Data de validade
    pub valid_until: chrono::NaiveDateTime,
}

impl Certificate {
    /// Carrega certificado de arquivo .pfx
    ///
    /// # Argumentos
    /// - `pfx_path`: Caminho para arquivo .pfx
    /// - `password`: Senha do certificado
    ///
    /// # Exemplo
    /// ```no_run
    /// use giro_lib::nfce::Certificate;
    ///
    /// # fn main() -> Result<(), String> {
    /// let cert = Certificate::from_pfx("cert.pfx", "senha123")?;
    /// println!("CNPJ: {}", cert.cnpj);
    /// # Ok(())
    /// # }
    /// ```
    pub fn from_pfx<P: AsRef<Path>>(pfx_path: P, password: &str) -> Result<Self, String> {
        // Ler arquivo .pfx
        let pfx_data = fs::read(pfx_path).map_err(|e| format!("Erro ao ler .pfx: {}", e))?;

        // Parsear PKCS#12
        let pkcs12 =
            Pkcs12::from_der(&pfx_data).map_err(|e| format!("Arquivo .pfx inválido: {}", e))?;

        // Extrair certificado e chave privada
        let parsed = pkcs12
            .parse2(password)
            .map_err(|e| format!("Senha incorreta ou certificado inválido: {}", e))?;

        let x509 = parsed
            .cert
            .ok_or_else(|| "Certificado não encontrado no .pfx".to_string())?;

        let private_key = parsed
            .pkey
            .ok_or_else(|| "Chave privada não encontrada no .pfx".to_string())?;

        // Extrair CNPJ do subject
        let cnpj = Self::extract_cnpj(&x509)?;

        // Extrair data de validade
        let valid_until = Self::extract_validity(&x509)?;

        Ok(Self {
            x509,
            private_key,
            cnpj,
            valid_until,
        })
    }

    /// Valida se o certificado ainda está válido
    pub fn is_valid(&self) -> bool {
        let now = chrono::Utc::now().naive_utc();
        self.valid_until > now
    }

    /// Retorna dias restantes até expiração
    pub fn days_until_expiration(&self) -> i64 {
        let now = chrono::Utc::now().naive_utc();
        (self.valid_until - now).num_days()
    }

    /// Extrai CNPJ do subject do certificado
    fn extract_cnpj(x509: &X509) -> Result<String, String> {
        let subject = x509.subject_name();

        // CNPJ geralmente está no CN (Common Name) ou no serialNumber
        for entry in subject.entries() {
            let data = entry.data().as_utf8().map_err(|e| e.to_string())?;
            let text = data.to_string();

            // Procurar por padrão de CNPJ (14 dígitos)
            if let Some(cnpj) = Self::extract_cnpj_from_text(&text) {
                return Ok(cnpj);
            }
        }

        Err("CNPJ não encontrado no certificado".to_string())
    }

    /// Extrai CNPJ de texto (formato: 12.345.678/0001-90)
    fn extract_cnpj_from_text(text: &str) -> Option<String> {
        // Remove pontuação e extrai apenas números
        let numbers: String = text.chars().filter(|c| c.is_ascii_digit()).collect();

        // CNPJ tem 14 dígitos
        if numbers.len() == 14 {
            Some(numbers)
        } else {
            None
        }
    }

    /// Extrai data de validade do certificado
    fn extract_validity(x509: &X509) -> Result<chrono::NaiveDateTime, String> {
        let not_after = x509.not_after();

        // Converter ASN1Time para NaiveDateTime
        let time_str = not_after.to_string();

        // Parsear formato: "Jan  1 00:00:00 2027 GMT"
        chrono::NaiveDateTime::parse_from_str(&time_str, "%b %d %H:%M:%S %Y GMT")
            .map_err(|e| format!("Erro ao parsear data de validade: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use openssl::asn1::Asn1Time;
    use openssl::bn::BigNum;
    use openssl::hash::MessageDigest;
    use openssl::rsa::Rsa;
    use openssl::x509::{X509Builder, X509NameBuilder};

    #[test]
    fn test_extract_cnpj_from_text() {
        assert_eq!(
            Certificate::extract_cnpj_from_text("12.345.678/0001-90"),
            Some("12345678000190".to_string())
        );

        assert_eq!(
            Certificate::extract_cnpj_from_text("EMPRESA LTDA:12345678000190"),
            Some("12345678000190".to_string())
        );

        assert_eq!(Certificate::extract_cnpj_from_text("123456"), None);
    }

    #[test]
    fn test_days_until_expiration() {
        // Gerar um X509 válido (mock) para construir a struct.
        let rsa = Rsa::generate(2048).unwrap();
        let pkey = PKey::from_rsa(rsa).unwrap();

        let mut name_builder = X509NameBuilder::new().unwrap();
        name_builder
            .append_entry_by_text("CN", "TEST CERT")
            .unwrap();
        let name = name_builder.build();

        let mut builder = X509Builder::new().unwrap();
        builder.set_version(2).unwrap();
        let serial = BigNum::from_u32(1).unwrap().to_asn1_integer().unwrap();
        builder.set_serial_number(&serial).unwrap();
        builder.set_subject_name(&name).unwrap();
        builder.set_issuer_name(&name).unwrap();
        builder.set_pubkey(&pkey).unwrap();
        builder
            .set_not_before(&Asn1Time::days_from_now(0).unwrap())
            .unwrap();
        builder
            .set_not_after(&Asn1Time::days_from_now(365).unwrap())
            .unwrap();
        builder.sign(&pkey, MessageDigest::sha256()).unwrap();
        let x509 = builder.build();

        let cert = Certificate {
            x509,
            private_key: pkey,
            cnpj: "12345678000190".to_string(),
            valid_until: chrono::Utc::now().naive_utc() + chrono::Duration::days(30),
        };

        assert!(cert.days_until_expiration() >= 29);
        assert!(cert.days_until_expiration() <= 31);
    }
}
