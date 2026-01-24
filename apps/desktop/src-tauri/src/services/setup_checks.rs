use tracing::{info, warn};

/// Verifica e tenta corrigir as configurações de rede/firewall
pub async fn check_network_setup() {
    verify_firewall_rules().await;
}

#[cfg(target_os = "windows")]
async fn verify_firewall_rules() {
    info!("Verificando regras de Firewall do Windows...");

    // Verifica regra da porta 3847
    let port_rule_exists = check_rule_exists("GIRO Mobile Sync");
    if !port_rule_exists {
        warn!("⚠️ Regra de firewall 'GIRO Mobile Sync' (Porta 3847) NÃO encontrada.");
        warn!("Isso pode impedir a conexão com o app mobile.");
        // Opcional: Tentar recriar se estivesse rodando como admin, mas
        // é melhor avisar o usuário ou confiar no instalador.
    } else {
        info!("✅ Regra de firewall 'GIRO Mobile Sync' encontrada.");
    }

    // Verifica regra do executável
    let app_rule_exists = check_rule_exists("GIRO Desktop App");
    if !app_rule_exists {
        warn!("⚠️ Regra de firewall 'GIRO Desktop App' NÃO encontrada.");
    } else {
        info!("✅ Regra de firewall 'GIRO Desktop App' encontrada.");
    }
}

#[cfg(target_os = "windows")]
fn check_rule_exists(rule_name: &str) -> bool {
    use std::process::Command;
    let output = Command::new("netsh")
        .args(&[
            "advfirewall",
            "firewall",
            "show",
            "rule",
            &format!("name=\"{}\"", rule_name),
        ])
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            // Se a regra não existe, netsh retorna "No rules match the specified criteria"
            !stdout.contains("No rules match") && out.status.success()
        }
        Err(_) => false,
    }
}

#[cfg(not(target_os = "windows"))]
async fn verify_firewall_rules() {
    info!("Verificando ambiente Linux/macOS...");
    // Linux checks (e.g., ufw) are complex due to distro variance.
    // For now, we assume the user has configured manually or distribution package handles it.
    // We can check if port 3847 is bindable.
    match std::net::TcpListener::bind("0.0.0.0:3847") {
        Ok(_) => {
            info!("✅ Porta 3847 está livre para uso (Teste de bind bem sucedido).");
            // Drop listener immidiately
        }
        Err(e) => {
            if e.kind() == std::io::ErrorKind::AddrInUse {
                // Pode ser que o próprio app já esteja rodando (se isso rodar depois do start do server)
                // Como check_network_setup é chamado no main, antes ou paralelo ao server?
                warn!("⚠️ Porta 3847 parece estar em uso. Verifique se outra instância não está rodando.");
            } else {
                warn!("⚠️ Erro ao testar porta 3847: {}", e);
            }
        }
    }
}
