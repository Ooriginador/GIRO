// ════════════════════════════════════════════════════════════════════════════
// CLIENTE WEBSERVICE SEFAZ - SOAP 1.2
// ════════════════════════════════════════════════════════════════════════════
//! Cliente HTTP para comunicação com WebServices SEFAZ

use openssl::pkcs12::Pkcs12;
use reqwest::{Client, Identity};
use roxmltree::Document;
use std::fs;

use crate::nfce::endpoints::{Environment, SefazEndpoints};

#[derive(Debug, Clone)]
pub struct SefazClient {
    client: Client,
    uf: String,
    environment: Environment,
}

#[derive(Debug, Clone)]
pub struct AuthorizationResponse {
    pub status_code: String,
    pub status_message: String,
    pub protocol: Option<String>,
    pub xml: String,
}

#[derive(Debug, Clone)]
pub struct QueryResponse {
    pub status_code: String,
    pub status_message: String,
    pub xml: Option<String>,
}

impl SefazClient {
    pub fn new(
        uf: String,
        environment: Environment,
        cert_path: Option<&str>,
        cert_password: Option<&str>,
    ) -> Result<Self, String> {
        let mut builder = Client::builder().timeout(std::time::Duration::from_secs(30));

        if let Some(path) = cert_path {
            let cert_content =
                fs::read(path).map_err(|e| format!("Erro ao ler arquivo certificado: {}", e))?;

            // reqwest 0.12 não expõe Identity::from_pkcs12_der. Para .pfx/.p12,
            // convertemos para PEM (cert + key) via OpenSSL e carregamos com from_pem.
            let identity = if path.to_lowercase().ends_with(".pfx")
                || path.to_lowercase().ends_with(".p12")
            {
                let pwd = cert_password.ok_or_else(|| {
                    "Senha do certificado é obrigatória para arquivos .pfx/.p12".to_string()
                })?;

                let pkcs12 = Pkcs12::from_der(&cert_content)
                    .map_err(|e| format!("Erro ao ler PKCS#12 (DER): {}", e))?;
                let parsed = pkcs12
                    .parse2(pwd)
                    .map_err(|e| format!("Erro ao decodificar PKCS#12: {}", e))?;

                let mut pem = Vec::<u8>::new();

                if let Some(pkey) = parsed.pkey {
                    let key_pem = pkey
                        .private_key_to_pem_pkcs8()
                        .map_err(|e| format!("Erro ao exportar chave privada PEM: {}", e))?;
                    pem.extend_from_slice(&key_pem);
                }

                if let Some(cert) = parsed.cert {
                    let cert_pem = cert
                        .to_pem()
                        .map_err(|e| format!("Erro ao exportar certificado PEM: {}", e))?;
                    pem.extend_from_slice(&cert_pem);
                }

                if let Some(ca) = parsed.ca {
                    for cert in ca {
                        let cert_pem = cert
                            .to_pem()
                            .map_err(|e| format!("Erro ao exportar chain PEM: {}", e))?;
                        pem.extend_from_slice(&cert_pem);
                    }
                }

                Identity::from_pem(&pem)
                    .map_err(|e| format!("Erro ao carregar identidade SSL (PEM gerado): {}", e))?
            } else {
                Identity::from_pem(&cert_content)
                    .map_err(|e| format!("Erro ao carregar identidade SSL (PEM): {}", e))?
            };

            builder = builder.identity(identity);
        }

        let client = builder
            .build()
            .map_err(|e| format!("Erro ao construir cliente HTTP: {}", e))?;

        Ok(Self {
            client,
            uf,
            environment,
        })
    }

    /// Envia NFC-e para autorização
    pub async fn authorize(&self, signed_xml: &str) -> Result<AuthorizationResponse, String> {
        let url = SefazEndpoints::get_url(&self.uf, self.environment)?;

        let soap_envelope = self.create_authorization_envelope(signed_xml)?;

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/soap+xml; charset=utf-8")
            .body(soap_envelope)
            .send()
            .await
            .map_err(|e| format!("Erro ao enviar requisição: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Erro ao ler resposta: {}", e))?;

        self.parse_authorization_response(&response_text)
    }

    /// Consulta status do serviço
    pub async fn check_status(&self) -> Result<QueryResponse, String> {
        let url = SefazEndpoints::get_url(&self.uf, self.environment)?;

        let soap_envelope = self.create_status_envelope()?;

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/soap+xml; charset=utf-8")
            .body(soap_envelope)
            .send()
            .await
            .map_err(|e| format!("Erro ao enviar requisição: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Erro ao ler resposta: {}", e))?;

        self.parse_status_response(&response_text)
    }

    /// Consulta protocolo de autorização
    pub async fn query_protocol(&self, access_key: &str) -> Result<QueryResponse, String> {
        let url = SefazEndpoints::get_url(&self.uf, self.environment)?;

        let soap_envelope = self.create_query_envelope(access_key)?;

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/soap+xml; charset=utf-8")
            .body(soap_envelope)
            .send()
            .await
            .map_err(|e| format!("Erro ao enviar requisição: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Erro ao ler resposta: {}", e))?;

        self.parse_query_response(&response_text)
    }

    fn create_authorization_envelope(&self, nfce_xml: &str) -> Result<String, String> {
        // SOAP 1.2 Envelope para NFeAutorizacao4
        let envelope = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
  <soap12:Header/>
  <soap12:Body>
    <nfe:nfeDadosMsg>
      <![CDATA[
        {}
      ]]>
    </nfe:nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>"#,
            nfce_xml
        );

