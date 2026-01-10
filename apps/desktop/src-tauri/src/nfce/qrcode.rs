// ════════════════════════════════════════════════════════════════════════════
// GERADOR DE QR CODE NFC-e
// ════════════════════════════════════════════════════════════════════════════
//! Geração de QR Code conforme NT 2019.001

use qrcode::render::svg;
use qrcode::QrCode;
use sha1::{Digest, Sha1};

/// Parâmetros para geração do QR Code
#[derive(Debug, Clone)]
pub struct QrCodeParams {
    pub access_key: String,
    pub uf: String,
    pub environment: u8,       // 1=Produção, 2=Homologação
    pub emission_date: String, // formato: YYYY-MM-DDTHH:MM:SS
    pub total_value: f64,
    pub digest_value: String, // SHA1 do XML em base64
    pub csc_id: String,
    pub csc: String,
}

pub struct QrCodeGenerator;

impl QrCodeGenerator {
    /// Gera URL do QR Code
    pub fn generate_url(params: &QrCodeParams) -> Result<String, String> {
        // URL base por UF e ambiente
        let base_url = Self::get_base_url(&params.uf, params.environment)?;

        // Montar parâmetros
        let url_params = format!(
            "chNFe={}&nVersao=100&tpAmb={}&cDest=&dhEmi={}&vNF={:.2}&vICMS=0.00&digVal={}&cIdToken={}&cHashQRCode={}",
            params.access_key,
            params.environment,
            Self::encode_date(&params.emission_date)?,
            params.total_value,
            Self::url_encode(&params.digest_value),
            params.csc_id,
            Self::generate_hash(params)?
        );

        Ok(format!("{}?{}", base_url, url_params))
    }

    /// Gera QR Code em formato SVG
    pub fn generate_svg(params: &QrCodeParams) -> Result<String, String> {
        let url = Self::generate_url(params)?;

        let code =
            QrCode::new(url.as_bytes()).map_err(|e| format!("Erro ao gerar QR Code: {}", e))?;

        let svg = code
            .render()
            .min_dimensions(200, 200)
            .dark_color(svg::Color("#000000"))
            .light_color(svg::Color("#ffffff"))
            .build();

        Ok(svg)
    }

    /// Gera QR Code em formato PNG
    pub fn generate_png(params: &QrCodeParams) -> Result<Vec<u8>, String> {
        let url = Self::generate_url(params)?;

        let code =
            QrCode::new(url.as_bytes()).map_err(|e| format!("Erro ao gerar QR Code: {}", e))?;

        // Renderizar como imagem
        let image = code
            .render::<image::Luma<u8>>()
            .min_dimensions(200, 200)
            .build();

        // Converter para PNG
        let mut buffer = std::io::Cursor::new(Vec::new());
        image
            .write_to(&mut buffer, image::ImageFormat::Png)
            .map_err(|e| format!("Erro ao gerar PNG: {}", e))?;

        Ok(buffer.into_inner())
    }

    fn get_base_url(uf: &str, environment: u8) -> Result<String, String> {
        // URLs por UF conforme NT 2019.001
        let url = match (uf, environment) {
            // Produção
            ("SP", 1) => "https://nfe.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
            ("RJ", 1) => "http://www4.fazenda.rj.gov.br/consultaNFCe/QRCode",
            ("MG", 1) => "http://nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml",
            ("RS", 1) => "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx",

            // Homologação
            ("SP", 2) => "https://homologacao.nfe.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
            ("RJ", 2) => "http://www4.fazenda.rj.gov.br/consultaNFCe/QRCode",
            ("MG", 2) => "http://nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml",
            ("RS", 2) => "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx",

            _ => return Err(format!("UF {} não suportada", uf)),
        };

        Ok(url.to_string())
    }

    fn encode_date(date: &str) -> Result<String, String> {
        // Converter formato ISO para formato esperado (URL encoded)
        // YYYY-MM-DDTHH:MM:SS -> YYYY-MM-DDTHH%3AMM%3ASS
        Ok(date.replace(':', "%3A"))
    }

    fn url_encode(value: &str) -> String {
        value
            .replace('+', "%2B")
            .replace('/', "%2F")
            .replace('=', "%3D")
    }

    fn generate_hash(params: &QrCodeParams) -> Result<String, String> {
        // Hash = SHA1(chNFe|cIdToken|CSC)
        let data = format!("{}|{}|{}", params.access_key, params.csc_id, params.csc);

        let mut hasher = Sha1::new();
        hasher.update(data.as_bytes());
        let hash = hasher.finalize();

        // Converter para hexadecimal
        Ok(hex::encode(hash).to_uppercase())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_params() -> QrCodeParams {
        QrCodeParams {
            access_key: "35260100123456780001906500100000000111234567890".to_string(),
            uf: "SP".to_string(),
            environment: 2,
            emission_date: "2026-01-02T10:30:00".to_string(),
            total_value: 100.50,
            digest_value: "ABC123==".to_string(),
            csc_id: "1".to_string(),
            csc: "123456".to_string(),
        }
    }

    #[test]
    fn test_generate_url() {
        let params = create_test_params();
        let url = QrCodeGenerator::generate_url(&params).unwrap();

        assert!(url.contains("chNFe=35260100123456780001906500100000000111234567890"));
        assert!(url.contains("tpAmb=2"));
        assert!(url.contains("vNF=100.50"));
        assert!(url.contains("cIdToken=1"));
        assert!(url.contains("cHashQRCode="));
    }

    #[test]
    fn test_generate_hash() {
        let params = create_test_params();
        let hash = QrCodeGenerator::generate_hash(&params).unwrap();

        // Hash deve ser hexadecimal de 40 caracteres (SHA1)
        assert_eq!(hash.len(), 40);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_encode_date() {
        let date = "2026-01-02T10:30:00";
        let encoded = QrCodeGenerator::encode_date(date).unwrap();

        assert_eq!(encoded, "2026-01-02T10%3A30%3A00");
    }

    #[test]
    fn test_url_encode() {
        let value = "ABC+/=";
        let encoded = QrCodeGenerator::url_encode(value);

        assert_eq!(encoded, "ABC%2B%2F%3D");
    }

    #[test]
    fn test_generate_svg() {
        let params = create_test_params();
        let svg = QrCodeGenerator::generate_svg(&params).unwrap();

        assert!(svg.contains("<svg"));
        assert!(svg.contains("</svg>"));
        assert!(svg.contains("200"));
    }

    #[test]
    fn test_generate_png() {
        let params = create_test_params();
        let png = QrCodeGenerator::generate_png(&params).unwrap();

        // PNG deve começar com assinatura PNG
        assert_eq!(&png[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]);
    }

    #[test]
    fn test_get_base_url_sp_production() {
        let url = QrCodeGenerator::get_base_url("SP", 1).unwrap();
        assert!(url.contains("nfe.fazenda.sp.gov.br"));
    }

    #[test]
    fn test_get_base_url_sp_homologation() {
        let url = QrCodeGenerator::get_base_url("SP", 2).unwrap();
        assert!(url.contains("homologacao"));
    }
}
