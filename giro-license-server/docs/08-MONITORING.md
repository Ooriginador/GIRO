# 📊 Monitoring & Observability

> Observabilidade completa do sistema em produção

---

## 🎯 Pilares da Observabilidade

1. **Logs** - Eventos estruturados (tracing)
2. **Metrics** - Contadores, gauges, histogramas (futuro: Prometheus)
3. **Traces** - Distributed tracing (futuro: Jaeger)
4. **Health Checks** - Status da aplicação

---

## 📝 Logging

### Structured Logging (tracing-subscriber)

```rust
// backend/src/main.rs
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,backend=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer().json())
        .init();
}
```

### Log Levels

| Level   | Uso                                 | Exemplo                           |
| ------- | ----------------------------------- | --------------------------------- |
| `ERROR` | Erros que impedem operação          | Database connection failed        |
| `WARN`  | Situações anormais mas recuperáveis | Rate limit approaching            |
| `INFO`  | Eventos importantes                 | License activated, User logged in |
| `DEBUG` | Debugging em desenvolvimento        | Query executed, Cache hit         |
| `TRACE` | Muito detalhado                     | Function entry/exit               |

### Exemplos de Logs

```rust
// INFO - Ação bem-sucedida
tracing::info!(
    license_key = %license.license_key,
    admin_id = %admin_id,
    plan_type = ?plan_type,
    "License created"
);

// WARN - Situação suspeita
tracing::warn!(
    ip = %ip_address,
    failed_attempts = attempts,
    "Multiple failed login attempts"
);

// ERROR - Falha crítica
tracing::error!(
    error = %e,
    query = "SELECT * FROM licenses WHERE id = $1",
    "Database query failed"
);
```

**Output JSON:**

```json
{
  "timestamp": "2026-01-11T14:30:00.123Z",
  "level": "INFO",
  "message": "License created",
  "license_key": "GIRO-ABCD-1234-EFGH-5678",
  "admin_id": "d384bca6-ecbd-4690-8db2-662776d1652b",
  "plan_type": "Monthly"
}
```

---

## ❤️ Health Checks

### Endpoint `/health`

```rust
// routes/health.rs
use axum::{extract::State, Json};
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    version: String,
    timestamp: String,
    database: String,
    redis: String,
}

pub async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    let db_status = check_database(&state.db).await;
    let redis_status = check_redis(&state.redis).await;

    Json(HealthResponse {
        status: if db_status && redis_status { "healthy" } else { "unhealthy" },
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        database: if db_status { "connected" } else { "disconnected" },
        redis: if redis_status { "connected" } else { "disconnected" },
    })
}

async fn check_database(pool: &PgPool) -> bool {
    sqlx::query("SELECT 1")
        .fetch_one(pool)
        .await
        .is_ok()
}

async fn check_redis(conn: &ConnectionManager) -> bool {
    let mut conn = conn.clone();
    redis::cmd("PING")
        .query_async::<_, String>(&mut conn)
        .await
        .is_ok()
}
```

**Response Exemplo:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-11T14:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## 📊 Metrics (Prometheus - Futuro)

### Implementação com axum-prometheus

```rust
// Cargo.toml
[dependencies]
axum-prometheus = "0.4"

// main.rs
use axum_prometheus::PrometheusMetricLayer;

let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

let app = Router::new()
    .route("/metrics", get(|| async move { metric_handle.render() }))
    .layer(prometheus_layer);
```

### Métricas Importantes

#### Request Metrics

```
# Total de requests por endpoint
http_requests_total{method="POST", endpoint="/licenses", status="201"} 1547

# Latência (histogram)
http_request_duration_seconds_bucket{endpoint="/licenses/:key/validate", le="0.1"} 8923
http_request_duration_seconds_bucket{endpoint="/licenses/:key/validate", le="0.5"} 9012
http_request_duration_seconds_sum{endpoint="/licenses/:key/validate"} 456.78
http_request_duration_seconds_count{endpoint="/licenses/:key/validate"} 9015

# Requests em andamento (gauge)
http_requests_in_flight{endpoint="/licenses"} 3
```

#### Business Metrics

```rust
// Custom metrics
use prometheus::{Counter, Histogram, Registry};

lazy_static! {
    static ref LICENSES_CREATED: Counter = Counter::new(
        "licenses_created_total",
        "Total licenses created"
    ).unwrap();

    static ref LICENSES_ACTIVATED: Counter = Counter::new(
        "licenses_activated_total",
        "Total licenses activated"
    ).unwrap();

    static ref VALIDATION_DURATION: Histogram = Histogram::new(
        "license_validation_duration_seconds",
        "Time to validate a license"
    ).unwrap();
}

// No código
LICENSES_CREATED.inc();
LICENSES_ACTIVATED.inc();

let timer = VALIDATION_DURATION.start_timer();
// ... validação ...
timer.observe_duration();
```

---

## 🔍 Distributed Tracing (Opentelemetry - Futuro)

### Setup

```rust
use opentelemetry::global;
use opentelemetry_jaeger::new_agent_pipeline;
use tracing_subscriber::layer::SubscriberExt;

let tracer = new_agent_pipeline()
    .with_service_name("giro-license-server")
    .install_simple()
    .expect("Failed to install OpenTelemetry tracer");

let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

tracing_subscriber::registry()
    .with(telemetry)
    .with(tracing_subscriber::fmt::layer())
    .init();
```

### Trace Example

```rust
#[tracing::instrument(skip(state))]
async fn activate_license(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Json(payload): Json<ActivateLicenseRequest>,
) -> AppResult<Json<ActivateLicenseResponse>> {
    // Automatically traced
    let service = state.license_service();
    service.activate(&key, &payload.hardware_id, ...).await
}
```

