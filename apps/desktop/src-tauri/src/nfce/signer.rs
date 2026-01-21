//! Assinador XML - XMLDSig para NFC-e

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use openssl::hash::MessageDigest;
use openssl::sign::Signer as OpensslSigner;
use roxmltree::Document;
use sha1::{Digest, Sha1};

use crate::nfce::certificate::Certificate;

pub struct XmlSigner {
    certificate: Certificate,
}

impl XmlSigner {
    pub fn new(certificate: Certificate) -> Self {
        Self { certificate }
    }

    pub fn sign(&self, xml: &str) -> Result<String, String> {
        let doc = Document::parse(xml).map_err(|e| format!("Parse error: {}", e))?;
        let (inf_nfe_xml, id) = self.extract_inf_nfe(&doc)?;

        let canonical_xml = self.canonicalize(&inf_nfe_xml)?;
        let digest_value = self.calculate_digest(&canonical_xml)?;

        // SignedInfo deve ser canônico
        let signed_info = self.create_signed_info(&digest_value, &id)?;
        let canonical_signed_info = self.canonicalize(&signed_info)?;

        let signature_value = self.sign_with_private_key(&canonical_signed_info)?;
        let signature_element =
            self.create_signature_element(&digest_value, &signature_value, &id)?;

        self.insert_signature(xml, &signature_element)
    }

    fn extract_inf_nfe(&self, doc: &Document) -> Result<(String, String), String> {
        for node in doc.descendants() {
            if node.tag_name().name() == "infNFe" {
                let id = node
                    .attribute("Id")
                    .ok_or("infNFe Id attribute not found")?;
                let xml = self.node_to_xml(doc.input_text(), node.range());
                return Ok((xml, id.to_string()));
            }
        }
        Err(String::from("infNFe not found"))
    }

    fn node_to_xml(&self, input: &str, range: std::ops::Range<usize>) -> String {
        input[range].to_string()
    }

    fn canonicalize(&self, xml: &str) -> Result<String, String> {
        // Exclusive C14N simples para NFe/NFCe:
        // 1. Remover quebras de linha e retornos de carro
        // 2. Remover espaços entre tags
        // 3. Manter espaços dentro de conteúdos de tags (importante!)
        let mut result = xml.to_string();
        result = result.replace("\n", "").replace("\r", "");

        // Regex para espaços entre tags: ">  <" -> "><"
        let re_between = regex::Regex::new(r">\s+<").unwrap();
        result = re_between.replace_all(&result, "><").to_string();

        // Remover espaços após o último fechamento de tag e antes da primeira abertura (trim)
        Ok(result.trim().to_string())
    }

    fn calculate_digest(&self, data: &str) -> Result<String, String> {
        let mut hasher = Sha1::new();
        hasher.update(data.as_bytes());
        let hash = hasher.finalize();
        Ok(STANDARD.encode(hash))
    }

    fn create_signed_info(&self, digest_value: &str, reference_id: &str) -> Result<String, String> {
        let uri = format!("#{}", reference_id);
        // SignedInfo exato conforme exigido pela SEFAZ
        let signed_info = format!(
            "<SignedInfo xmlns=\"http://www.w3.org/2000/09/xmldsig#\">\
<CanonicalizationMethod Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\
<SignatureMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#rsa-sha1\"/>\
<Reference URI=\"{}\">\
<Transforms>\
<Transform Algorithm=\"http://www.w3.org/2000/09/xmldsig#enveloped-signature\"/>\
<Transform Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\
</Transforms>\
<DigestMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#sha1\"/>\
<DigestValue>{}</DigestValue>\
</Reference>\
</SignedInfo>",
            uri, digest_value
        );
        Ok(signed_info)
    }

    fn sign_with_private_key(&self, data: &str) -> Result<String, String> {
        // SEFAZ exige RSA-SHA1 para a assinatura do SignedInfo
        let mut signer = OpensslSigner::new(MessageDigest::sha1(), &self.certificate.private_key)
            .map_err(|e| format!("Signer error: {}", e))?;
        signer
            .update(data.as_bytes())
            .map_err(|e| format!("Update error: {}", e))?;
        let signature = signer
            .sign_to_vec()
            .map_err(|e| format!("Sign error: {}", e))?;
        Ok(STANDARD.encode(signature))
    }

    fn create_signature_element(
        &self,
        digest_value: &str,
        signature_value: &str,
        reference_id: &str,
    ) -> Result<String, String> {
        let cert_der = self
            .certificate
            .x509
            .to_der()
            .map_err(|e| format!("Certificate DER error: {}", e))?;
        let cert_base64 = STANDARD.encode(&cert_der);

        let signature = format!(
            "<Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\">\
<SignedInfo>\
<CanonicalizationMethod Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\
<SignatureMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#rsa-sha1\"/>\
<Reference URI=\"#{}\">\
<Transforms>\
<Transform Algorithm=\"http://www.w3.org/2000/09/xmldsig#enveloped-signature\"/>\
<Transform Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\
</Transforms>\
<DigestMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#sha1\"/>\
<DigestValue>{}</DigestValue>\
</Reference>\
</SignedInfo>\
<SignatureValue>{}</SignatureValue>\
<KeyInfo>\
<X509Data>\
<X509Certificate>{}</X509Certificate>\
</X509Data>\
</KeyInfo>\
</Signature>",
            reference_id, digest_value, signature_value, cert_base64
        );
        Ok(signature)
    }

    fn insert_signature(&self, xml: &str, signature: &str) -> Result<String, String> {
        match xml.find("</infNFe>") {
            Some(pos) => {
                let mut result = String::new();
                result.push_str(&xml[..pos + 9]);
                result.push_str(signature);
                result.push_str(&xml[pos + 9..]);
                Ok(result)
            }
            None => Err(String::from("infNFe tag not found")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use openssl::asn1::Asn1Time;
    use openssl::bn::BigNum;
    use openssl::hash::MessageDigest;
    use openssl::pkey::PKey;
    use openssl::rsa::Rsa;
    use openssl::x509::{X509Builder, X509NameBuilder};

    fn make_test_certificate() -> Certificate {
        let rsa = Rsa::generate(2048).unwrap();
        let pkey = PKey::from_rsa(rsa).unwrap();

        let mut name_builder = X509NameBuilder::new().unwrap();
        name_builder
            .append_entry_by_text("CN", "TEST CERT 12345678000190")
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

        Certificate {
            x509,
            private_key: pkey,
            cnpj: "12345678000190".to_string(),
            valid_until: chrono::Utc::now().naive_utc() + chrono::Duration::days(365),
        }
    }

    #[test]
    fn test_sign_inserts_signature() {
        let cert = make_test_certificate();
        let signer = XmlSigner::new(cert);

        let xml = r#"<?xml version="1.0"?>
<NFe>
    <infNFe Id="NFe123">
        <ide>TEST</ide>
    </infNFe>
</NFe>"#;

        let signed = signer.sign(xml).expect("sign failed");

        assert!(signed.contains("<Signature"), "Signature element not found");
        assert!(
            signed.contains("<SignatureValue>"),
            "SignatureValue not found"
        );
        assert!(
            signed.contains("<X509Certificate>"),
            "Certificate not embedded"
        );
    }
}
