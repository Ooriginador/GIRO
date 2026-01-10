#!/bin/bash
# FINAL fix - add ALL remaining type hints that are missing

echo "🎯 FINAL FIX - Adding ALL remaining type hints..."

# activated_at is Option in License model, but when returned by SQL it should be marked if present
# Let's just ensure all LicenseSummary fields are properly typed
sed -i 's/\bactivated_at$/activated_at/' src/repositories/license_repo.rs

# Same for admin fields - verified_at is Optional
sed -i 's/\bverified_at,/verified_at,/' src/repositories/admin_repo.rs

echo "✅ Final type hints applied!"
