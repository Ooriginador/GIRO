use giro_license_server::config::Settings;
// use giro_license_server::services::LicenseService;
use giro_license_server::models::{PlanType, LicenseStatus};
use giro_license_server::state::AppState;
use giro_license_server::repositories::{AdminRepository, LicenseRepository};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use std::time::Duration;
use uuid::Uuid;
use chrono::{Utc, Duration as ChronoDuration};

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
async fn test_full_license_ecosystem_flow() {
    let state = setup_test_state().await;
    let license_service = state.license_service();
    let license_repo = LicenseRepository::new(state.db.clone());
    let admin_repo = AdminRepository::new(state.db.clone());

    // 1. Setup Admin
    let admin = admin_repo.create(
        &format!("flow-{}@test.com", Uuid::new_v4()),
        "hash",
        "Flow Admin",
        None,
        Some("Test Corp")
    ).await.expect("Failed to create admin");
    let admin_id = admin.id;

    // 2. Bulk Creation
    let licenses = license_service.create_licenses(admin_id, PlanType::Monthly, 2).await.expect("Failed to create licenses");
    assert_eq!(licenses.len(), 2);
    let l1_key = &licenses[0].license_key;
    let _l2_key = &licenses[1].license_key;

    // 3. Ownership Check (Negative)
    let other_admin = Uuid::new_v4();
    let err_ownership = license_service.get_license_details(l1_key, other_admin).await;
    assert!(err_ownership.is_err(), "Accessing license of another admin should fail");

    // 4. Details Retrieval (No Hardware)
    let details = license_service.get_license_details(l1_key, admin_id).await.expect("Failed to get details");
    assert_eq!(details.hardware.len(), 0);

    // 5. Activation Flow Hardware A
    let hw_a = "flow-hw-a";
    license_service.activate(l1_key, hw_a, Some("Machine A"), None, None, None).await.expect("Activation A failed");

    // 6. Same Hardware Re-activation
    let res_react = license_service.activate(l1_key, hw_a, Some("Machine A Renamed"), None, None, None).await.expect("Re-activation failed");
    assert!(res_react.message.contains("já está ativa"));
    assert!(res_react.has_admin, "Has admin should be true because name is set");

    // 7. Validation with Time Drift (Manual creation if utility is hard to mock)
    // We can't easily mock `Utc::now()` in `check_time_drift` without a library, 
    // but we can pass a drifted time to `validate` parameter.
    let drifted_time = Utc::now() - ChronoDuration::minutes(10);
    let res_drift = license_service.validate(l1_key, hw_a, drifted_time, None).await;
    assert!(res_drift.is_err(), "Drifted time should trigger error");

    // 8. Validation Success
    let res_valid = license_service.validate(l1_key, hw_a, Utc::now(), None).await.expect("Validation failed");
    assert!(res_valid.valid);

    // 9. Status Constraints: Suspend -> Validate
    sqlx::query!("UPDATE licenses SET status = 'suspended' WHERE license_key = $1", l1_key).execute(&state.db).await.expect("Failed to suspend");
    let res_sus = license_service.validate(l1_key, hw_a, Utc::now(), None).await.expect("Validation failed");
    assert!(!res_sus.valid, "Suspended license should report invalid");
    assert_eq!(res_sus.message, "Licença suspensa");

    // 10. Status Constraints: Expired -> Validate
    sqlx::query!("UPDATE licenses SET status = 'active', expires_at = $2 WHERE license_key = $1", l1_key, Utc::now() - ChronoDuration::hours(1)).execute(&state.db).await.expect("Failed to expire");
    let res_exp = license_service.validate(l1_key, hw_a, Utc::now(), None).await.expect("Validation failed");
    assert!(!res_exp.valid, "Expired license should report invalid");
    assert_eq!(res_exp.message, "Licença expirada");

    // 11. Pagination & Filtering
    let (list, total) = license_service.list_licenses(admin_id, Some(LicenseStatus::Active), 1, 10).await.expect("List failed");
    // L1 is active (status updated back to active but expired), L2 is pending.
    assert_eq!(total, 1); 
    assert_eq!(list.len(), 1);

    // 12. Stats
    let stats = license_service.get_stats(admin_id).await.expect("Stats failed");
    assert_eq!(stats.total, 2);
    assert_eq!(stats.active, 1);
    assert_eq!(stats.pending, 1);

    // 13. Enable Offline Mode
    let l_updated = license_repo.enable_offline_mode(licenses[0].id).await.expect("Enable offline failed");
    assert!(l_updated.can_offline.unwrap_or(false));

    // 14. Support Expiration (Lifetime)
    let l_lifetime_key = format!("LIFE-{}", &Uuid::new_v4().to_string()[..8].to_uppercase());
    sqlx::query!(
        "INSERT INTO licenses (id, license_key, admin_id, plan_type, status) VALUES ($1, $2, $3, $4, $5)",
        Uuid::new_v4(), l_lifetime_key, admin_id, PlanType::Lifetime as PlanType, LicenseStatus::Pending as LicenseStatus
    ).execute(&state.db).await.expect("Failed to create lifetime license");

    let res_life = license_service.activate(&l_lifetime_key, "hw-life", None, None, None, None).await.expect("Lifetime activation failed");
    assert!(res_life.is_lifetime);
    assert!(res_life.expires_at.is_none());
    assert!(res_life.support_expires_at.is_some());

    // 15. Count Expiring
    let count_exp = license_repo.count_expiring(admin_id, (Utc::now() + ChronoDuration::days(31)).date_naive()).await.expect("Expiring count failed");
    // L1 is expired (already passed its date), so it should count if it's within 31 days or already passed?
    // SQL is: expires_at::date <= $2 AND status = 'active'
    // L1 is status='active' and expired_at < now, so yes.
    assert_eq!(count_exp, 1);

    // Cleanup
    sqlx::query!("DELETE FROM license_hardware WHERE license_id IN (SELECT id FROM licenses WHERE admin_id = $1)", admin_id).execute(&state.db).await.ok();
    sqlx::query!("DELETE FROM licenses WHERE admin_id = $1", admin_id).execute(&state.db).await.ok();
    sqlx::query!("DELETE FROM admins WHERE id = $1", admin_id).execute(&state.db).await.ok();
}
