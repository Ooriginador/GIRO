//! Time Utilities
//!
//! Time-related helper functions including drift detection.

use chrono::{DateTime, Duration, Utc};

/// Maximum allowed time drift in seconds (5 minutes)
const MAX_TIME_DRIFT_SECONDS: i64 = 300;

/// Check if client time is within acceptable drift
pub fn check_time_drift(client_time: DateTime<Utc>) -> TimeDriftResult {
    let server_time = Utc::now();
    let drift = (client_time - server_time).num_seconds().abs();

    if drift <= MAX_TIME_DRIFT_SECONDS {
        TimeDriftResult::Ok
    } else {
        TimeDriftResult::Drifted {
            drift_seconds: drift,
            server_time,
            client_time,
        }
    }
}

/// Result of time drift check
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum TimeDriftResult {
    Ok,
    Drifted {
        drift_seconds: i64,
        server_time: DateTime<Utc>,
        client_time: DateTime<Utc>,
    },
}

impl TimeDriftResult {
    #[allow(dead_code)]
    pub fn is_ok(&self) -> bool {
        matches!(self, TimeDriftResult::Ok)
    }
}

/// Calculate expiration date based on plan type
#[allow(dead_code)]
pub fn calculate_expiration(plan_days: i64) -> DateTime<Utc> {
    Utc::now() + Duration::days(plan_days)
}

/// Check if a date is within N days from now
#[allow(dead_code)]
pub fn is_within_days(date: DateTime<Utc>, days: i64) -> bool {
    let now = Utc::now();
    let future = now + Duration::days(days);
    date <= future && date > now
}

/// Calculate days remaining until expiration
pub fn days_remaining(expires_at: DateTime<Utc>) -> i64 {
    let now = Utc::now();
    if expires_at < now {
        0
    } else {
        (expires_at - now).num_days()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_drift_ok() {
        let client_time = Utc::now();
        let result = check_time_drift(client_time);
        assert!(result.is_ok());
    }

    #[test]
    fn test_time_drift_exceeded() {
        let client_time = Utc::now() - Duration::minutes(10);
        let result = check_time_drift(client_time);
        assert!(!result.is_ok());
    }

    #[test]
    fn test_calculate_expiration() {
        let expiration = calculate_expiration(30);
        let days = (expiration - Utc::now()).num_days();
        assert!(days >= 29 && days <= 30);
    }

    #[test]
    fn test_days_remaining() {
        let future = Utc::now() + Duration::days(10);
        let remaining = days_remaining(future);
        assert!(remaining >= 9 && remaining <= 10);

        let past = Utc::now() - Duration::days(1);
        assert_eq!(days_remaining(past), 0);
    }
}
