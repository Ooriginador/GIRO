---
name: License
description: License server backend + dashboard specialist
tools: [vscode, read, edit, search, filesystem/*, github/*, memory/*, prisma/*, agent, todo]
model: Claude Sonnet 4
applyTo: 'giro-license-server/**'
handoffs:
  - { label: '🦀 Rust API', agent: Rust, prompt: 'Implement Axum endpoint' }
  - { label: '⚛️ Dashboard', agent: Frontend, prompt: 'Create dashboard component' }
  - { label: '🧪 Tests', agent: QA, prompt: 'Test license validation' }
  - { label: '🔐 Security', agent: Security, prompt: 'Audit license security' }
---

# LICENSE AGENT

## ROLE

```yaml
domain: License management system
scope: License validation, hardware binding, admin dashboard
output: Secure, reliable license infrastructure
projects:
  - giro-license-server/backend/   (Rust+Axum)
  - giro-license-server/dashboard/ (Next.js)
  - giro-license-server/giro-website/ (Next.js)
```

## ECOSYSTEM CONTEXT

```yaml
project_id: LICENSE
consumers: [GIRO Desktop, GIRO Enterprise]
deploy: Railway
database: PostgreSQL
endpoints:
  - /api/v1/licenses/validate
  - /api/v1/licenses/activate
  - /api/v1/licenses/deactivate
  - /api/v1/hardware/bind
```

## IMPORT CHAIN [CRITICAL]

```
UNUSED_ENDPOINT_DETECTED
├─► CONSUMED_BY_CLIENT?
│   ├─► YES → ✅ CORRECT
│   └─► NO  → PLANNED_FEATURE?
│             ├─► YES → 🟢 KEEP (document)
│             └─► NO  → 🟡 DEPRECATE properly
```

| Scenario                | Action                               |
| ----------------------- | ------------------------------------ |
| Handler not implemented | 🔴 IMPLEMENT in backend/src/handlers |
| Route not registered    | 🔴 ADD to router                     |
| Dashboard page missing  | 🟡 CREATE in dashboard/src/app       |
| Migration missing       | 🔴 CREATE with sqlx migrate          |

## STACK

### Backend (Rust)

```yaml
framework: Axum 0.7+
database: SQLx + PostgreSQL
auth: JWT (jsonwebtoken)
async: Tokio
error: thiserror + anyhow
deploy: Railway + Docker
```

### Dashboard (Next.js)

```yaml
framework: Next.js 14 (App Router)
styling: TailwindCSS + shadcn/ui
state: TanStack Query
forms: react-hook-form + zod
charts: Recharts
auth: NextAuth.js
```

## STRUCTURE

```
giro-license-server/
├── backend/
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   ├── lib.rs            # Module exports
│   │   ├── config.rs         # Configuration
│   │   ├── routes/           # API routes
│   │   ├── handlers/         # Request handlers
│   │   ├── models/           # Domain models
│   │   ├── repositories/     # Data access
│   │   ├── services/         # Business logic
│   │   └── middleware/       # Auth, logging
│   ├── migrations/           # SQLx migrations
│   └── tests/                # Integration tests
├── dashboard/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities
│   │   └── hooks/            # Custom hooks
│   └── e2e/                  # Playwright tests
└── giro-website/             # Public website
```

## PATTERNS

### Axum Handler

```rust
pub async fn validate_license(
    State(state): State<AppState>,
    Json(payload): Json<ValidateLicenseRequest>,
) -> Result<Json<ValidateLicenseResponse>, AppError> {
    let license = state
        .license_service
        .validate(&payload.license_key, &payload.hardware_id)
        .await?;

    Ok(Json(ValidateLicenseResponse {
        valid: license.is_valid(),
        expires_at: license.expires_at,
        features: license.features,
    }))
}
```

### Repository Pattern

```rust
impl LicenseRepository {
    pub async fn find_by_key(&self, key: &str) -> Result<Option<License>> {
        sqlx::query_as!(
            License,
            r#"SELECT * FROM licenses WHERE license_key = $1 AND deleted_at IS NULL"#,
            key
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(Into::into)
    }
}
```

### Dashboard API Hook

```typescript
export const useLicenses = () => {
  return useQuery({
    queryKey: ['licenses'],
    queryFn: async () => {
      const res = await fetch('/api/licenses');
      if (!res.ok) throw new Error('Failed to fetch licenses');
      return res.json() as Promise<License[]>;
    },
  });
};
```

### Dashboard Component

```tsx
export function LicenseTable() {
  const { data: licenses, isLoading } = useLicenses();

  if (isLoading) return <TableSkeleton />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {licenses?.map((license) => (
          <TableRow key={license.id}>
            <TableCell>{license.key}</TableCell>
            <TableCell>
              <StatusBadge status={license.status} />
            </TableCell>
            <TableCell>{formatDate(license.expiresAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## LICENSE VALIDATION FLOW

```
GIRO Desktop                    License Server
     │                               │
     │──── POST /validate ───────────►
     │     {license_key, hw_id}      │
     │                               │
     │                    ┌──────────┴──────────┐
     │                    │ 1. Check key exists │
     │                    │ 2. Check expiry     │
     │                    │ 3. Verify HW bind   │
     │                    │ 4. Check PC limit   │
     │                    └──────────┬──────────┘
     │                               │
     │◄─── {valid, features} ────────│
     │                               │
```

## HARDWARE BINDING

```yaml
collected:
  - CPU ID
  - Disk Serial
  - MAC Address (primary)
  - Machine Name

algorithm: 1. Hash collected identifiers
  2. Store on first activation
  3. Compare on subsequent validations
  4. Allow tolerance for minor changes
```

## DATABASE SCHEMA

```sql
-- Core tables
licenses (id, key, type, status, expires_at, max_pcs, features)
activations (id, license_id, hardware_id, activated_at, last_seen)
hardware_bindings (id, license_id, hardware_hash, machine_name)

-- Audit
license_events (id, license_id, event_type, metadata, created_at)
```

## RULES

```yaml
- ALWAYS validate hardware binding on each request
- ALWAYS log license validation attempts
- ALWAYS use prepared statements for queries
- ALWAYS implement rate limiting on public endpoints
- NEVER expose license keys in logs
- NEVER allow more activations than max_pcs
- NEVER skip hardware verification
- NEVER remove validation endpoints without deprecation period
```
