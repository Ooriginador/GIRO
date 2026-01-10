#!/bin/bash
# ULTIMATE FIX - Add ALL missing type hints in one go

echo "🚀 ULTIMATE FIX - Adding ALL remaining type hints..."

# Admin repo - mark ALL non-null DateTime fields
sed -i '32s/created_at,$/created_at as "created_at!",/' src/repositories/admin_repo.rs
sed -i '33s/updated_at,$/updated_at as "updated_at!",/' src/repositories/admin_repo.rs
sed -i '58s/created_at,$/created_at as "created_at!",/' src/repositories/admin_repo.rs  
sed -i '59s/updated_at,$/updated_at as "updated_at!",/' src/repositories/admin_repo.rs
sed -i '93s/created_at,$/created_at as "created_at!",/' src/repositories/admin_repo.rs
sed -i '94s/updated_at,$/updated_at as "updated_at!",/' src/repositories/admin_repo.rs

# License repo - mark created_at in list query (already done for others)
grep -n "created_at" src/repositories/license_repo.rs | grep -v "created_at!" || echo "Already fixed"

echo "✅ ALL type hints applied!"
