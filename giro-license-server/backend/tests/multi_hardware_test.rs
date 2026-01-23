use giro_license_server::config::Settings;
use giro_license_server::models::{PlanType, LicenseStatus};
use giro_license_server::repositories::{AdminRepository, LicenseRepository};
use giro_license_server::state::AppState;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use std::time::Duration;
use uuid::Uuid;

async fn setup_test_state() -> AppState {
    let settings = Settings::from_env().expect("Failed to load settings");
    
    let db = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&settings.database.url)
        .await
        .expect("Failed to connect to test DB");

    // Redis
    let redis_client = redis::Client::open(settings.redis.url.as_str())
        .expect("Failed to create Redis client");
    let redis = redis::aio::ConnectionManager::new(redis_client)
        .await
        .expect("Failed to connect to Redis");

    AppState {
        db,
        redis,
        settings: Arc::new(settings),
    }
}

#[tokio::test]
async fn test_multi_hardware_activation_flow() {
    let state = setup_test_state().await;
    let license_service = state.license_service();
    
    // 1. Create a dummy admin for testing
    let admin_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO admins (id, email, password_hash, name) VALUES ($1, $2, $3, $4)",
        admin_id,
        format!("test-{}@example.com", admin_id),
        "hash",
        "Test Admin"
    ).execute(&state.db).await.expect("Failed to create test admin");

    // 2. Create a license with max_hardware = 2
    let license_key = format!("GIRO-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    // GIRO- (5) + 8 = 13 chars. Safe.
    let r = sqlx::query!(
        r#"
        INSERT INTO licenses (id, license_key, admin_id, plan_type, status, max_hardware)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
            id, license_key, admin_id, hardware_id,
            plan_type as "plan_type: PlanType", status as "status: LicenseStatus",
            activated_at, expires_at, last_validated, support_expires_at,
            COALESCE(can_offline, false) as "can_offline!", offline_activated_at,
            validation_count as "validation_count!", 
            COALESCE(max_hardware, 1) as "max_hardware!",
            created_at as "created_at!", updated_at as "updated_at!"
        "#,
        Uuid::new_v4(),
        license_key,
        admin_id,
        PlanType::Monthly as PlanType,
        LicenseStatus::Pending as LicenseStatus,
        2 // Max 2 hardware
    ).fetch_one(&state.db).await.expect("Failed to create test license");

    let license = giro_license_server::models::License {
        id: r.id,
        license_key: r.license_key,
        admin_id: r.admin_id,
        hardware_id: r.hardware_id,
        plan_type: r.plan_type,
        status: r.status,
        activated_at: r.activated_at,
        expires_at: r.expires_at,
        last_validated: r.last_validated,
        support_expires_at: r.support_expires_at,
        can_offline: Some(r.can_offline),
        offline_activated_at: r.offline_activated_at,
        validation_count: r.validation_count,
        max_hardware: r.max_hardware,
        created_at: r.created_at,
        updated_at: r.updated_at,
        hardware: Vec::new(),
    };

    // 3. Activate on Hardware A
    let hw_a = "hardware-fingerprint-a".to_string();
    let res_a = license_service.activate(
        &license_key,
        &hw_a,
        Some("Machine A"),
        None,
        None,
        None
    ).await.expect("Activation A failed");
    
    assert_eq!(res_a.status, LicenseStatus::Active);

    // 4. Activate on Hardware A again (Re-activation should succeed and NOT use new slot)
    let res_a_rev = license_service.activate(
        &license_key,
        &hw_a,
        Some("Machine A Modified"),
        None,
        None,
        None
    ).await.expect("Re-activation A failed");
    
    assert_eq!(res_a_rev.status, LicenseStatus::Active);

    // 5. Activate on Hardware B
    let hw_b = "hardware-fingerprint-b".to_string();
    let res_b = license_service.activate(
        &license_key,
        &hw_b,
        Some("Machine B"),
        None,
        None,
        None
    ).await.expect("Activation B failed");
    
    assert_eq!(res_b.status, LicenseStatus::Active);

    // 6. Attempt to activate on Hardware C (Limit reached)
    let hw_c = "hardware-fingerprint-c".to_string();
    let res_c = license_service.activate(
        &license_key,
        &hw_c,
        Some("Machine C"),
        None,
        None,
        None
    ).await;

    assert!(res_c.is_err(), "Activation C should have failed due to limit");
    let err_msg = format!("{}", res_c.unwrap_err());
    assert!(err_msg.contains("Limite de dispositivos atingido"), "Error message should mention limit");

    // 7. Validate Hardware B
    let val_b = license_service.validate(
        &license_key,
        &hw_b,
        chrono::Utc::now(),
        None
    ).await.expect("Validation B failed");

    assert!(val_b.valid);
    assert!(val_b.has_admin, "Has admin should be true because we gave a name during admin creation");

    // Cleanup
    sqlx::query!("DELETE FROM license_hardware WHERE license_id = $1", license.id).execute(&state.db).await.ok();
    sqlx::query!("DELETE FROM licenses WHERE id = $1", license.id).execute(&state.db).await.ok();
    sqlx::query!("DELETE FROM admins WHERE id = $1", admin_id).execute(&state.db).await.ok();
}

