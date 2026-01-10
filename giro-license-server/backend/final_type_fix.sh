#!/bin/bash
# Final comprehensive type fix - convert everything to simpler types

echo "🔧 Applying final type fixes..."

# Fix auth_service - ip_address String to IpAddr parse
sed -i 's/ip_address: Option<String>/ip_address: Option<IpAddr>/' src/services/auth_service.rs

# Fix repositories - convert IpNetwork fields to use ::text cast
# These are already in SQL, just need to ensure consistency

# Fix metrics_repo - use to_string() for BigDecimal conversion
sed -i 's/sales_total,$/sales_total.to_string().parse().unwrap_or_default(),/' src/repositories/metrics_repo.rs
sed -i 's/average_ticket,$/average_ticket.to_string().parse().unwrap_or_default(),/' src/repositories/metrics_repo.rs

# Simpler: just change the Decimal imports in metrics_repo to BigDecimal
sed -i 's/use rust_decimal::Decimal;/use bigdecimal::BigDecimal;/' src/repositories/metrics_repo.rs
sed -i 's/Decimal/BigDecimal/g' src/repositories/metrics_repo.rs

echo "✅ Type fixes applied!"
