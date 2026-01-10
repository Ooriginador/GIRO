// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS SEFAZ POR UF
// ═══════════════════════════════════════════════════════════════════════════
//! URLs dos WebServices SEFAZ por estado e ambiente.
//!
//! ## Ambientes
//! - **Produção**: Notas fiscais reais
//! - **Homologação**: Testes (obrigatório antes de produção)
//!
//! ## SVAN/SVRS
//! - **SVAN**: Sefaz Virtual Ambiente Nacional (RJ/RS)
//! - **SVRS**: Sefaz Virtual Rio Grande do Sul (demais estados)

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Environment {
    Production,
    Homologation,
}

pub struct SefazEndpoints;

impl SefazEndpoints {
    /// Retorna URL base do WebService para a UF
    pub fn get_url(uf: &str, env: Environment) -> Result<String, String> {
        let base_url = match (uf, env) {
            // São Paulo
            ("SP", Environment::Production) => {
                "https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx"
            }
            ("SP", Environment::Homologation) => {
                "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx"
            }

            // Rio de Janeiro
            ("RJ", Environment::Production) => {
                "https://nfce.svrs.rs.gov.br/ws/NFeAutorizacao/NFeAutorizacao4.asmx"
            }
            ("RJ", Environment::Homologation) => {
                "https://nfce-homologacao.svrs.rs.gov.br/ws/NFeAutorizacao/NFeAutorizacao4.asmx"
            }

            // Minas Gerais
            ("MG", Environment::Production) => {
                "https://nfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4"
            }
            ("MG", Environment::Homologation) => {
                "https://hnfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4"
            }

            // Rio Grande do Sul
            ("RS", Environment::Production) => {
                "https://nfce.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx"
            }
            ("RS", Environment::Homologation) => {
                "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx"
            }

            // Demais estados usam SVRS
            (_, Environment::Production) => {
                "https://nfce.svrs.rs.gov.br/ws/NFeAutorizacao/NFeAutorizacao4.asmx"
            }
            (_, Environment::Homologation) => {
                "https://nfce-homologacao.svrs.rs.gov.br/ws/NFeAutorizacao/NFeAutorizacao4.asmx"
            }
        };

        Ok(base_url.to_string())
    }

    /// URL para consulta de status do serviço
    pub fn get_status_url(uf: &str, env: Environment) -> Result<String, String> {
        let base_url = Self::get_url(uf, env)?;
        Ok(base_url.replace("NFeAutorizacao4", "NFeStatusServico4"))
    }

    /// URL para consulta de protocolo
    pub fn get_query_url(uf: &str, env: Environment) -> Result<String, String> {
        let base_url = Self::get_url(uf, env)?;
        Ok(base_url.replace("NFeAutorizacao4", "NFeConsultaProtocolo4"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sp_production_url() {
        let url = SefazEndpoints::get_url("SP", Environment::Production).unwrap();
        assert!(url.contains("nfce.fazenda.sp.gov.br"));
        assert!(!url.contains("homologacao"));
    }

    #[test]
    fn test_sp_homologation_url() {
        let url = SefazEndpoints::get_url("SP", Environment::Homologation).unwrap();
        assert!(url.contains("homologacao"));
    }

    #[test]
    fn test_svrs_fallback() {
        let url = SefazEndpoints::get_url("SC", Environment::Production).unwrap();
        assert!(url.contains("svrs.rs.gov.br"));
    }

    #[test]
    fn test_status_url() {
        let url = SefazEndpoints::get_status_url("SP", Environment::Production).unwrap();
        assert!(url.contains("NFeStatusServico4"));
    }
}
