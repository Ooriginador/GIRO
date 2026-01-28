//! Testes de regressão para LGPD Hard Delete
//!
//! Este módulo testa a funcionalidade de exclusão permanente de dados
//! garantindo que:
//! 1. Dados são anonimizados corretamente antes da exclusão
//! 2. Foreign key constraints são respeitadas
//! 3. Erros são tratados adequadamente
//! 4. Nenhum dado órfão é deixado

#[cfg(test)]
mod lgpd_hard_delete_tests {
    use crate::commands::lgpd::lgpd_hard_delete_employee_impl;
    use sqlx::SqlitePool;
    use uuid::Uuid;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();

        // Criar schema básico (simplificado para testes)
        sqlx::query(
            r#"
            CREATE TABLE employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                pin TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'CASHIER',
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE cash_sessions (
                id TEXT PRIMARY KEY,
                employee_id TEXT,
                opening_balance REAL NOT NULL,
                status TEXT NOT NULL,
                opened_at TEXT NOT NULL,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
            );

            CREATE TABLE sales (
                id TEXT PRIMARY KEY,
                employee_id TEXT,
                cash_session_id TEXT,
                total REAL NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
                FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id)
            );

            CREATE TABLE audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                action TEXT NOT NULL,
                entity TEXT NOT NULL,
                entity_id TEXT,
                created_at TEXT NOT NULL
            );
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Habilitar foreign keys
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&pool)
            .await
            .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_employee_hard_delete_with_related_data() {
        let pool = setup_test_db().await;
        let employee_id = Uuid::new_v4().to_string();

        // Criar funcionário
        sqlx::query("INSERT INTO employees (id, name, pin, role) VALUES (?, ?, ?, ?)")
            .bind(&employee_id)
            .bind("Test Employee")
            .bind("1234")
            .bind("CASHIER")
            .execute(&pool)
            .await
            .unwrap();

        // Criar sessão de caixa
        let session_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at) VALUES (?, ?, ?, ?, datetime('now'))",
        )
        .bind(&session_id)
        .bind(&employee_id)
        .bind(100.0)
        .bind("CLOSED")
        .execute(&pool)
        .await
        .unwrap();

        // Criar venda
        let sale_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sales (id, employee_id, cash_session_id, total, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
        )
        .bind(&sale_id)
        .bind(&employee_id)
        .bind(&session_id)
        .bind(50.0)
        .bind("CASH")
        .bind("COMPLETED")
        .execute(&pool)
        .await
        .unwrap();

        // Criar log de auditoria
        sqlx::query(
            "INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&employee_id)
        .bind("Test Employee")
        .bind("CREATE")
        .bind("sale")
        .bind(&sale_id)
        .execute(&pool)
        .await
        .unwrap();

        // Executar hard delete usando a função real
        let result = lgpd_hard_delete_employee_impl(&employee_id, &pool)
            .await
            .expect("Hard delete deve funcionar");

        // Verificações do resultado
        assert!(result.success, "Deve retornar success=true");
        assert_eq!(result.deleted_records, 1, "Deve ter deletado 1 registro");
        assert!(
            result.anonymized_records >= 3,
            "Deve ter anonimizado pelo menos 3 registros (venda, sessão, log)"
        );

        // Verificar que dados foram anonimizados
        // Nota: query_scalar com fetch_optional retorna Option<Option<String>>
        // Se a row existe e employee_id é NULL, retorna Some(None)
        let sale_check: Option<Option<String>> =
            sqlx::query_scalar("SELECT employee_id FROM sales WHERE id = ?")
                .bind(&sale_id)
                .fetch_optional(&pool)
                .await
                .unwrap();
        assert!(
            sale_check == Some(None),
            "employee_id da venda deve ser NULL, got: {:?}",
            sale_check
        );

        let session_check: Option<Option<String>> =
            sqlx::query_scalar("SELECT employee_id FROM cash_sessions WHERE id = ?")
                .bind(&session_id)
                .fetch_optional(&pool)
                .await
                .unwrap();
        assert!(
            session_check == Some(None),
            "employee_id da sessão deve ser NULL, got: {:?}",
            session_check
        );

        let log_check: String =
            sqlx::query_scalar("SELECT user_id FROM audit_logs WHERE entity_id = ?")
                .bind(&sale_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(
            log_check, "ANONYMIZED",
            "user_id do log deve ser ANONYMIZED"
        );

        // Verificar que funcionário foi deletado
        let employee_check: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM employees WHERE id = ?")
            .bind(&employee_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(employee_check, 0, "Funcionário deve ter sido deletado");
    }

    #[tokio::test]
    async fn test_employee_hard_delete_should_fail_without_anonymization() {
        let pool = setup_test_db().await;
        let employee_id = Uuid::new_v4().to_string();

        // Criar funcionário
        sqlx::query("INSERT INTO employees (id, name, pin, role) VALUES (?, ?, ?, ?)")
            .bind(&employee_id)
            .bind("Test Employee")
            .bind("1234")
            .bind("CASHIER")
            .execute(&pool)
            .await
            .unwrap();

        // Criar venda (RESTRICT constraint)
        sqlx::query(
            "INSERT INTO sales (id, employee_id, cash_session_id, total, payment_method, status, created_at) 
             VALUES (?, ?, NULL, ?, ?, ?, datetime('now'))",
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&employee_id)
        .bind(50.0)
        .bind("CASH")
        .bind("COMPLETED")
        .execute(&pool)
        .await
        .unwrap();

        // Tentar deletar SEM anonimizar - deve falhar
        let result = sqlx::query("DELETE FROM employees WHERE id = ?")
            .bind(&employee_id)
            .execute(&pool)
            .await;

        assert!(result.is_err(), "Deve falhar por foreign key constraint");
    }

    #[tokio::test]
    async fn test_employee_hard_delete_without_related_data() {
        let pool = setup_test_db().await;
        let employee_id = Uuid::new_v4().to_string();

        // Criar funcionário sem dados relacionados
        sqlx::query("INSERT INTO employees (id, name, pin, role) VALUES (?, ?, ?, ?)")
            .bind(&employee_id)
            .bind("Test Employee")
            .bind("1234")
            .bind("CASHIER")
            .execute(&pool)
            .await
            .unwrap();

        // Executar deleção usando a função real
        let result = lgpd_hard_delete_employee_impl(&employee_id, &pool)
            .await
            .expect("Hard delete deve funcionar");

        assert!(result.success, "Deve retornar success=true");
        assert_eq!(
            result.deleted_records, 1,
            "Deve deletar funcionário sem dados relacionados"
        );
        assert_eq!(
            result.anonymized_records, 0,
            "Não deve ter anonimizado nenhum registro"
        );

        // Verificar deleção
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM employees WHERE id = ?")
            .bind(&employee_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }
}
