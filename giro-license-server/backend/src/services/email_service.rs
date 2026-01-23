//! Email Service
//!
//! Email sending using Resend API.

use crate::errors::{AppError, AppResult};
use serde::{Deserialize, Serialize};

/// Resend API client
pub struct EmailService {
    api_key: String,
    from_email: String,
    from_name: String,
    base_url: String,
    client: reqwest::Client,
}

#[derive(Debug, Serialize)]
struct ResendEmailRequest {
    from: String,
    to: Vec<String>,
    subject: String,
    html: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ResendEmailResponse {
    id: String,
}

#[derive(Debug, Deserialize)]
struct ResendErrorResponse {
    message: String,
}

impl EmailService {
    pub fn new(api_key: String, from_email: String, from_name: String) -> Self {
        Self {
            api_key,
            from_email,
            from_name,
            base_url: "https://api.resend.com".to_string(),
            client: reqwest::Client::new(),
        }
    }

    /// Check if email service is configured
    pub fn is_configured(&self) -> bool {
        !self.api_key.is_empty() && self.api_key != "not_configured"
    }

    /// Send a password reset email
    pub async fn send_password_reset(
        &self,
        to_email: &str,
        to_name: &str,
        reset_token: &str,
        reset_url: &str,
    ) -> AppResult<String> {
        if !self.is_configured() {
            tracing::warn!("Email service not configured, skipping password reset email");
            return Ok("skipped".to_string());
        }

        let full_reset_url = format!("{}?token={}", reset_url, reset_token);

        let html = format!(
            r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; }}
        .header h1 {{ color: white; margin: 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 GIRO License Server</h1>
        </div>
        <div class="content">
            <h2>Olá, {name}!</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="{url}" class="button">Redefinir Senha</a>
            <p><small>Este link expira em <strong>1 hora</strong>.</small></p>
            <p>Se você não solicitou esta alteração, ignore este email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <code>{url}</code>
            </p>
        </div>
        <div class="footer">
            <p>© 2026 GIRO - Sistema de Gestão para Varejo</p>
            <p>Este email foi enviado automaticamente, não responda.</p>
        </div>
    </div>
</body>
</html>
"#,
            name = to_name,
            url = full_reset_url
        );

        let text = format!(
            "Olá {}!\n\nRecebemos uma solicitação para redefinir sua senha.\n\nAcesse o link abaixo para criar uma nova senha:\n{}\n\nEste link expira em 1 hora.\n\nSe você não solicitou esta alteração, ignore este email.\n\n--\nGIRO License Server",
            to_name, full_reset_url
        );

        self.send_email(to_email, "Redefinir Senha - GIRO", &html, Some(&text))
            .await
    }

    /// Send a welcome email
    pub async fn send_welcome(
        &self,
        to_email: &str,
        to_name: &str,
    ) -> AppResult<String> {
        if !self.is_configured() {
            tracing::warn!("Email service not configured, skipping welcome email");
            return Ok("skipped".to_string());
        }

        let html = format!(
            r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; }}
        .header h1 {{ color: white; margin: 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bem-vindo ao GIRO!</h1>
        </div>
        <div class="content">
            <h2>Olá, {name}!</h2>
            <p>Sua conta foi criada com sucesso no <strong>GIRO License Server</strong>.</p>
            <p>Agora você pode:</p>
            <ul>
                <li>✅ Gerenciar suas licenças</li>
                <li>📊 Acompanhar métricas de vendas</li>
                <li>🔧 Configurar múltiplos dispositivos</li>
            </ul>
            <p>Se precisar de ajuda, entre em contato com nosso suporte.</p>
        </div>
        <div class="footer">
            <p>© 2026 GIRO - Sistema de Gestão para Varejo</p>
        </div>
    </div>
</body>
</html>
"#,
            name = to_name
        );

        self.send_email(to_email, "Bem-vindo ao GIRO!", &html, None)
            .await
    }

