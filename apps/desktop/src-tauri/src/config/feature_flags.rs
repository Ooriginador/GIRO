//! Feature Flags para GIRO
//! Controle granular de funcionalidades por ambiente e perfil

use serde::{Deserialize, Serialize};

/// Feature flags disponíveis no sistema
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureFlags {
    // Core
    pub enable_enterprise: bool,
    pub enable_grocery: bool,
    pub enable_motoparts: bool,

    // Enterprise específicos
    pub enterprise_contracts: bool,
    pub enterprise_work_fronts: bool,
    pub enterprise_material_requests: bool,
    pub enterprise_transfers: bool,
    pub enterprise_inventory: bool,
    pub enterprise_activities: bool,
    pub enterprise_cost_centers: bool,

    // Integrações
    pub enterprise_sienge_export: bool,
    pub enterprise_uau_export: bool,
    pub enterprise_mobile_sync: bool,

    // Relatórios
    pub enterprise_reports: bool,
    pub enterprise_analytics: bool,

    // Experimental
    pub experimental_ai: bool,
    pub experimental_voice: bool,
}

impl Default for FeatureFlags {
    fn default() -> Self {
        Self::development()
    }
}

impl FeatureFlags {
    /// Flags para ambiente de desenvolvimento
    pub fn development() -> Self {
        Self {
            enable_enterprise: true,
            enable_grocery: true,
            enable_motoparts: true,
            enterprise_contracts: true,
            enterprise_work_fronts: true,
            enterprise_material_requests: true,
            enterprise_transfers: true,
            enterprise_inventory: true,
            enterprise_activities: true,
            enterprise_cost_centers: true,
            enterprise_sienge_export: true,
            enterprise_uau_export: true,
            enterprise_mobile_sync: true,
            enterprise_reports: true,
            enterprise_analytics: true,
            experimental_ai: true,
            experimental_voice: true,
        }
    }

    /// Flags para ambiente de staging
    pub fn staging() -> Self {
        Self {
            enable_enterprise: true,
            enable_grocery: true,
            enable_motoparts: true,
            enterprise_contracts: true,
            enterprise_work_fronts: true,
            enterprise_material_requests: true,
            enterprise_transfers: true,
            enterprise_inventory: true,
            enterprise_activities: true,
            enterprise_cost_centers: true,
            enterprise_sienge_export: true,
            enterprise_uau_export: true,
            enterprise_mobile_sync: true,
            enterprise_reports: true,
            enterprise_analytics: true,
            experimental_ai: false,
            experimental_voice: false,
        }
    }

    /// Flags para ambiente de produção (gradual rollout)
    pub fn production() -> Self {
        Self {
            enable_enterprise: false,
            enable_grocery: true,
            enable_motoparts: true,
            enterprise_contracts: false,
            enterprise_work_fronts: false,
            enterprise_material_requests: false,
            enterprise_transfers: false,
            enterprise_inventory: false,
            enterprise_activities: false,
            enterprise_cost_centers: false,
            enterprise_sienge_export: false,
            enterprise_uau_export: false,
            enterprise_mobile_sync: false,
            enterprise_reports: false,
            enterprise_analytics: false,
            experimental_ai: false,
            experimental_voice: false,
        }
    }

    /// Obtém flags baseado no ambiente
    pub fn for_environment(env: &str) -> Self {
        match env {
            "production" | "prod" => Self::production(),
            "staging" | "stage" => Self::staging(),
            _ => Self::development(),
        }
    }

    /// Verifica se Enterprise está habilitado
    pub fn is_enterprise_enabled(&self) -> bool {
        self.enable_enterprise
    }

    /// Habilita todas as features Enterprise
    pub fn enable_all_enterprise(&mut self) {
        self.enable_enterprise = true;
        self.enterprise_contracts = true;
        self.enterprise_work_fronts = true;
        self.enterprise_material_requests = true;
        self.enterprise_transfers = true;
        self.enterprise_inventory = true;
        self.enterprise_activities = true;
        self.enterprise_cost_centers = true;
        self.enterprise_reports = true;
        self.enterprise_analytics = true;
    }

    /// Desabilita todas as features Enterprise
    pub fn disable_all_enterprise(&mut self) {
        self.enable_enterprise = false;
        self.enterprise_contracts = false;
        self.enterprise_work_fronts = false;
        self.enterprise_material_requests = false;
        self.enterprise_transfers = false;
        self.enterprise_inventory = false;
        self.enterprise_activities = false;
        self.enterprise_cost_centers = false;
        self.enterprise_reports = false;
        self.enterprise_analytics = false;
    }
}

/// Carrega feature flags do ambiente
pub fn load_feature_flags() -> FeatureFlags {
    let env = std::env::var("GIRO_ENV").unwrap_or_else(|_| "development".to_string());
    let mut flags = FeatureFlags::for_environment(&env);

    // Override via variáveis de ambiente
    if let Ok(val) = std::env::var("GIRO_ENABLE_ENTERPRISE") {
        flags.enable_enterprise = val == "true" || val == "1";
    }

    if let Ok(val) = std::env::var("GIRO_ENTERPRISE_CONTRACTS") {
        flags.enterprise_contracts = val == "true" || val == "1";
    }

    if let Ok(val) = std::env::var("GIRO_ENTERPRISE_TRANSFERS") {
        flags.enterprise_transfers = val == "true" || val == "1";
    }

    if let Ok(val) = std::env::var("GIRO_ENTERPRISE_REQUESTS") {
        flags.enterprise_material_requests = val == "true" || val == "1";
    }

    flags
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_development_flags() {
        let flags = FeatureFlags::development();
        assert!(flags.enable_enterprise);
        assert!(flags.enterprise_contracts);
        assert!(flags.experimental_ai);
    }

    #[test]
    fn test_production_flags() {
        let flags = FeatureFlags::production();
        assert!(!flags.enable_enterprise);
        assert!(!flags.experimental_ai);
        assert!(flags.enable_grocery);
    }

    #[test]
    fn test_enable_all_enterprise() {
        let mut flags = FeatureFlags::production();
        assert!(!flags.enable_enterprise);

        flags.enable_all_enterprise();

        assert!(flags.enable_enterprise);
        assert!(flags.enterprise_contracts);
        assert!(flags.enterprise_transfers);
    }
}
