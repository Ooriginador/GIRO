// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO NFC-e - Nota Fiscal de Consumidor Eletrônica
// ═══════════════════════════════════════════════════════════════════════════
//! Implementação completa de geração e transmissão de NFC-e (Modelo 65)
//! conforme especificações da SEFAZ (NT 2019.001 versão 1.60).
//!
//! ## Componentes
//!
//! - `certificate`: Gerenciamento de certificados digitais A1 (.pfx)
//! - `access_key`: Geração e validação de chaves de acesso (44 dígitos)
//! - `xml_builder`: Montagem do XML NFC-e conforme layout 4.00
//! - `signer`: Assinatura digital XMLDSig
//! - `webservice`: Cliente SOAP para comunicação com SEFAZ
//! - `endpoints`: URLs dos WebServices por UF e ambiente
//! - `qrcode`: Geração de QR Code conforme NT 2019.001
//! - `danfe`: Impressão de DANFE NFC-e em impressora térmica
//! - `contingency`: Modo offline e EPEC
//!
//! ## Fluxo de Emissão
//!
//! ```text
//! 1. Validar Certificado → 2. Gerar XML → 3. Assinar (XMLDSig)
//!    ↓                       ↓              ↓
//! 4. Enviar SEFAZ ←─────── 5. Gerar QR Code ←─── 6. Imprimir DANFE
//! ```

pub mod access_key;
pub mod certificate;
pub mod commands;
pub mod contingency;
pub mod danfe;
pub mod endpoints;
pub mod qrcode;
pub mod signer;
pub mod webservice;
pub mod xml_builder;

// Re-exports
pub use access_key::AccessKey;
pub use certificate::Certificate;
pub use contingency::ContingencyManager;
pub use danfe::{DanfeData, DanfeItem, DanfePrinter};
pub use endpoints::{Environment, SefazEndpoints};
pub use qrcode::{QrCodeGenerator, QrCodeParams};
pub use signer::XmlSigner;
pub use webservice::SefazClient;
pub use xml_builder::{NfceData, NfceItem, NfceXmlBuilder};
