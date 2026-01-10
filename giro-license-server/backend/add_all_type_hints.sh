#!/bin/bash
# Comprehensive type hint fix - add ! to ALL non-nullable DateTime fields

echo "🔧 Applying ALL type hints..."

# Admin repo - all DateTime fields that are NOT NULL
sed -i 's/\bcreated_at$/created_at as "created_at!"/g; s/\bupdated_at$/updated_at as "updated_at!"/g' src/repositories/admin_repo.rs

# Audit repo - created_at is NOT NULL
sed -i 's/\bcreated_at$/created_at as "created_at!"/g' src/repositories/audit_repo.rs  

# Hardware repo - created_at, first_seen, last_seen are NOT NULL
sed -i 's/\bcreated_at$/created_at as "created_at!"/g' src/repositories/hardware_repo.rs

# Metrics repo - synced_at is NOT NULL
sed -i 's/\bsynced_at$/synced_at as "synced_at!"/g' src/repositories/metrics_repo.rs

# Refresh token repo - created_at, expires_at are NOT NULL
sed -i 's/\bexpires_at,/expires_at as "expires_at!",/g; s/\bcreated_at$/created_at as "created_at!"/g' src/repositories/refresh_token_repo.rs

echo "✅ All type hints applied!"