---

## 📈 Database Metrics

### Query Performance

```sql
-- Queries mais lentas (PostgreSQL)
SELECT
    query,
    calls,
    total_time / 1000 as total_seconds,
    mean_time / 1000 as mean_seconds,
    max_time / 1000 as max_seconds
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

### Connection Pool

```rust
// SQLx pool metrics
let pool_size = pool.size();
let idle_conns = pool.num_idle();

tracing::info!(
    pool_size = pool_size,
    idle_connections = idle_conns,
    "Database pool status"
);
```

### Table Sizes

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

---

## 🚨 Alerting

### Railway Alerts (Built-in)

- **Deployment Failed**: Email notification
- **High CPU (>80%)**: Alert dashboard
- **High Memory (>80%)**: Alert dashboard
- **Health Check Failed**: Restart automático

### Custom Alerts (Futuro - Sentry/Datadog)

```rust
use sentry::{capture_message, Level};

// Alerta crítico
if failed_logins > 100 {
    sentry::capture_message(
        "High number of failed login attempts",
        Level::Warning
    );
}

// Exception tracking
if let Err(e) = result {
    sentry::capture_error(&e);
}
```

---

## 📊 Dashboard Queries

### Licenças Ativas por Dia

```sql
SELECT
    DATE(activated_at) as date,
    COUNT(*) as activations
FROM licenses
WHERE activated_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(activated_at)
ORDER BY date DESC;
```

### Top Admins por Licenças

```sql
SELECT
    a.name,
    a.email,
    COUNT(l.id) as total_licenses,
    COUNT(l.id) FILTER (WHERE l.status = 'active') as active_licenses
FROM admins a
LEFT JOIN licenses l ON a.id = l.admin_id
GROUP BY a.id, a.name, a.email
ORDER BY total_licenses DESC
LIMIT 10;
```

### Revenue Tracking

```sql
SELECT
    l.plan_type,
    COUNT(*) as licenses,
    CASE
        WHEN l.plan_type = 'monthly' THEN COUNT(*) * 99.90
        WHEN l.plan_type = 'semiannual' THEN COUNT(*) * 599.40
        WHEN l.plan_type = 'annual' THEN COUNT(*) * 999.00
    END as potential_revenue
FROM licenses l
WHERE l.status = 'active'
GROUP BY l.plan_type;
```

### System Health Summary

```sql
-- Resumo do sistema
SELECT
    (SELECT COUNT(*) FROM admins WHERE is_active = true) as active_admins,
    (SELECT COUNT(*) FROM licenses) as total_licenses,
    (SELECT COUNT(*) FROM licenses WHERE status = 'active') as active_licenses,
    (SELECT COUNT(*) FROM licenses WHERE expires_at < NOW()) as expired_licenses,
    (SELECT COUNT(*) FROM hardware WHERE is_active = true) as active_hardware,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as audit_logs_24h;
```

---

## 🔔 Error Tracking

### Error Rates

```sql
-- Erros nas últimas 24h
SELECT
    action,
    COUNT(*) as occurrences
FROM audit_logs
WHERE action IN ('login_failed', 'license_validation_failed', 'payment_failed')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY occurrences DESC;
```

### Failed Validations by License

```sql
SELECT
    l.license_key,
    a.name as admin_name,
    COUNT(*) as failed_attempts,
    MAX(al.created_at) as last_attempt
FROM audit_logs al
JOIN licenses l ON al.license_id = l.id
JOIN admins a ON l.admin_id = a.id
WHERE al.action = 'license_validation_failed'
  AND al.created_at > NOW() - INTERVAL '7 days'
GROUP BY l.license_key, a.name
HAVING COUNT(*) > 10
ORDER BY failed_attempts DESC;
```

---

## 📉 Performance Monitoring

### Response Time Percentiles

```sql
-- Se tivéssemos metrics table
SELECT
    endpoint,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) as p50,
    percentile_cont(0.90) WITHIN GROUP (ORDER BY duration_ms) as p90,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
FROM request_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY p99 DESC;
```

### Redis Performance

```bash
# Via redis-cli
redis-cli INFO stats

# Comandos por segundo
instantaneous_ops_per_sec:125

# Hit rate
keyspace_hits:45678
keyspace_misses:1234
hit_rate: 97.4%
```

---

## 🛠️ Maintenance Tasks

### Log Rotation

```bash
# Railway automaticamente mantém últimos 7 dias
# Para persistência maior, exportar para S3/GCS

railway logs --since 24h > logs-$(date +%Y%m%d).log
aws s3 cp logs-$(date +%Y%m%d).log s3://giro-logs/
```

### Database Vacuum

```sql
-- Executar semanalmente via cron
VACUUM ANALYZE licenses;
VACUUM ANALYZE audit_logs;
VACUUM ANALYZE metrics;
```

### Cleanup Old Data

```sql
-- Audit logs > 90 dias
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Refresh tokens expirados > 7 dias
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '7 days';
```

---

## 📱 Monitoring Tools

### Recomendados

1. **Railway Dashboard** (Grátis)

   - CPU, Memory, Network
   - Deployment logs
   - Health checks

2. **Sentry** (Error Tracking)

   - Exception tracking
   - Performance monitoring
   - Release tracking

3. **Datadog** (APM)

   - Distributed tracing
   - Custom metrics
   - Dashboards

4. **Better Stack** (Logs)
   - Log aggregation
   - Search & filtering
   - Alerting

---

## 🚀 Future Improvements

- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboards
- [ ] Sentry error tracking
- [ ] Distributed tracing (Jaeger)
- [ ] Custom business metrics
- [ ] Real-time alerting (PagerDuty)
- [ ] Synthetic monitoring (Uptime Kuma)