    /// Send license expiring notification
    pub async fn send_license_expiring(
        &self,
        to_email: &str,
        to_name: &str,
        license_key: &str,
        days_remaining: i32,
    ) -> AppResult<String> {
        if !self.is_configured() {
            return Ok("skipped".to_string());
        }

        let html = format!(
            r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; }}
        .header h1 {{ color: white; margin: 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .alert {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }}
        .button {{ display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Licença Expirando</h1>
        </div>
        <div class="content">
            <h2>Olá, {name}!</h2>
            <div class="alert">
                <strong>Sua licença expira em {days} dias!</strong>
            </div>
            <p>Licença: <code>{license}</code></p>
            <p>Renove agora para não perder acesso ao sistema.</p>
            <a href="https://giro-website-production.up.railway.app/#precos" class="button">Renovar Licença</a>
        </div>
        <div class="footer">
            <p>© 2026 GIRO - Sistema de Gestão para Varejo</p>
        </div>
    </div>
</body>
</html>
"#,
            name = to_name,
            days = days_remaining,
            license = license_key
        );

        self.send_email(
            to_email,
            &format!("⚠️ Sua licença GIRO expira em {} dias", days_remaining),
            &html,
            None,
        )
        .await
    }

    /// Send a license issued email
    pub async fn send_license_issued(
        &self,
        to_email: &str,
        to_name: &str,
        license_key: &str,
    ) -> AppResult<String> {
        if !self.is_configured() {
            tracing::warn!("Email service not configured, skipping license issued email");
            return Ok("skipped".to_string());
        }

        let html = format!(
            r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0; }}
        .header h1 {{ color: white; margin: 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .key-box {{ background: #ffffff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
        .key {{ font-family: monospace; font-size: 24px; font-weight: bold; color: #1e40af; letter-spacing: 2px; }}
        .button {{ display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Sua Licença Chegou!</h1>
        </div>
        <div class="content">
            <h2>Olá, {name}!</h2>
            <p>Seu pagamento foi confirmado e sua licença do <strong>GIRO PDV</strong> já está disponível.</p>
            
            <div class="key-box">
                <p style="margin-top: 0; color: #6b7280;">Sua Chave de Licença:</p>
                <div class="key">{key}</div>
            </div>

            <p><strong>Como ativar?</strong></p>
            <ol>
                <li>Abra o aplicativo GIRO no seu computador.</li>
                <li>Insira a chave acima na tela de ativação.</li>
                <li>Pronto! Seu sistema estará liberado para uso.</li>
            </ol>

            <a href="https://giro-website-production.up.railway.app/downloads" class="button">Baixar Aplicativo</a>
            
            <p>Guarde este email em local seguro. Cada ativação é vinculada ao hardware do seu computador.</p>
        </div>
        <div class="footer">
            <p>© 2026 GIRO - Sistema de Gestão para Varejo</p>
            <p>Se precisar de suporte, responda a este email.</p>
        </div>
    </div>
</body>
</html>
"#,
            name = to_name,
            key = license_key
        );

        let text = format!(
            "Olá {}!\n\nSeu pagamento foi confirmado. Sua chave de licença GIRO PDV é:\n\n{}\n\nInsira esta chave no aplicativo para ativar seu sistema.\n\nAtenciosamente,\nEquipe GIRO",
            to_name, license_key
        );

        self.send_email(to_email, "Sua Licença GIRO Chegou! 🎫", &html, Some(&text))
            .await
    }

    /// Generic email sending method
    async fn send_email(
        &self,
        to: &str,
        subject: &str,
        html: &str,
        text: Option<&str>,
    ) -> AppResult<String> {
        let from = format!("{} <{}>", self.from_name, self.from_email);

        let request = ResendEmailRequest {
            from,
            to: vec![to.to_string()],
            subject: subject.to_string(),
            html: html.to_string(),
            text: text.map(|s| s.to_string()),
        };

        let response = self
            .client
            .post(format!("{}/emails", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to send email: {}", e)))?;

        if response.status().is_success() {
            let result: ResendEmailResponse = response
                .json()
                .await
                .map_err(|e| AppError::Internal(format!("Failed to parse Resend response: {}", e)))?;

            tracing::info!("📧 Email sent successfully: {} to {}", result.id, to);
            Ok(result.id)
        } else {
            let error: ResendErrorResponse = response
                .json()
                .await
                .unwrap_or(ResendErrorResponse {
                    message: "Unknown error".to_string(),
                });

            tracing::error!("📧 Failed to send email to {}: {}", to, error.message);
            Err(AppError::Internal(format!(
                "Failed to send email: {}",
                error.message
            )))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_service_not_configured() {
        let service = EmailService::new(
            "not_configured".to_string(),
            "test@example.com".to_string(),
            "Test".to_string(),
        );
        assert!(!service.is_configured());
    }

    #[test]
    fn test_email_service_configured() {
        let service = EmailService::new(
            "re_123456789".to_string(),
            "noreply@arkheion-tiktrend.com.br".to_string(),
            "GIRO".to_string(),
        );
        assert!(service.is_configured());
    }
}
