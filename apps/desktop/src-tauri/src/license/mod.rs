//! License Module
//!
//! Handles license validation and communication with license server

pub mod client;

pub use client::{
    AdminUserSyncData, LicenseClient, LicenseClientConfig, LicenseInfo, LicenseStatus,
    MetricsPayload, UpdateAdminRequest,
};