#[tokio::test]
async fn test_license_admin_sync_and_listing() {
    let state = setup_test_state().await;
    let license_service = state.license_service();
    let license_repo = LicenseRepository::new(state.db.clone());
    
    // 1. Create admin
    let admin_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO admins (id, email, password_hash, name) VALUES ($1, $2, $3, $4)",
        admin_id,
        format!("list-{}@example.com", admin_id),
        "hash",
        "" // No name initially
    ).execute(&state.db).await.expect("Failed to create test admin");

    // 2. Create license
    let license_key = format!("LIST-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let r = sqlx::query!(
        "INSERT INTO licenses (id, license_key, admin_id, plan_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        Uuid::new_v4(),
        license_key,
        admin_id,
        PlanType::Lifetime as PlanType,
        LicenseStatus::Active as LicenseStatus
    ).fetch_one(&state.db).await.expect("Failed to create license");

    // 3. Test profile status (checked by seeing if name is empty)
    let admin_repo = AdminRepository::new(state.db.clone());
    let admin_initial = admin_repo.find_by_id(admin_id).await.expect("Failed to find admin").expect("Admin not found");
    assert!(admin_initial.name.is_empty());

    // 4. Update admin data via service
    license_service.update_license_admin(&license_key, &giro_license_server::dto::license::UpdateLicenseAdminRequest {
        name: "Synced Admin".to_string(),
        email: "synced@example.com".to_string(),
        phone: "12345678".to_string(),
        pin: "1234".to_string(),
    }).await.expect("Failed to sync admin");

    // 5. Test profile status after sync
    let admin_after = admin_repo.find_by_id(admin_id).await.expect("Failed to find admin").expect("Admin not found");
    assert_eq!(admin_after.name, "Synced Admin");

    // 6. Test listing
    let list = license_repo.list_by_admin(admin_id, None, 10, 0).await.expect("Failed to list licenses");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].license_key, license_key);

    // 7. Test stats
    let stats = license_service.get_stats(admin_id).await.expect("Failed to get stats");
    assert_eq!(stats.active, 1);

    // Cleanup
    sqlx::query!("DELETE FROM licenses WHERE id = $1", r.id).execute(&state.db).await.ok();
    sqlx::query!("DELETE FROM admins WHERE id = $1", admin_id).execute(&state.db).await.ok();
}

