//! License Module
//!
//! Handles license validation and communication with license server

pub mod client;

pub use client::{LicenseClient, LicenseClientConfig, LicenseInfo, LicenseStatus, MetricsPayload};
