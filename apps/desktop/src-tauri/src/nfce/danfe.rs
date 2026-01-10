// ════════════════════════════════════════════════════════════════════════════
// GERADOR DE DANFE NFC-e - Impressão Térmica ESC/POS
// ════════════════════════════════════════════════════════════════════════════
//! Geração de DANFE simplificado para impressoras térmicas 80mm

use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct DanfeData {
    // Emitente
    pub emitter_name: String,
    pub emitter_trade_name: Option<String>,
    pub emitter_cnpj: String,
    pub emitter_ie: String,
    pub emitter_address: String,
    pub emitter_city: String,
    pub emitter_uf: String,
    pub emitter_phone: Option<String>,

    // NFC-e
    pub number: u32,
    pub series: u16,
    pub emission_date: DateTime<Utc>,
    pub access_key: String,
    pub protocol: Option<String>,

    // Itens
    pub items: Vec<DanfeItem>,

    // Totais
    pub total: f64,
    pub discount: f64,
    pub total_items: f64,

    // Pagamento
    pub payment_method: String,
    pub payment_value: f64,

    // QR Code (imagem PNG em bytes)
    pub qrcode_png: Vec<u8>,

    // Informações adicionais
    pub additional_info: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DanfeItem {
    pub code: String,
    pub description: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_value: f64,
    pub total_value: f64,
}

pub struct DanfePrinter;

impl DanfePrinter {
    /// Gera comandos ESC/POS para impressão
    pub fn generate_escpos(data: &DanfeData) -> Result<Vec<u8>, String> {
        let mut commands = Vec::new();

        // Inicializar impressora
        commands.extend_from_slice(&Self::cmd_init());

        // Centralizar texto
        commands.extend_from_slice(&Self::cmd_align_center());

        // Cabeçalho - Nome do estabelecimento
        commands.extend_from_slice(&Self::cmd_bold_on());
        commands.extend_from_slice(&Self::cmd_double_height());
        commands.extend_from_slice(data.emitter_name.as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(&Self::cmd_normal_size());
        commands.extend_from_slice(&Self::cmd_bold_off());

        // Nome fantasia
        if let Some(trade_name) = &data.emitter_trade_name {
            commands.extend_from_slice(trade_name.as_bytes());
            commands.extend_from_slice(&Self::cmd_lf());
        }

        // CNPJ/IE
        commands.extend_from_slice(
            format!("CNPJ: {}", Self::format_cnpj(&data.emitter_cnpj)).as_bytes(),
        );
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(format!("IE: {}", data.emitter_ie).as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());

        // Endereço
        commands.extend_from_slice(&Self::cmd_font_small());
        commands.extend_from_slice(data.emitter_address.as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());
        commands
            .extend_from_slice(format!("{} - {}", data.emitter_city, data.emitter_uf).as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());
        if let Some(phone) = &data.emitter_phone {
            commands.extend_from_slice(format!("Tel: {}", phone).as_bytes());
            commands.extend_from_slice(&Self::cmd_lf());
        }
        commands.extend_from_slice(&Self::cmd_font_normal());

        // Linha separadora
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(b"------------------------------------------------");
        commands.extend_from_slice(&Self::cmd_lf());

        // Título DANFE NFC-e
        commands.extend_from_slice(&Self::cmd_bold_on());
        commands.extend_from_slice(b"DANFE NFC-e");
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(b"Documento Auxiliar da NF-e");
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(&Self::cmd_bold_off());

        // Número e série
        commands.extend_from_slice(format!("No. {} Serie {}", data.number, data.series).as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());

        // Data de emissão
        commands.extend_from_slice(
            format!(
                "Emissao: {}",
                data.emission_date.format("%d/%m/%Y %H:%M:%S")
            )
            .as_bytes(),
        );
        commands.extend_from_slice(&Self::cmd_lf());

        // Linha separadora
        commands.extend_from_slice(b"------------------------------------------------");
        commands.extend_from_slice(&Self::cmd_lf());

        // Itens
        commands.extend_from_slice(&Self::cmd_align_left());
        commands.extend_from_slice(&Self::cmd_font_small());

        for item in &data.items {
            // Código e descrição
            commands.extend_from_slice(format!("#{} {}", item.code, item.description).as_bytes());
            commands.extend_from_slice(&Self::cmd_lf());

            // Quantidade, valor unitário e total
            commands.extend_from_slice(
                format!(
                    "{:.3} {} x {:.2} = {:.2}",
                    item.quantity, item.unit, item.unit_value, item.total_value
                )
                .as_bytes(),
            );
            commands.extend_from_slice(&Self::cmd_lf());
        }

        commands.extend_from_slice(&Self::cmd_font_normal());

        // Linha separadora
        commands.extend_from_slice(b"------------------------------------------------");
        commands.extend_from_slice(&Self::cmd_lf());

        // Totais
        commands.extend_from_slice(&Self::cmd_align_right());
        commands.extend_from_slice(format!("Total de Itens: {:.2}", data.total_items).as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());

        if data.discount > 0.0 {
            commands.extend_from_slice(format!("Desconto: -{:.2}", data.discount).as_bytes());
            commands.extend_from_slice(&Self::cmd_lf());
        }

        commands.extend_from_slice(&Self::cmd_bold_on());
        commands.extend_from_slice(&Self::cmd_double_height());
        commands.extend_from_slice(format!("TOTAL R$ {:.2}", data.total).as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(&Self::cmd_normal_size());
        commands.extend_from_slice(&Self::cmd_bold_off());

        // Forma de pagamento
        commands.extend_from_slice(&Self::cmd_align_left());
        commands.extend_from_slice(
            format!(
                "Pagamento: {} - R$ {:.2}",
                Self::format_payment_method(&data.payment_method),
                data.payment_value
            )
            .as_bytes(),
        );
        commands.extend_from_slice(&Self::cmd_lf());

        // Linha separadora
        commands.extend_from_slice(b"------------------------------------------------");
        commands.extend_from_slice(&Self::cmd_lf());

        // QR Code
        commands.extend_from_slice(&Self::cmd_align_center());
        commands.extend_from_slice(b"Consulte pela Chave de Acesso:");
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(&Self::cmd_font_small());
        commands.extend_from_slice(Self::format_access_key(&data.access_key).as_bytes());
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(&Self::cmd_font_normal());

        // Imprimir QR Code (se suportado)
        if !data.qrcode_png.is_empty() {
            commands.extend_from_slice(&Self::cmd_lf());
            // TODO: Implementar impressão de imagem PNG
            // Por ora, apenas inserir espaço
            commands.extend_from_slice(&Self::cmd_lf());
            commands.extend_from_slice(&Self::cmd_lf());
        }

        // Protocolo de autorização
        if let Some(protocol) = &data.protocol {
            commands.extend_from_slice(b"Protocolo de Autorizacao:");
            commands.extend_from_slice(&Self::cmd_lf());
            commands.extend_from_slice(protocol.as_bytes());
            commands.extend_from_slice(&Self::cmd_lf());
        }

        // Informações adicionais
        if let Some(info) = &data.additional_info {
            commands.extend_from_slice(&Self::cmd_lf());
            commands.extend_from_slice(&Self::cmd_font_small());
            commands.extend_from_slice(info.as_bytes());
            commands.extend_from_slice(&Self::cmd_lf());
            commands.extend_from_slice(&Self::cmd_font_normal());
        }

        // Rodapé
        commands.extend_from_slice(&Self::cmd_lf());
        commands.extend_from_slice(b"Emitido via Sistema GIRO");
        commands.extend_from_slice(&Self::cmd_lf());

        // Cortar papel
        commands.extend_from_slice(&Self::cmd_cut());

        Ok(commands)
    }

    // ========================================
    // COMANDOS ESC/POS
    // ========================================

    fn cmd_init() -> Vec<u8> {
        vec![0x1B, 0x40] // ESC @
    }

    fn cmd_align_center() -> Vec<u8> {
        vec![0x1B, 0x61, 0x01] // ESC a 1
    }

    fn cmd_align_left() -> Vec<u8> {
        vec![0x1B, 0x61, 0x00] // ESC a 0
    }

    fn cmd_align_right() -> Vec<u8> {
        vec![0x1B, 0x61, 0x02] // ESC a 2
    }

    fn cmd_bold_on() -> Vec<u8> {
        vec![0x1B, 0x45, 0x01] // ESC E 1
    }

    fn cmd_bold_off() -> Vec<u8> {
        vec![0x1B, 0x45, 0x00] // ESC E 0
    }

    fn cmd_double_height() -> Vec<u8> {
        vec![0x1B, 0x21, 0x10] // ESC ! 16
    }

    fn cmd_normal_size() -> Vec<u8> {
        vec![0x1B, 0x21, 0x00] // ESC ! 0
    }

    fn cmd_font_small() -> Vec<u8> {
        vec![0x1B, 0x21, 0x01] // ESC ! 1
    }

    fn cmd_font_normal() -> Vec<u8> {
        vec![0x1B, 0x21, 0x00] // ESC ! 0
    }

    fn cmd_lf() -> Vec<u8> {
        vec![0x0A] // LF
    }

    fn cmd_cut() -> Vec<u8> {
        vec![0x1D, 0x56, 0x41, 0x03] // GS V A 3
    }

    // ========================================
    // FORMATADORES
    // ========================================

    fn format_cnpj(cnpj: &str) -> String {
        if cnpj.len() == 14 {
            format!(
                "{}.{}.{}/{}-{}",
                &cnpj[0..2],
                &cnpj[2..5],
                &cnpj[5..8],
                &cnpj[8..12],
                &cnpj[12..14]
            )
        } else {
            cnpj.to_string()
        }
    }

    fn format_access_key(key: &str) -> String {
        // Formatar em grupos de 4 dígitos
        if key.len() == 44 {
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
                &key[40..44]
            )
        } else {
            key.to_string()
        }
    }

    fn format_payment_method(method: &str) -> &str {
        match method {
            "01" => "Dinheiro",
            "02" => "Cheque",
            "03" => "Cartao de Credito",
            "04" => "Cartao de Debito",
            "05" => "Credito Loja",
            "10" => "Vale Alimentacao",
            "11" => "Vale Refeicao",
            "12" => "Vale Presente",
            "13" => "Vale Combustivel",
            "15" => "Boleto Bancario",
            "90" => "Sem Pagamento",
            "99" => "Outros",
            _ => "Nao Identificado",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_data() -> DanfeData {
        DanfeData {
            emitter_name: "EMPRESA TESTE LTDA".to_string(),
            emitter_trade_name: Some("TESTE".to_string()),
            emitter_cnpj: "12345678000190".to_string(),
            emitter_ie: "123456789".to_string(),
            emitter_address: "RUA TESTE, 123".to_string(),
            emitter_city: "SAO PAULO".to_string(),
            emitter_uf: "SP".to_string(),
            emitter_phone: Some("(11) 1234-5678".to_string()),
            number: 1,
            series: 1,
            emission_date: Utc::now(),
            access_key: "35260100123456780001906500100000000111234567890".to_string(),
            protocol: Some("123456789012345".to_string()),
            items: vec![DanfeItem {
                code: "001".to_string(),
                description: "PRODUTO TESTE".to_string(),
                quantity: 1.0,
                unit: "UN".to_string(),
                unit_value: 10.0,
                total_value: 10.0,
            }],
            total: 10.0,
            discount: 0.0,
            total_items: 10.0,
            payment_method: "01".to_string(),
            payment_value: 10.0,
            qrcode_png: vec![],
            additional_info: Some("Nota gerada para teste".to_string()),
        }
    }

    #[test]
    fn test_generate_escpos() {
        let data = create_test_data();
        let commands = DanfePrinter::generate_escpos(&data).unwrap();

        // Verificar comandos básicos
        assert!(!commands.is_empty());
        assert!(commands.starts_with(&[0x1B, 0x40])); // ESC @
    }

    #[test]
    fn test_format_cnpj() {
        let cnpj = "12345678000190";
        let formatted = DanfePrinter::format_cnpj(cnpj);

        assert_eq!(formatted, "12.345.678/0001-90");
    }

    #[test]
    fn test_format_access_key() {
        // Chave de acesso NFC-e tem 44 dígitos.
        let key = "12345678901234567890123456789012345678901234";
        let formatted = DanfePrinter::format_access_key(key);

        assert!(formatted.contains(' '));
        assert_eq!(formatted.split_whitespace().count(), 11);
    }

    #[test]
    fn test_format_payment_method() {
        assert_eq!(DanfePrinter::format_payment_method("01"), "Dinheiro");
        assert_eq!(
            DanfePrinter::format_payment_method("03"),
            "Cartao de Credito"
        );
        assert_eq!(DanfePrinter::format_payment_method("99"), "Outros");
    }

    #[test]
    fn test_cmd_init() {
        let cmd = DanfePrinter::cmd_init();
        assert_eq!(cmd, vec![0x1B, 0x40]);
    }

    #[test]
    fn test_cmd_align_center() {
        let cmd = DanfePrinter::cmd_align_center();
        assert_eq!(cmd, vec![0x1B, 0x61, 0x01]);
    }

    #[test]
    fn test_cmd_bold_on() {
        let cmd = DanfePrinter::cmd_bold_on();
        assert_eq!(cmd, vec![0x1B, 0x45, 0x01]);
    }

    #[test]
    fn test_cmd_cut() {
        let cmd = DanfePrinter::cmd_cut();
        assert_eq!(cmd, vec![0x1D, 0x56, 0x41, 0x03]);
    }
}
