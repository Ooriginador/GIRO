// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUTOR DE XML NFC-e
// ═══════════════════════════════════════════════════════════════════════════
//! Geração de XML conforme layout SEFAZ 4.00 (NT 2019.001)

use chrono::{DateTime, Utc};
use quick_xml::events::{BytesDecl, BytesEnd, BytesStart, BytesText, Event};
use quick_xml::Writer;
use std::io::Cursor;

#[derive(Debug, Clone)]
pub struct NfceData {
    // Identificação
    pub uf: String,
    pub cnpj: String,
    pub serie: u16,
    pub numero: u32,
    pub emission_date: DateTime<Utc>,
    pub emission_type: u8, // 1=Normal, 9=Contingência

    // Emitente
    pub emitter_name: String,
    pub emitter_trade_name: Option<String>,
    pub emitter_ie: String,
    pub emitter_address: String,
    pub emitter_city: String,
    pub emitter_city_code: String,
    pub emitter_state: String,
    pub emitter_cep: String,

    // Destinatário (opcional para NFC-e)
    pub recipient_cpf: Option<String>,
    pub recipient_name: Option<String>,

    // Itens
    pub items: Vec<NfceItem>,

    // Totais
    pub total_products: f64,
    pub total_discount: f64,
    pub total_note: f64,

    // Pagamento
    pub payment_method: String, // 01=Dinheiro, 03=Cartão Crédito, etc
    pub payment_value: f64,

    // CSC (Código de Segurança do Contribuinte)
    pub csc_id: String,
    pub csc: String,
}

#[derive(Debug, Clone)]
pub struct NfceItem {
    pub number: u16,
    pub code: String,
    pub ean: Option<String>,
    pub description: String,
    pub ncm: String,
    pub cfop: String,
    pub unit: String,
    pub quantity: f64,
    pub unit_value: f64,
    pub total_value: f64,

    // ICMS
    pub icms_origin: u8,
    pub icms_cst: String,

    // PIS/COFINS
    pub pis_cst: String,
    pub cofins_cst: String,
}

pub struct NfceXmlBuilder {
    data: NfceData,
    access_key: String,
}

impl NfceXmlBuilder {
    pub fn new(data: NfceData, access_key: String) -> Self {
        Self { data, access_key }
    }

    /// Gera XML completo da NFC-e
    pub fn build(&self) -> Result<String, String> {
        let mut writer = Writer::new_with_indent(Cursor::new(Vec::new()), b' ', 2);

        // XML Declaration
        writer
            .write_event(Event::Decl(BytesDecl::new("1.0", Some("UTF-8"), None)))
            .map_err(|e| e.to_string())?;

        // <NFe>
        let mut nfe_elem = BytesStart::new("NFe");
        nfe_elem.push_attribute(("xmlns", "http://www.portalfiscal.inf.br/nfe"));
        writer
            .write_event(Event::Start(nfe_elem))
            .map_err(|e| e.to_string())?;

        // <infNFe>
        self.write_inf_nfe(&mut writer)?;

        // </NFe>
        writer
            .write_event(Event::End(BytesEnd::new("NFe")))
            .map_err(|e| e.to_string())?;

        let result = writer.into_inner().into_inner();
        String::from_utf8(result).map_err(|e| e.to_string())
    }

    fn write_inf_nfe<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        let mut inf_nfe = BytesStart::new("infNFe");
        inf_nfe.push_attribute(("versao", "4.00"));
        let id_value = format!("NFe{}", self.access_key);
        inf_nfe.push_attribute(("Id", id_value.as_str()));
        writer
            .write_event(Event::Start(inf_nfe))
            .map_err(|e| e.to_string())?;

        // <ide> - Identificação
        self.write_ide(writer)?;

        // <emit> - Emitente
        self.write_emit(writer)?;

        // <dest> - Destinatário (se houver)
        if self.data.recipient_cpf.is_some() {
            self.write_dest(writer)?;
        }

        // <det> - Detalhamento (itens)
        for (idx, item) in self.data.items.iter().enumerate() {
            self.write_det(writer, item, idx + 1)?;
        }

        // <total> - Totais
        self.write_total(writer)?;

        // <transp> - Transporte
        self.write_transp(writer)?;

        // <pag> - Pagamento
        self.write_pag(writer)?;

        // <infAdic> - Informações Adicionais
        self.write_inf_adic(writer)?;