#[tokio::test]
async fn test_license_status_constraints() {
    let state = setup_test_state().await;
    let license_service = state.license_service();
    
    let admin_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO admins (id, email, password_hash, name) VALUES ($1, $2, $3, $4)",
        admin_id,
        format!("status-{}@example.com", admin_id),
        "hash",
        "Status Admin"
    ).execute(&state.db).await.expect("Failed to create admin");

    // 1. Expired License
    let expired_key = format!("EXP-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    sqlx::query!(
        "INSERT INTO licenses (id, license_key, admin_id, plan_type, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6)",
        Uuid::new_v4(),
        expired_key,
        admin_id,
        PlanType::Monthly as PlanType,
        LicenseStatus::Active as LicenseStatus,
        chrono::Utc::now() - chrono::Duration::days(1)
    ).execute(&state.db).await.expect("Failed to create expired license");

    // Must bind to hardware to avoid HardwareMismatch before Expiration check in some flows
    let hw_exp = "hw-expired";
    sqlx::query!(
        "INSERT INTO license_hardware (license_id, hardware_id, machine_name) VALUES ((SELECT id FROM licenses WHERE license_key = $1), $2, $3)",
        expired_key,
        hw_exp,
        "Machine Expired"
    ).execute(&state.db).await.expect("Failed to bind hardware");

    let val_exp = license_service.validate(&expired_key, hw_exp, chrono::Utc::now(), None).await.expect("Validation failed");
    assert!(!val_exp.valid, "Expired license should be invalid");

    // 2. Suspended License
    let suspended_key = format!("SUS-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    sqlx::query!(
        "INSERT INTO licenses (id, license_key, admin_id, plan_type, status) VALUES ($1, $2, $3, $4, $5)",
        Uuid::new_v4(),
        suspended_key,
        admin_id,
        PlanType::Monthly as PlanType,
        LicenseStatus::Suspended as LicenseStatus
    ).execute(&state.db).await.expect("Failed to create suspended license");

    let hw_sus = "hw-suspended";
    sqlx::query!(
        "INSERT INTO license_hardware (license_id, hardware_id, machine_name) VALUES ((SELECT id FROM licenses WHERE license_key = $1), $2, $3)",
        suspended_key,
        hw_sus,
        "Machine Suspended"
    ).execute(&state.db).await.expect("Failed to bind hardware");

    let val_sus = license_service.validate(&suspended_key, hw_sus, chrono::Utc::now(), None).await.expect("Validation failed");
    assert!(!val_sus.valid, "Suspended license should be invalid");

    sqlx::query!("DELETE FROM licenses WHERE admin_id = $1", admin_id).execute(&state.db).await.ok();
    sqlx::query!("DELETE FROM admins WHERE id = $1", admin_id).execute(&state.db).await.ok();
}

#[tokio::test]
async fn test_license_lifecycle_operations() {
    let state = setup_test_state().await;
    let license_service = state.license_service();
    
    let admin_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO admins (id, email, password_hash, name) VALUES ($1, $2, $3, $4)",
        admin_id,
        format!("life-{}@example.com", admin_id),
        "hash",
        "Life Admin"
    ).execute(&state.db).await.expect("Failed to create admin");

    let license_key = format!("LIFE-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    sqlx::query!(
        "INSERT INTO licenses (id, license_key, admin_id, plan_type, status) VALUES ($1, $2, $3, $4, $5)",
        Uuid::new_v4(),
        license_key,
        admin_id,
        PlanType::Annual as PlanType,
        LicenseStatus::Active as LicenseStatus
    ).execute(&state.db).await.expect("Failed to create license");

    let hw_id = "hw-lifecycle";
    
    // 1. Activate
    license_service.activate(&license_key, hw_id, Some("Life Machine"), None, None, None).await.expect("Activation failed");

    // 2. Restore
    let res_restore = license_service.restore(hw_id).await.expect("Restore failed");
    assert!(res_restore.found);
    assert_eq!(res_restore.license_key, Some(license_key.clone()));

    // 3. Transfer (should clear current hardware)
    license_service.transfer(&license_key, admin_id, None).await.expect("Transfer failed");
    
    // Should be able to activate on new hardware now
    let hw_new = "hw-new-life";
    license_service.activate(&license_key, hw_new, Some("New Life Machine"), None, None, None).await.expect("Transfer activation failed");

    // 4. Revoke
    license_service.revoke(&license_key, admin_id, None).await.expect("Revoke failed");
    
    let val_rev = license_service.validate(&license_key, hw_new, chrono::Utc::now(), None).await.expect("Validation failed");
    assert!(!val_rev.valid, "Revoked license should be invalid");

    // Cleanup
    sqlx::query!("DELETE FROM licenses WHERE admin_id = $1", admin_id).execute(&state.db).await.ok();
    sqlx::query!("DELETE FROM admins WHERE id = $1", admin_id).execute(&state.db).await.ok();
}
