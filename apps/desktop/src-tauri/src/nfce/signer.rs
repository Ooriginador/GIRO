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
        let inf_nfe = self.extract_inf_nfe(&doc)?;
        let canonical_xml = self.canonicalize(&inf_nfe)?;
        let digest_value = self.calculate_digest(&canonical_xml)?;
        let signed_info = self.create_signed_info(&digest_value, "infNFe")?;
        let canonical_signed_info = self.canonicalize(&signed_info)?;
        let signature_value = self.sign_with_private_key(&canonical_signed_info)?;
        let signature = self.create_signature_element(&digest_value, &signature_value)?;
        self.insert_signature(xml, &signature)
    }

    fn extract_inf_nfe(&self, doc: &Document) -> Result<String, String> {
        for node in doc.descendants() {
            if node.tag_name().name() == "infNFe" {
                let xml = self.node_to_xml(doc.input_text(), node.range());
                return Ok(xml);
            }
        }
        Err(String::from("infNFe not found"))
    }

    fn node_to_xml(&self, input: &str, range: std::ops::Range<usize>) -> String {
        input[range].to_string()
    }

    fn canonicalize(&self, xml: &str) -> Result<String, String> {
        let mut result = xml.to_string();
        result = result.replace("\n", "").replace("\r", "");
        result = regex::Regex::new(r">\s+<")
            .unwrap()
            .replace_all(&result, "><")
            .to_string();
        result = regex::Regex::new(r">\s+")
            .unwrap()
            .replace_all(&result, ">")
            .to_string();
        result = regex::Regex::new(r"\s+<")
            .unwrap()
            .replace_all(&result, "<")
            .to_string();
        Ok(result)
    }

    fn calculate_digest(&self, data: &str) -> Result<String, String> {
        let mut hasher = Sha1::new();
        hasher.update(data.as_bytes());
        let hash = hasher.finalize();
        Ok(STANDARD.encode(hash))
    }

    fn create_signed_info(&self, digest_value: &str, reference_id: &str) -> Result<String, String> {
        let uri = format!("#{}", reference_id);
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
<Reference URI=\"#infNFe\">\
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
            digest_value, signature_value, cert_base64
        );
        Ok(signature)
    }

    fn insert_signature(&self, xml: &str, signature: &str) -> Result<String, String> {
        let signature_trimmed = signature.trim();
        match xml.find("</infNFe>") {
            Some(pos) => {
                let mut result = String::new();
                result.push_str(&xml[..pos + 9]);
                result.push_str(signature_trimmed);
                result.push_str(&xml[pos + 9..]);
                Ok(result)
            }
            None => Err(String::from("infNFe_tag_not_found")),
        }
    }
}

#[cfg(test)]
mod tests {}