        writer
            .write_event(Event::End(BytesEnd::new("infNFe")))
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn write_ide<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new("ide")))
            .map_err(|e| e.to_string())?;

        self.write_element(writer, "cUF", &self.get_uf_code())?;
        self.write_element(
            writer,
            "cNF",
            &format!("{:08}", rand::random::<u32>() % 100000000),
        )?;
        self.write_element(writer, "natOp", "VENDA")?;
        self.write_element(writer, "mod", "65")?; // 65 = NFC-e
        self.write_element(writer, "serie", &self.data.serie.to_string())?;
        self.write_element(writer, "nNF", &self.data.numero.to_string())?;
        self.write_element(writer, "dhEmi", &self.data.emission_date.to_rfc3339())?;
        self.write_element(writer, "tpNF", "1")?; // 1 = Saída
        self.write_element(writer, "idDest", "1")?; // 1 = Operação interna
        self.write_element(writer, "cMunFG", &self.data.emitter_city_code)?;
        self.write_element(writer, "tpImp", "4")?; // 4 = DANFE NFC-e
        self.write_element(writer, "tpEmis", &self.data.emission_type.to_string())?;
        self.write_element(
            writer,
            "cDV",
            &self.access_key.chars().last().unwrap().to_string(),
        )?;
        self.write_element(writer, "tpAmb", "2")?; // 2 = Homologação (trocar para 1 em produção)
        self.write_element(writer, "finNFe", "1")?; // 1 = NF-e normal
        self.write_element(writer, "indFinal", "1")?; // 1 = Consumidor final
        self.write_element(writer, "indPres", "1")?; // 1 = Operação presencial
        self.write_element(writer, "procEmi", "0")?; // 0 = Emissão com aplicativo próprio
        self.write_element(writer, "verProc", "1.0.0")?;

        writer
            .write_event(Event::End(BytesEnd::new("ide")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_emit<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new("emit")))
            .map_err(|e| e.to_string())?;

        self.write_element(writer, "CNPJ", &self.data.cnpj)?;
        self.write_element(writer, "xNome", &self.data.emitter_name)?;
        if let Some(trade_name) = &self.data.emitter_trade_name {
            self.write_element(writer, "xFant", trade_name)?;
        }

        // Endereço
        writer
            .write_event(Event::Start(BytesStart::new("enderEmit")))
            .map_err(|e| e.to_string())?;
        self.write_element(writer, "xLgr", &self.data.emitter_address)?;
        self.write_element(writer, "nro", "SN")?;
        self.write_element(writer, "xMun", &self.data.emitter_city)?;
        self.write_element(writer, "CEP", &self.data.emitter_cep)?;
        self.write_element(writer, "cMun", &self.data.emitter_city_code)?;
        self.write_element(writer, "UF", &self.data.uf)?;
        writer
            .write_event(Event::End(BytesEnd::new("enderEmit")))
            .map_err(|e| e.to_string())?;

        self.write_element(writer, "IE", &self.data.emitter_ie)?;
        self.write_element(writer, "CRT", "1")?; // 1 = Simples Nacional

        writer
            .write_event(Event::End(BytesEnd::new("emit")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_dest<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        if let (Some(cpf), Some(name)) = (&self.data.recipient_cpf, &self.data.recipient_name) {
            writer
                .write_event(Event::Start(BytesStart::new("dest")))
                .map_err(|e| e.to_string())?;
            self.write_element(writer, "CPF", cpf)?;
            self.write_element(writer, "xNome", name)?;
            self.write_element(writer, "indIEDest", "9")?; // 9 = Não contribuinte
            writer
                .write_event(Event::End(BytesEnd::new("dest")))
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn write_det<W: std::io::Write>(
        &self,
        writer: &mut Writer<W>,
        item: &NfceItem,
        num: usize,
    ) -> Result<(), String> {
        let mut det = BytesStart::new("det");
        det.push_attribute(("nItem", num.to_string().as_str()));
        writer
            .write_event(Event::Start(det))
            .map_err(|e| e.to_string())?;

        // <prod>
        writer
            .write_event(Event::Start(BytesStart::new("prod")))
            .map_err(|e| e.to_string())?;
        self.write_element(writer, "cProd", &item.code)?;
        if let Some(ean) = &item.ean {
            self.write_element(writer, "cEAN", ean)?;
        } else {
            self.write_element(writer, "cEAN", "SEM GTIN")?;
        }
        self.write_element(writer, "xProd", &item.description)?;
        self.write_element(writer, "NCM", &item.ncm)?;
        self.write_element(writer, "CFOP", &item.cfop)?;
        self.write_element(writer, "uCom", &item.unit)?;
        self.write_element(writer, "qCom", &format!("{:.4}", item.quantity))?;
        self.write_element(writer, "vUnCom", &format!("{:.2}", item.unit_value))?;
        self.write_element(writer, "vProd", &format!("{:.2}", item.total_value))?;
        if let Some(ean) = &item.ean {
            self.write_element(writer, "cEANTrib", ean)?;
        } else {
            self.write_element(writer, "cEANTrib", "SEM GTIN")?;
        }
        self.write_element(writer, "uTrib", &item.unit)?;
        self.write_element(writer, "qTrib", &format!("{:.4}", item.quantity))?;
        self.write_element(writer, "vUnTrib", &format!("{:.2}", item.unit_value))?;
        self.write_element(writer, "indTot", "1")?; // 1 = Compõe total
        writer
            .write_event(Event::End(BytesEnd::new("prod")))
            .map_err(|e| e.to_string())?;

        // <imposto>
        self.write_imposto(writer, item)?;

        writer
            .write_event(Event::End(BytesEnd::new("det")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_imposto<W: std::io::Write>(
        &self,
        writer: &mut Writer<W>,
        item: &NfceItem,
    ) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new("imposto")))
            .map_err(|e| e.to_string())?;

        // ICMS
        writer
            .write_event(Event::Start(BytesStart::new("ICMS")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::Start(BytesStart::new("ICMSSN102")))
            .map_err(|e| e.to_string())?;
        self.write_element(writer, "orig", &item.icms_origin.to_string())?;
        self.write_element(writer, "CSOSN", &item.icms_cst)?;
        writer
            .write_event(Event::End(BytesEnd::new("ICMSSN102")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::End(BytesEnd::new("ICMS")))
            .map_err(|e| e.to_string())?;

        // PIS
        writer
            .write_event(Event::Start(BytesStart::new("PIS")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::Start(BytesStart::new("PISNT")))
            .map_err(|e| e.to_string())?;
        self.write_element(writer, "CST", &item.pis_cst)?;
        writer
            .write_event(Event::End(BytesEnd::new("PISNT")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::End(BytesEnd::new("PIS")))
            .map_err(|e| e.to_string())?;

        // COFINS
        writer
            .write_event(Event::Start(BytesStart::new("COFINS")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::Start(BytesStart::new("COFINSNT")))
            .map_err(|e| e.to_string())?;
        self.write_element(writer, "CST", &item.cofins_cst)?;
        writer
            .write_event(Event::End(BytesEnd::new("COFINSNT")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::End(BytesEnd::new("COFINS")))
            .map_err(|e| e.to_string())?;

        writer
            .write_event(Event::End(BytesEnd::new("imposto")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_total<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new("total")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::Start(BytesStart::new("ICMSTot")))
            .map_err(|e| e.to_string())?;

        self.write_element(writer, "vBC", "0.00")?;
        self.write_element(writer, "vICMS", "0.00")?;
        self.write_element(writer, "vICMSDeson", "0.00")?;
        self.write_element(writer, "vFCP", "0.00")?;
        self.write_element(writer, "vBCST", "0.00")?;
        self.write_element(writer, "vST", "0.00")?;
        self.write_element(writer, "vFCPST", "0.00")?;
        self.write_element(writer, "vFCPSTRet", "0.00")?;
        self.write_element(writer, "vProd", &format!("{:.2}", self.data.total_products))?;
        self.write_element(writer, "vFrete", "0.00")?;
        self.write_element(writer, "vSeg", "0.00")?;
        self.write_element(writer, "vDesc", &format!("{:.2}", self.data.total_discount))?;
        self.write_element(writer, "vII", "0.00")?;
        self.write_element(writer, "vIPI", "0.00")?;
        self.write_element(writer, "vIPIDevol", "0.00")?;
        self.write_element(writer, "vPIS", "0.00")?;
        self.write_element(writer, "vCOFINS", "0.00")?;
        self.write_element(writer, "vOutro", "0.00")?;
        self.write_element(writer, "vNF", &format!("{:.2}", self.data.total_note))?;

        writer
            .write_event(Event::End(BytesEnd::new("ICMSTot")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::End(BytesEnd::new("total")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_transp<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new("transp")))
            .map_err(|e| e.to_string())?;
        self.write_element(writer, "modFrete", "9")?; // 9 = Sem frete
        writer
            .write_event(Event::End(BytesEnd::new("transp")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_pag<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new("pag")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::Start(BytesStart::new("detPag")))
            .map_err(|e| e.to_string())?;

        self.write_element(writer, "tPag", &self.data.payment_method)?;
        self.write_element(writer, "vPag", &format!("{:.2}", self.data.payment_value))?;

        writer
            .write_event(Event::End(BytesEnd::new("detPag")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::End(BytesEnd::new("pag")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_inf_adic<W: std::io::Write>(&self, writer: &mut Writer<W>) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new("infAdic")))
            .map_err(|e| e.to_string())?;
        self.write_element(writer, "infCpl", "Nota Fiscal gerada pelo Sistema GIRO")?;
        writer
            .write_event(Event::End(BytesEnd::new("infAdic")))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_element<W: std::io::Write>(
        &self,
        writer: &mut Writer<W>,
        name: &str,
        value: &str,
    ) -> Result<(), String> {
        writer
            .write_event(Event::Start(BytesStart::new(name)))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::Text(BytesText::new(value)))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::End(BytesEnd::new(name)))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn get_uf_code(&self) -> String {
        use crate::nfce::access_key::UF_CODES;
        UF_CODES
            .iter()
            .find(|(uf, _)| *uf == self.data.uf)
            .map(|(_, code)| code.to_string())
            .unwrap_or_else(|| "35".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_data() -> NfceData {
        NfceData {
            uf: "SP".to_string(),
            cnpj: "12345678000190".to_string(),
            serie: 1,
            numero: 1,
            emission_date: Utc::now(),
            emission_type: 1,
            emitter_name: "EMPRESA TESTE LTDA".to_string(),
            emitter_trade_name: Some("TESTE".to_string()),
            emitter_ie: "123456789".to_string(),
            emitter_address: "RUA TESTE, 123".to_string(),
            emitter_city: "SAO PAULO".to_string(),
            emitter_city_code: "3550308".to_string(),
            emitter_state: "SP".to_string(),
            emitter_cep: "01234567".to_string(),
            recipient_cpf: None,
            recipient_name: None,
            items: vec![NfceItem {
                number: 1,
                code: "001".to_string(),
                ean: Some("7891234567890".to_string()),
                description: "PRODUTO TESTE".to_string(),
                ncm: "12345678".to_string(),
                cfop: "5102".to_string(),
                unit: "UN".to_string(),
                quantity: 1.0,
                unit_value: 10.0,
                total_value: 10.0,
                icms_origin: 0,
                icms_cst: "102".to_string(),
                pis_cst: "07".to_string(),
                cofins_cst: "07".to_string(),
            }],
            total_products: 10.0,
            total_discount: 0.0,
            total_note: 10.0,
            payment_method: "01".to_string(),
            payment_value: 10.0,
            csc_id: "1".to_string(),
            csc: "123456".to_string(),
        }
    }

    #[test]
    fn test_build_xml() {
        let data = create_test_data();
        let access_key = "35260100123456780001906500100000000111234567890".to_string();
        let builder = NfceXmlBuilder::new(data, access_key);

        let xml = builder.build().unwrap();

        assert!(xml.contains("<?xml"));
        assert!(xml.contains("<NFe"));
        assert!(xml.contains("<infNFe"));
        assert!(xml.contains("</NFe>"));
    }

    #[test]
    fn test_xml_contains_emitter() {
        let data = create_test_data();
        let access_key = "35260100123456780001906500100000000111234567890".to_string();
        let builder = NfceXmlBuilder::new(data, access_key);

        let xml = builder.build().unwrap();

        assert!(xml.contains("EMPRESA TESTE LTDA"));
        assert!(xml.contains("12345678000190"));
    }

    #[test]
    fn test_xml_contains_item() {
        let data = create_test_data();
        let access_key = "35260100123456780001906500100000000111234567890".to_string();
        let builder = NfceXmlBuilder::new(data, access_key);

        let xml = builder.build().unwrap();

        assert!(xml.contains("PRODUTO TESTE"));
        assert!(xml.contains("7891234567890"));
        assert!(xml.contains("10.00"));
    }

    #[test]
    fn test_xml_contains_totals() {
        let data = create_test_data();
        let access_key = "35260100123456780001906500100000000111234567890".to_string();
        let builder = NfceXmlBuilder::new(data, access_key);

        let xml = builder.build().unwrap();

        assert!(xml.contains("<ICMSTot>"));
        assert!(xml.contains("<vNF>10.00</vNF>"));
    }
}
