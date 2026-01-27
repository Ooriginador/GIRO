//! License Module
//!
//! Handles license validation and communication with license server

pub mod client;
pub mod sync_client;

pub use client::{
    AdminUserSyncData, ConnectionDiagnostic, LicenseClient, LicenseClientConfig, LicenseInfo,
    LicenseStatus, MetricsPayload, UpdateAdminRequest,
};

pub use sync_client::{
    EntityCount, SyncClient, SyncEntityType, SyncItem, SyncItemResult, SyncItemStatus,
    SyncOperation, SyncPullItem, SyncPullResponse, SyncPushResponse, SyncStatusResponse,
};
