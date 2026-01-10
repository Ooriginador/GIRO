//! Serviço de Backup - Google Drive com Criptografia
//!
//! Funcionalidades:
//! - OAuth2 com Google
//! - Criptografia AES-256-GCM antes do upload
//! - Upload/Download para Google Drive
//! - Agendamento de backups automáticos

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tokio::fs;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

/// Configuração do backup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub enabled: bool,
    pub auto_backup: bool,
    pub backup_interval_hours: u32,
    pub keep_local_copies: u32,
    pub encrypt: bool,
    pub google_drive_enabled: bool,
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            auto_backup: true,
            backup_interval_hours: 24,
            keep_local_copies: 7,
            encrypt: true,
            google_drive_enabled: false,
        }
    }
}

/// Credenciais OAuth2 do Google
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleCredentials {
    pub client_id: String,
    pub client_secret: String,
    pub refresh_token: Option<String>,
    pub access_token: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

/// Metadados do backup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub id: String,
    pub filename: String,
    pub size_bytes: u64,
    pub created_at: DateTime<Utc>,
    pub encrypted: bool,
    pub drive_file_id: Option<String>,
    pub checksum: String,
}

/// Status do backup
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BackupStatus {
    Idle,
    InProgress,
    Completed,
    Failed,
}

/// Resultado de operação de backup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupResult {
    pub success: bool,
    pub metadata: Option<BackupMetadata>,
    pub error: Option<String>,
}

// ════════════════════════════════════════════════════════════════════════════
// CRIPTOGRAFIA
// ════════════════════════════════════════════════════════════════════════════

/// Deriva uma chave de 256 bits a partir de uma senha
pub fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.update(salt);
    let result = hasher.finalize();

    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Criptografa dados com AES-256-GCM
