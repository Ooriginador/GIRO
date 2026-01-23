use aws_config::meta::region::RegionProviderChain;
use aws_sdk_s3::Client;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::config::Credentials;
use anyhow::{Result, Context};
use crate::config::settings::S3Settings;

#[derive(Debug, Clone)]
pub struct S3Service {
    client: Option<Client>,
    bucket: String,
    configured: bool,
}

impl S3Service {
    pub async fn new(settings: &S3Settings) -> Self {
        if settings.access_key_id == "not_configured" || settings.secret_access_key == "not_configured" {
            return Self {
                client: None,
                bucket: String::new(),
                configured: false,
            };
        }

        let region_provider = RegionProviderChain::first_try(aws_sdk_s3::config::Region::new(settings.region.clone()));
        
        // Custom credentials if provided, otherwise use default chain
        let credentials = Credentials::new(
            &settings.access_key_id,
            &settings.secret_access_key,
            None,
            None,
            "static",
        );

        let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(region_provider)
            .credentials_provider(credentials)
            .endpoint_url(&settings.endpoint)
            .load()
            .await;

        let client = Client::new(&config);

        Self {
            client: Some(client),
            bucket: settings.bucket.clone(),
            configured: true,
        }
    }

    pub async fn upload(&self, key: &str, body: Vec<u8>) -> Result<()> {
        if !self.configured || self.client.is_none() {
            return Err(anyhow::anyhow!("S3 Service is not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY."));
        }

        let byte_stream = ByteStream::from(body);

        self.client
            .as_ref()
            .unwrap()
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(byte_stream)
            .send()
            .await
            .context("Failed to upload file to S3")?;

        Ok(())
    }

    pub async fn download(&self, key: &str) -> Result<Vec<u8>> {
        if !self.configured || self.client.is_none() {
            return Err(anyhow::anyhow!("S3 Service is not configured."));
        }

        let output = self.client
            .as_ref()
            .unwrap()
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .context("Failed to download file from S3")?;

        let data = output.body.collect().await?.to_vec();
        Ok(data)
    }

    pub async fn delete(&self, key: &str) -> Result<()> {
        if !self.configured || self.client.is_none() {
            return Err(anyhow::anyhow!("S3 Service is not configured."));
        }

        self.client
            .as_ref()
            .unwrap()
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .context("Failed to delete file from S3")?;

        Ok(())
    }
}