        Ok(envelope)
    }

    fn create_status_envelope(&self) -> Result<String, String> {
        let uf_code = self.get_uf_code();

        let envelope = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
  <soap12:Header/>
  <soap12:Body>
    <nfe:nfeDadosMsg>
      <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>{}</tpAmb>
        <cUF>{}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfe:nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>"#,
            if self.environment == Environment::Production {
                "1"
            } else {
                "2"
            },
            uf_code
        );

        Ok(envelope)
    }

    fn create_query_envelope(&self, access_key: &str) -> Result<String, String> {
        let envelope = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
  <soap12:Header/>
  <soap12:Body>
    <nfe:nfeDadosMsg>
      <consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>{}</tpAmb>
        <xServ>CONSULTAR</xServ>
        <chNFe>{}</chNFe>
      </consSitNFe>
    </nfe:nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>"#,
            if self.environment == Environment::Production {
                "1"
            } else {
                "2"
            },
            access_key
        );

        Ok(envelope)
    }

    fn parse_authorization_response(&self, xml: &str) -> Result<AuthorizationResponse, String> {
        let doc =
            Document::parse(xml).map_err(|e| format!("Erro ao fazer parse da resposta: {}", e))?;

        // Procurar elementos de retorno
        let mut status_code = String::new();
        let mut status_message = String::new();
        let mut protocol = None;

        for node in doc.descendants() {
            match node.tag_name().name() {
                "cStat" => {
                    status_code = node.text().unwrap_or("").to_string();
                }
                "xMotivo" => {
                    status_message = node.text().unwrap_or("").to_string();
                }
                "nProt" => {
                    protocol = Some(node.text().unwrap_or("").to_string());
                }
                _ => {}
            }
        }

        Ok(AuthorizationResponse {
            status_code,
            status_message,
            protocol,
            xml: xml.to_string(),
        })
    }

    fn parse_status_response(&self, xml: &str) -> Result<QueryResponse, String> {
        let doc =
            Document::parse(xml).map_err(|e| format!("Erro ao fazer parse da resposta: {}", e))?;

        let mut status_code = String::new();
        let mut status_message = String::new();

        for node in doc.descendants() {
            match node.tag_name().name() {
                "cStat" => {
                    status_code = node.text().unwrap_or("").to_string();
                }
                "xMotivo" => {
                    status_message = node.text().unwrap_or("").to_string();
                }
                _ => {}
            }
        }

        Ok(QueryResponse {
            status_code,
            status_message,
            xml: Some(xml.to_string()),
        })
    }

    fn parse_query_response(&self, xml: &str) -> Result<QueryResponse, String> {
        self.parse_status_response(xml)
    }

    fn get_uf_code(&self) -> String {
        use crate::nfce::access_key::UF_CODES;
        UF_CODES
            .iter()
            .find(|(uf, _)| *uf == self.uf)
            .map(|(_, code)| code.to_string())
            .unwrap_or_else(|| "35".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_status_envelope() {
        let client = SefazClient::new("SP".to_string(), Environment::Homologation, None, None)
            .expect("Failed to create SefazClient");
        let envelope = client.create_status_envelope().unwrap();

        assert!(envelope.contains("<soap12:Envelope"));
        assert!(envelope.contains("<consStatServ"));
        assert!(envelope.contains("<xServ>STATUS</xServ>"));
        assert!(envelope.contains("<tpAmb>2</tpAmb>")); // Homologação
    }

    #[test]
    fn test_create_query_envelope() {
        let client = SefazClient::new("SP".to_string(), Environment::Production, None, None)
            .expect("Failed to create SefazClient");
        let access_key = "35260100123456780001906500100000000111234567890";
        let envelope = client.create_query_envelope(access_key).unwrap();

        assert!(envelope.contains("<soap12:Envelope"));
        assert!(envelope.contains("<consSitNFe"));
        assert!(envelope.contains(access_key));
        assert!(envelope.contains("<tpAmb>1</tpAmb>")); // Produção
    }

    #[test]
    fn test_parse_authorization_response() {
        let client = SefazClient::new("SP".to_string(), Environment::Homologation, None, None)
            .expect("Failed to create SefazClient");

        let xml = r#"<?xml version="1.0"?>
<retEnviNFe>
    <cStat>100</cStat>
    <xMotivo>Autorizado o uso da NF-e</xMotivo>
    <nProt>123456789012345</nProt>
</retEnviNFe>"#;

        let response = client.parse_authorization_response(xml).unwrap();

        assert_eq!(response.status_code, "100");
        assert_eq!(response.status_message, "Autorizado o uso da NF-e");
        assert_eq!(response.protocol, Some("123456789012345".to_string()));
    }

    #[test]
    fn test_parse_status_response() {
        let client = SefazClient::new("SP".to_string(), Environment::Homologation, None, None)
            .expect("Failed to create SefazClient");

        let xml = r#"<?xml version="1.0"?>
<retConsStatServ>
    <cStat>107</cStat>
    <xMotivo>Serviço em Operação</xMotivo>
</retConsStatServ>"#;

        let response = client.parse_status_response(xml).unwrap();

        assert_eq!(response.status_code, "107");
        assert_eq!(response.status_message, "Serviço em Operação");
    }
}