pub fn encrypt_data(data: &[u8], password: &str) -> Result<Vec<u8>, String> {
    // Gera salt e nonce aleatórios
    let salt: [u8; 16] = rand_bytes();
    let nonce_bytes: [u8; 12] = rand_bytes();

    let key = derive_key(password, &salt);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Erro ao criar cipher: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| format!("Erro ao criptografar: {}", e))?;

    // Formato: salt (16) + nonce (12) + ciphertext
    let mut result = Vec::with_capacity(16 + 12 + ciphertext.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Descriptografa dados com AES-256-GCM
pub fn decrypt_data(encrypted: &[u8], password: &str) -> Result<Vec<u8>, String> {
    if encrypted.len() < 28 {
        return Err("Dados criptografados inválidos".to_string());
    }

    let salt = &encrypted[0..16];
    let nonce_bytes = &encrypted[16..28];
    let ciphertext = &encrypted[28..];

    let key = derive_key(password, salt);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Erro ao criar cipher: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Erro ao descriptografar: {}", e))
}

/// Gera bytes aleatórios (usando timestamp + counter como fallback simples)
fn rand_bytes<const N: usize>() -> [u8; N] {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();

    let mut result = [0u8; N];
    for (i, byte) in result.iter_mut().enumerate() {
        *byte = ((now >> (i * 8)) & 0xFF) as u8 ^ (i as u8).wrapping_mul(17);
    }
    result
}

/// Calcula checksum SHA-256
pub fn calculate_checksum(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    hex_encode(&result)
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn parse_backup_created_at(filename: &str) -> Option<DateTime<Utc>> {
    // Formato gerado em create_backup: backup_%Y%m%d_%H%M%S.(db|db.enc)
    let without_prefix = filename.strip_prefix("backup_")?;
    let timestamp_str = without_prefix.split('.').next()?;
    let naive = NaiveDateTime::parse_from_str(timestamp_str, "%Y%m%d_%H%M%S").ok()?;
    Some(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc))
}

// ════════════════════════════════════════════════════════════════════════════
// SERVIÇO DE BACKUP
// ════════════════════════════════════════════════════════════════════════════

/// Serviço principal de backup
pub struct BackupService {
    config: BackupConfig,
    backup_dir: PathBuf,
    credentials: Option<GoogleCredentials>,
}

impl BackupService {
    /// Cria nova instância do serviço
    pub fn new(backup_dir: PathBuf, config: BackupConfig) -> Self {
        Self {
            config,
            backup_dir,
            credentials: None,
        }
    }

    /// Define credenciais do Google
    pub fn set_google_credentials(&mut self, credentials: GoogleCredentials) {
        self.credentials = Some(credentials);
    }

    /// Cria backup do banco de dados
    pub async fn create_backup(&self, db_path: &PathBuf, password: Option<&str>) -> BackupResult {
        // Lê o arquivo do banco
        let data = match fs::read(db_path).await {
            Ok(d) => d,
            Err(e) => {
                return BackupResult {
                    success: false,
                    metadata: None,
                    error: Some(format!("Erro ao ler banco de dados: {}", e)),
                }
            }
        };

        // Criptografa se necessário
        let (final_data, encrypted) = if self.config.encrypt {
            let pwd = password.unwrap_or("giro-default-key");
            match encrypt_data(&data, pwd) {
                Ok(encrypted_data) => (encrypted_data, true),
                Err(e) => {
                    return BackupResult {
                        success: false,
                        metadata: None,
                        error: Some(format!("Erro ao criptografar: {}", e)),
                    }
                }
            }
        } else {
            (data, false)
        };

        // Gera nome do arquivo
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let extension = if encrypted { "db.enc" } else { "db" };
        let filename = format!("backup_{}.{}", timestamp, extension);
        let backup_path = self.backup_dir.join(&filename);

        // Cria diretório se não existir
        if let Err(e) = fs::create_dir_all(&self.backup_dir).await {
            return BackupResult {
                success: false,
                metadata: None,
                error: Some(format!("Erro ao criar diretório: {}", e)),
            };
        }

        // Salva arquivo
        if let Err(e) = fs::write(&backup_path, &final_data).await {
            return BackupResult {
                success: false,
                metadata: None,
                error: Some(format!("Erro ao salvar backup: {}", e)),
            };
        }

        let metadata = BackupMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            filename,
            size_bytes: final_data.len() as u64,
            created_at: Utc::now(),
            encrypted,
            drive_file_id: None,
            checksum: calculate_checksum(&final_data),
        };

        BackupResult {
            success: true,
            metadata: Some(metadata),
            error: None,
        }
    }

    /// Restaura backup
    pub async fn restore_backup(
        &self,
        backup_path: &PathBuf,
        target_path: &PathBuf,
        password: Option<&str>,
    ) -> Result<(), String> {
        let data = fs::read(backup_path)
            .await
            .map_err(|e| format!("Erro ao ler backup: {}", e))?;

        // Verifica se está criptografado pela extensão
        let is_encrypted = backup_path
            .extension()
            .map(|ext| ext == "enc")
            .unwrap_or(false);

        let final_data = if is_encrypted {
            let pwd = password.unwrap_or("giro-default-key");
            decrypt_data(&data, pwd)?
        } else {
            data
        };

        fs::write(target_path, &final_data)
            .await
            .map_err(|e| format!("Erro ao restaurar: {}", e))?;

        Ok(())
    }

    /// Lista backups locais
    pub async fn list_backups(&self) -> Result<Vec<BackupMetadata>, String> {
        let mut backups = Vec::new();

        let mut entries = fs::read_dir(&self.backup_dir)
            .await
            .map_err(|e| format!("Erro ao listar diretório: {}", e))?;

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                if filename.starts_with("backup_") {
                    let metadata = fs::metadata(&path).await.ok();
                    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    let encrypted = filename.ends_with(".enc");
                    let created_at = parse_backup_created_at(filename)
                        .or_else(|| {
                            metadata
                                .as_ref()
                                .and_then(|m| m.modified().ok())
                                .map(DateTime::<Utc>::from)
                        })
                        .unwrap_or_else(Utc::now);

                    backups.push(BackupMetadata {
                        id: uuid::Uuid::new_v4().to_string(),
                        filename: filename.to_string(),
                        size_bytes: size,
                        created_at,
                        encrypted,
                        drive_file_id: None,
                        checksum: String::new(),
                    });
                }
            }
        }

        backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(backups)
    }

    /// Limpa backups antigos mantendo apenas os N mais recentes
    pub async fn cleanup_old_backups(&self) -> Result<u32, String> {
        let backups = self.list_backups().await?;
        let keep = self.config.keep_local_copies as usize;

        if backups.len() <= keep {
            return Ok(0);
        }

        let mut deleted = 0;
        for backup in backups.iter().skip(keep) {
            let path = self.backup_dir.join(&backup.filename);
            if fs::remove_file(&path).await.is_ok() {
                deleted += 1;
            }
        }

        Ok(deleted)
    }

    // ════════════════════════════════════════════════════════════════════════
    // GOOGLE DRIVE (OAuth2 + Upload/Download)
    // ════════════════════════════════════════════════════════════════════════

    /// Gera URL de autorização OAuth2
    pub fn get_auth_url(&self) -> Option<String> {
        let creds = self.credentials.as_ref()?;

        Some(format!(
            "https://accounts.google.com/o/oauth2/v2/auth?\
            client_id={}&\
            redirect_uri=urn:ietf:wg:oauth:2.0:oob&\
            response_type=code&\
            scope=https://www.googleapis.com/auth/drive.file&\
            access_type=offline",
            creds.client_id
        ))
    }

    /// Troca código de autorização por tokens
    pub async fn exchange_code(&mut self, code: &str) -> Result<(), String> {
        let creds = self
            .credentials
            .as_mut()
            .ok_or("Credenciais não configuradas")?;

        let client = reqwest::Client::new();
        let response = client
            .post("https://oauth2.googleapis.com/token")
            .form(&[
                ("client_id", creds.client_id.as_str()),
                ("client_secret", creds.client_secret.as_str()),
                ("code", code),
                ("grant_type", "authorization_code"),
                ("redirect_uri", "urn:ietf:wg:oauth:2.0:oob"),
            ])
            .send()
            .await
            .map_err(|e| format!("Erro na requisição: {}", e))?;

        #[derive(Deserialize)]
        struct TokenResponse {
            access_token: String,
            refresh_token: Option<String>,
            expires_in: i64,
        }

        let token: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Erro ao parsear resposta: {}", e))?;

        creds.access_token = Some(token.access_token);
        creds.refresh_token = token.refresh_token.or(creds.refresh_token.take());
        creds.expires_at = Some(Utc::now() + chrono::Duration::seconds(token.expires_in));

        Ok(())
    }

    /// Faz upload do backup para o Google Drive
    pub async fn upload_to_drive(&self, backup_path: &PathBuf) -> Result<String, String> {
        let creds = self
            .credentials
            .as_ref()
            .ok_or("Credenciais não configuradas")?;
        let token = creds
            .access_token
            .as_ref()
            .ok_or("Token de acesso não disponível")?;

        let data = fs::read(backup_path)
            .await
            .map_err(|e| format!("Erro ao ler arquivo: {}", e))?;

        let filename = backup_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("backup.db");

        let metadata = serde_json::json!({
            "name": filename,
            "parents": ["appDataFolder"]
        });

        let client = reqwest::Client::new();
        let response = client
            .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
            .bearer_auth(token)
            .header(
                "Content-Type",
                "multipart/related; boundary=backup_boundary",
            )
            .body(
                format!(
                    "--backup_boundary\r\n\
                Content-Type: application/json; charset=UTF-8\r\n\r\n\
                {}\r\n\
                --backup_boundary\r\n\
                Content-Type: application/octet-stream\r\n\r\n",
                    metadata
                ) + &String::from_utf8_lossy(&data)
                    + "\r\n--backup_boundary--",
            )
            .send()
            .await
            .map_err(|e| format!("Erro no upload: {}", e))?;

        #[derive(Deserialize)]
        struct DriveFile {
            id: String,
        }

        let file: DriveFile = response
            .json()
            .await
            .map_err(|e| format!("Erro ao parsear resposta: {}", e))?;

        Ok(file.id)
    }

    /// Lista backups no Google Drive
    pub async fn list_drive_backups(&self) -> Result<Vec<BackupMetadata>, String> {
        let creds = self
            .credentials
            .as_ref()
            .ok_or("Credenciais não configuradas")?;
        let token = creds
            .access_token
            .as_ref()
            .ok_or("Token de acesso não disponível")?;

        let client = reqwest::Client::new();
        let response = client
            .get("https://www.googleapis.com/drive/v3/files")
            .bearer_auth(token)
            .query(&[
                ("spaces", "appDataFolder"),
                ("fields", "files(id,name,size,createdTime)"),
            ])
            .send()
            .await
            .map_err(|e| format!("Erro na listagem: {}", e))?;

        #[derive(Deserialize)]
        struct DriveFiles {
            files: Vec<DriveFileInfo>,
        }
        #[derive(Deserialize)]
        struct DriveFileInfo {
            id: String,
            name: String,
            size: Option<String>,
            #[serde(rename = "createdTime")]
            created_time: Option<String>,
        }

        let files: DriveFiles = response
            .json()
            .await
            .map_err(|e| format!("Erro ao parsear resposta: {}", e))?;

        Ok(files
            .files
            .into_iter()
            .map(|f| BackupMetadata {
                id: f.id.clone(),
                filename: f.name,
                size_bytes: f.size.and_then(|s| s.parse().ok()).unwrap_or(0),
                created_at: f
                    .created_time
                    .and_then(|t| DateTime::parse_from_rfc3339(&t).ok())
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(Utc::now),
                encrypted: true,
                drive_file_id: Some(f.id),
                checksum: String::new(),
            })
            .collect())
    }

    /// Baixa backup do Google Drive
    pub async fn download_from_drive(
        &self,
        file_id: &str,
        target_path: &PathBuf,
    ) -> Result<(), String> {
        let creds = self
            .credentials
            .as_ref()
            .ok_or("Credenciais não configuradas")?;
        let token = creds
            .access_token
            .as_ref()
            .ok_or("Token de acesso não disponível")?;

        let client = reqwest::Client::new();
        let response = client
            .get(format!(
                "https://www.googleapis.com/drive/v3/files/{}?alt=media",
                file_id
            ))
            .bearer_auth(token)
            .send()
            .await
            .map_err(|e| format!("Erro no download: {}", e))?;

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Erro ao ler bytes: {}", e))?;

        fs::write(target_path, &bytes)
            .await
            .map_err(|e| format!("Erro ao salvar arquivo: {}", e))?;

        Ok(())
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTES
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let original = b"Sensitive database data";
        let password = "minha-senha-secreta";

        let encrypted = encrypt_data(original, password).unwrap();
        assert_ne!(encrypted, original);

        let decrypted = decrypt_data(&encrypted, password).unwrap();
        assert_eq!(decrypted, original);
    }

    #[test]
    fn test_checksum() {
        let data = b"test data";
        let checksum = calculate_checksum(data);
        assert_eq!(checksum.len(), 64); // SHA-256 = 32 bytes = 64 hex chars
    }

    #[test]
    fn test_derive_key() {
        let key1 = derive_key("password", b"salt1");
        let key2 = derive_key("password", b"salt2");
        assert_ne!(key1, key2);
    }
}
