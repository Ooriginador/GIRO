// ════════════════════════════════════════════════════════════════════════════
// COMMANDS NFC-e - Interface Tauri
// ════════════════════════════════════════════════════════════════════════════
//! Comandos expostos para o frontend

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

use crate::models::{FiscalSettings, UpdateFiscalSettings};
use crate::nfce::contingency::ContingencyManager;
use crate::nfce::{
    AccessKey, Certificate, DanfeData, DanfeItem, DanfePrinter, Environment, NfceData, NfceItem,
    NfceXmlBuilder, QrCodeGenerator, QrCodeParams, SefazClient, XmlSigner,
};
use crate::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmitNfceRequest {
    // Dados da venda
    pub sale_id: Option<String>,
    pub items: Vec<EmissionItem>,
    pub total: f64,
    pub discount: f64,
    pub payment_method: String,
    pub payment_value: f64,

    // Configuração Emitente (provavelmente viria do banco em prod real, mas passamos aqui para flexibilidade)
    pub emitter_cnpj: String,
    pub emitter_ie: String,
    pub emitter_name: String,
    pub emitter_trade_name: Option<String>,
    pub emitter_address: String,
    pub emitter_city: String,
    pub emitter_city_code: String,
    pub emitter_state: String,
    pub emitter_uf: String,
    pub emitter_cep: String,
    pub emitter_phone: Option<String>,
    pub recipient_cpf: Option<String>,
    pub recipient_name: Option<String>,

    // Configuração NFC-e
    pub serie: u16,
    pub numero: u32,
    pub environment: u8, // 1=Prod, 2=Homolog
    pub csc_id: String,
    pub csc: String,

    // Certificado
    pub cert_path: String,
    pub cert_password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmissionItem {
    pub code: String,
    pub description: String,
    pub ncm: String,
    pub cfop: String,
    pub unit: String,
    pub quantity: f64,
    pub unit_value: f64,
    pub total_value: f64,
    pub ean: Option<String>,

    // Impostos básicos
    pub icms_origin: u8,
    pub icms_cst: String,
    pub pis_cst: String,
    pub cofins_cst: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmissionResponse {
    pub success: bool,
    pub message: String,
    pub access_key: Option<String>,
    pub protocol: Option<String>,
    pub xml: Option<String>,
    pub danfe_escpos: Option<Vec<u8>>, // Bytes para impressão direta
    pub qrcode_url: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusResponse {
    pub active: bool,
    pub status_code: String,
    pub status_message: String,
    pub environment: String,
}

/// Emite uma NFC-e completa
#[command]
pub async fn emit_nfce(
    app_handle: tauri::AppHandle,
    request: EmitNfceRequest,
    state: State<'_, AppState>,
) -> Result<EmissionResponse, String> {
    println!("Iniciando emissão de NFC-e...");

    let pool = state.pool();
    let fiscal_repo = crate::repositories::FiscalRepository::new(pool);
    let fiscal_settings = fiscal_repo
        .get()
        .await
        .map_err(|e| format!("Erro ao carregar configurações fiscais: {}", e))?;

    if !fiscal_settings.enabled {
        return Err("Módulo fiscal desativado nas configurações".to_string());
    }

    let cert_path = fiscal_settings
        .cert_path
        .as_ref()
        .ok_or("Arquivo de certificado não configurado")?;
    let cert_password = fiscal_settings
        .cert_password
        .as_ref()
        .ok_or("Senha do certificado não configurada")?;

    // 1. Carregar Certificado
    println!("Carregando certificado: {}", cert_path);
    let cert = Certificate::from_pfx(cert_path, cert_password)?;

    // Verificar validade
    if !cert.is_valid() {
        return Err("Certificado digital expirado ou inválido".to_string());
    }

    // Preparar Itens
    let nfce_items: Vec<NfceItem> = request
        .items
        .iter()
        .enumerate()
        .map(|(idx, item)| NfceItem {
            number: (idx + 1) as u16,
            code: item.code.clone(),
            ean: item.ean.clone(),
            description: item.description.clone(),
            ncm: item.ncm.clone(),
            cfop: item.cfop.clone(),
            unit: item.unit.clone(),
            quantity: item.quantity,
            unit_value: item.unit_value,
            total_value: item.total_value,
            icms_origin: item.icms_origin,
            icms_cst: item.icms_cst.clone(),
            pis_cst: item.pis_cst.clone(),
            cofins_cst: item.cofins_cst.clone(),
        })
        .collect();

    let environment = if fiscal_settings.environment == 1 {
        Environment::Production
    } else {
        Environment::Homologation
    };

    let emitter_uf = fiscal_settings.uf.clone();
    let emitter_cnpj = request.emitter_cnpj.clone();
    let serie = fiscal_settings.serie as u16;
    let numero = fiscal_settings.next_number as u32;

    // TENTATIVA 1: Emissão Normal (Online)
    let emission_date = Utc::now();
    let access_key_gen = AccessKey::generate(
        &emitter_uf,
        emission_date.naive_utc(),
        &emitter_cnpj,
        65, // Modelo 65 = NFC-e
        serie,
        numero,
        1, // Tipo emissão normal
    )?;

    let mut access_key = access_key_gen.key.clone();
    println!("Chave gerada (Normal): {}", access_key);

    let mut data = NfceData {
        uf: emitter_uf.clone(),
        cnpj: emitter_cnpj.clone(),
        serie,
        numero,
        emission_date,
        emission_type: 1, // Normal
        environment: fiscal_settings.environment as u8,
        emitter_name: request.emitter_name.clone(),
        emitter_trade_name: request.emitter_trade_name.clone(),
        emitter_ie: request.emitter_ie.clone(),
        emitter_address: request.emitter_address.clone(),
        emitter_city: request.emitter_city.clone(),
        emitter_city_code: request.emitter_city_code.clone(),
        emitter_state: request.emitter_state.clone(),
        emitter_cep: request.emitter_cep.clone(),
        recipient_cpf: request.recipient_cpf,
        recipient_name: request.recipient_name,
        items: nfce_items.clone(),
        total_products: request.total,
        total_discount: request.discount,
        total_note: request.total - request.discount,
        payment_method: map_payment_method(&request.payment_method),
        payment_value: request.payment_value,
        csc_id: fiscal_settings.csc_id.clone().unwrap_or_default(),
        csc: fiscal_settings.csc.clone().unwrap_or_default(),
    };

    let xml_builder = NfceXmlBuilder::new(data.clone(), access_key.clone());
    let xml = xml_builder.build()?;

    let signer = XmlSigner::new(cert);
    let signed_xml = signer.sign(&xml)?;

    let client = SefazClient::new(
        emitter_uf.clone(),
        environment,
        Some(cert_path),
        Some(cert_password),
    )?;

    println!("Enviando para SEFAZ...");
    let response_result = client.authorize(&signed_xml).await;

    let mut protocol: Option<String> = None;
    let mut success_xml = signed_xml.clone();
    let mut is_contingency = false;

    match response_result {
        Ok(response) => {
            println!(
                "Resposta SEFAZ: {} - {}",
                response.status_code, response.status_message
            );

            if response.status_code == "100" {
                // SUCESSO ONLINE
                protocol = response.protocol;
                // Incrementar número apenas em caso de sucesso
                let _ = fiscal_repo.increment_number().await;
            } else {
                return Ok(EmissionResponse {
                    success: false,
                    message: format!(
                        "Rejeição SEFAZ: {} - {}",
                        response.status_code, response.status_message
                    ),
                    access_key: Some(access_key),
                    protocol: None,
                    xml: Some(signed_xml),
                    danfe_escpos: None,
                    qrcode_url: None,
                });
            }
        }
        Err(err_msg) => {
            // ERRO DE COMUNICAÇÃO -> CONTINGÊNCIA
            println!(
                "Erro de comunicação com SEFAZ: {}. Iniciando Contingência Offline...",
                err_msg
            );
            is_contingency = true;

            // 1. Recarregar Certificado para a nova assinatura
            let cert_offline = Certificate::from_pfx(cert_path, cert_password)?;

            // 2. Gerar Nova Chave (tpEmis = 9)
            let access_key_offline = AccessKey::generate(
                &emitter_uf,
                emission_date.naive_utc(),
                &emitter_cnpj,
                65,
                serie,
                numero,
                9, // Contingência Offline
            )?;
            access_key = access_key_offline.key;
            println!("Chave gerada (Contingência): {}", access_key);

            // 3. Atualizar Dados
            data.emission_type = 9;

            // 4. Gerar e Assinar novo XML
            let xml_builder_off = NfceXmlBuilder::new(data.clone(), access_key.clone());
            let xml_off = xml_builder_off.build()?;
            let signer_off = XmlSigner::new(cert_offline);
            let signed_xml_off = signer_off.sign(&xml_off)?;
            success_xml = signed_xml_off.clone();

            // 5. Salvar em Disco
            let manager = ContingencyManager::new(&app_handle);
            manager.save_note(&access_key, &signed_xml_off)?;

            // 6. Incrementar número (nota emitida, mesmo offline)
            let _ = fiscal_repo.increment_number().await;
        }
    }

    // 7. Gerar QR Code
    // Extrair digest realizado no XML assinado
    let digest_value = extract_digest_from_xml(&success_xml).unwrap_or_else(|| "ERROR".to_string());

    let qr_params = QrCodeParams {
        access_key: access_key.clone(),
        uf: emitter_uf.clone(),
        environment: data.environment,
        emission_date: emission_date.to_rfc3339(),
        total_value: data.total_note,
        digest_value,
        csc_id: data.csc_id.clone(),
        csc: data.csc.clone(),
    };

    let qrcode_url = QrCodeGenerator::generate_url(&qr_params)?;
    let qrcode_png = QrCodeGenerator::generate_png(&qr_params)?;

    // 8. Gerar DANFE (ESC/POS)
    let danfe_items: Vec<DanfeItem> = request
        .items
        .iter()
        .map(|item| DanfeItem {
            code: item.code.clone(),
            description: item.description.clone(),
            quantity: item.quantity,
            unit: item.unit.clone(),
            unit_value: item.unit_value,
            total_value: item.total_value,
        })
        .collect();

    let additional_msg = if is_contingency {
        "EMITIDA EM CONTINGÊNCIA - Pendente de Autorização".to_string()
    } else {
        "OBRIGADO PELA PREFERENCIA".to_string()
    };

    let danfe_data = DanfeData {
        emitter_name: request.emitter_name,
        emitter_trade_name: request.emitter_trade_name,
        emitter_cnpj: request.emitter_cnpj,
        emitter_ie: request.emitter_ie,
        emitter_address: request.emitter_address,
        emitter_city: request.emitter_city,
        emitter_uf,
        emitter_phone: request.emitter_phone,
        number: numero,
        series: serie,
        emission_date,
        access_key: access_key.clone(),
        protocol: protocol.clone(),
        items: danfe_items,
        total: data.total_note,
        discount: data.total_discount,
        total_items: data.total_products,
        payment_method: data.payment_method,
        payment_value: data.payment_value,
        qrcode_png,
        additional_info: Some(additional_msg),
    };

    let escpos_bytes = DanfePrinter::generate_escpos(&danfe_data)?;

    let status_msg = if is_contingency {
        "NFC-e emitida em Contingência Offline (Sem Internet)".to_string()
    } else {
        "NFC-e autorizada com sucesso".to_string()
    };

    Ok(EmissionResponse {
        success: true,
        message: status_msg,
        access_key: Some(access_key),
        protocol,
        xml: Some(success_xml),
        danfe_escpos: Some(escpos_bytes),
        qrcode_url: Some(qrcode_url),
    })
}

fn extract_digest_from_xml(xml: &str) -> Option<String> {
    use roxmltree::Document;
    if let Ok(doc) = Document::parse(xml) {
        for node in doc.descendants() {
            if node.tag_name().name() == "DigestValue" {
                return node.text().map(|s| s.to_string());
            }
        }
    }
    None
}

/// Consulta status da SEFAZ
#[command]
pub async fn check_sefaz_status(
    uf: String,
    environment: u8, // 1=Prod, 2=Homolog
) -> Result<StatusResponse, String> {
    let env = if environment == 1 {
        Environment::Production
    } else {
        Environment::Homologation
    };
    let client = SefazClient::new(uf, env, None, None)?;

    let response = client.check_status().await?;

    Ok(StatusResponse {
        active: response.status_code == "107", // 107 = Serviço em Operação
        status_code: response.status_code,
        status_message: response.status_message,
        environment: format!("{:?}", env),
    })
}

/// Lista notas emitidas em contingência
#[command]
pub async fn list_offline_notes(
    app_handle: tauri::AppHandle,
) -> Result<Vec<crate::nfce::contingency::OfflineNote>, String> {
    let manager = ContingencyManager::new(&app_handle);
    manager.list_pending_notes()
}

/// Tenta transmitir uma nota offline pendente
#[command]
pub async fn transmit_offline_note(
    app_handle: tauri::AppHandle,
    access_key: String,
    cert_path: String,
    cert_password: String,
    emitter_uf: String,
    environment: u8,
) -> Result<EmissionResponse, String> {
    let manager = ContingencyManager::new(&app_handle);
    let notes = manager.list_pending_notes()?;

    let note = notes
        .into_iter()
        .find(|n| n.access_key == access_key)
        .ok_or_else(|| "Nota não encontrada na fila de contingência".to_string())?;

    // Carregar certificado novamente (pois é uma nova sessão de envio)
    // Validar certificado antes de prosseguir
    let _cert = Certificate::from_pfx(&cert_path, &cert_password)?;

    let env = if environment == 1 {
        Environment::Production
    } else {
        Environment::Homologation
    };
    let client = SefazClient::new(emitter_uf, env, Some(&cert_path), Some(&cert_password))?;

    // O XML já está assinado.
    let signed_xml = note.xml;
    let response = client.authorize(&signed_xml).await?;

    if response.status_code == "100" || response.status_code == "101" {
        // 100=Autorizado, 101=Cancelamento? Não, 100 é o que queremos.
        manager.mark_as_transmitted(&access_key)?;

        Ok(EmissionResponse {
            success: true,
            message: "Nota transmitida com sucesso".to_string(),
            access_key: Some(access_key),
            protocol: response.protocol,
            xml: Some(signed_xml),
            danfe_escpos: None, // Não precisa reimprimir se já imprimiu
            qrcode_url: None,
        })
    } else {
        Ok(EmissionResponse {
            success: false,
            message: format!(
                "Rejeição tardia: {} - {}",
                response.status_code, response.status_message
            ),
            access_key: Some(access_key),
            protocol: None,
            xml: Some(signed_xml),
            danfe_escpos: None,
            qrcode_url: None,
        })
    }
}

#[command]
pub async fn get_fiscal_settings(state: State<'_, AppState>) -> Result<FiscalSettings, String> {
    let repo = crate::repositories::FiscalRepository::new(state.pool());
    repo.get().await.map_err(|e| e.to_string())
}

#[command]
pub async fn update_fiscal_settings(
    state: State<'_, AppState>,
    data: UpdateFiscalSettings,
) -> Result<FiscalSettings, String> {
    let repo = crate::repositories::FiscalRepository::new(state.pool());
    repo.update(data).await.map_err(|e| e.to_string())
}

fn map_payment_method(method: &str) -> String {
    match method.to_uppercase().as_str() {
        "CASH" | "DINHEIRO" => "01".to_string(),
        "CREDIT" | "CREDITO" => "03".to_string(),
        "DEBIT" | "DEBITO" => "04".to_string(),
        "PIX" => "17".to_string(),
        "VOUCHER" | "VALE" => "10".to_string(), // Vale Alimentação = 10, Refeição = 11
        _ => "99".to_string(),                  // Outros
    }
}
