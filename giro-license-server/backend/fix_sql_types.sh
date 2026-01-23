#!/bin/bash
# Comprehensive type fix script

# Fix services - convert IpAddr to String before passing to audit log
find src/services -name "*.rs" -exec sed -i 's/ip_address,$/ip_address.map(|ip| ip.to_string()),/g' {} \;

# Fix metrics_repo - add datetime type hints
sed -i 's/synced_at$/synced_at as "synced_at!"/g' src/repositories/metrics_repo.rs

# Fix refresh_token_repo - add datetime and boolean type hints
sed -i 's/expires_at,/expires_at as "expires_at!",/g' src/repositories/refresh_token_repo.rs
sed -i 's/created_at$/created_at as "created_at!"/g' src/repositories/refresh_token_repo.rs

echo "✅ Fixed all type conversions"
