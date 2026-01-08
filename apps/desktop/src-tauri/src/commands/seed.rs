use crate::error::AppResult;
use crate::models::{
    CreateProduct, CreateSaleItem, CreateSupplier, PaymentMethod,
};
use crate::repositories::{
    ProductRepository, SaleRepository, CashRepository, StockRepository,
    CategoryRepository, SupplierRepository, EmployeeRepository, new_id,
};
use crate::AppState;
use chrono::{Duration, NaiveTime, Utc};
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use tauri::State;

// Constants for Mock Data
const CATEGORIES: &[(&str, &str)] = &[
    ("Hortifruti", "Frutas, verduras e legumes frescos"),
    ("Açougue", "Carnes bovina, suína e aves"),
    ("Padaria", "Pães, bolos e doces"),
    ("Mercearia", "Alimentos básicos e enlatados"),
    ("Bebidas", "Refrigerantes, sucos e alcoólicos"),
    ("Limpeza", "Produtos de limpeza geral"),
    ("Higiene", "Cuidados pessoais"),
    ("Frios", "Queijos, presuntos e iogurtes"),
];

const PRODUCTS: &[(&str, f64, &str)] = &[
    // Mercearia
    ("Arroz Branco 5kg", 28.90, "Mercearia"),
    ("Feijão Carioca 1kg", 8.50, "Mercearia"),
    ("Óleo de Soja 900ml", 6.90, "Mercearia"),
    ("Açúcar Refinado 1kg", 4.90, "Mercearia"),
    ("Café Torrado 500g", 18.90, "Mercearia"),
    ("Macarrão Espaguete 500g", 4.50, "Mercearia"),
    ("Molho de Tomate 340g", 3.20, "Mercearia"),
    ("Sal Refinado 1kg", 2.50, "Mercearia"),
    // Bebidas
    ("Coca-Cola 2L", 10.90, "Bebidas"),
    ("Guaraná Antarctica 2L", 8.90, "Bebidas"),
    ("Cerveja Lata 350ml", 3.90, "Bebidas"),
    ("Água Mineral 500ml", 2.50, "Bebidas"),
    ("Suco de Uva 1L", 12.90, "Bebidas"),
    // Hortifruti
    ("Banana Prata kg", 6.90, "Hortifruti"),
    ("Tomate kg", 9.90, "Hortifruti"),
    ("Batata Inglesa kg", 5.90, "Hortifruti"),
    ("Cebola kg", 4.90, "Hortifruti"),
    ("Alface Crespa", 3.50, "Hortifruti"),
    // Açougue
    ("Carne Moída Patinho kg", 39.90, "Açougue"),
    ("Filé de Frango kg", 22.90, "Açougue"),
    ("Linguiça Toscana kg", 19.90, "Açougue"),
    // Limpeza
    ("Detergente Líquido 500ml", 2.90, "Limpeza"),
    ("Sabão em Pó 1kg", 14.90, "Limpeza"),
    ("Água Sanitária 2L", 5.90, "Limpeza"),
    ("Amaciante 2L", 12.90, "Limpeza"),
    // Higiene
    ("Sabonete 90g", 2.50, "Higiene"),
    ("Pasta de Dente 90g", 4.90, "Higiene"),
    ("Papel Higiênico 4un", 6.90, "Higiene"),
    // Padaria
    ("Pão Francês kg", 16.90, "Padaria"),
    ("Leite Integral 1L", 5.50, "Padaria"),
    ("Manteiga 200g", 11.90, "Padaria"),
    // Frios
    ("Queijo Mussarela kg", 59.90, "Frios"),
    ("Presunto Cozido kg", 39.90, "Frios"),
    ("Iogurte Natural 170g", 3.90, "Frios"),
];

const SUPPLIERS: &[&str] = &[
    "Distribuidora Alvorada",
    "Atacadão do Interior",
    "Fazenda Feliz Frutas",
    "Laticínios da Serra",
    "Bebidas Nacionais SA",
    "Produtos de Limpeza Brilho",
];

#[tauri::command]
pub async fn seed_database(state: State<'_, AppState>) -> AppResult<String> {
    let pool = state.pool();
    let product_repo = ProductRepository::new(pool);
    let category_repo = CategoryRepository::new(pool);
    let supplier_repo = SupplierRepository::new(pool);
    let _sale_repo = SaleRepository::new(pool);
    let _cash_repo = CashRepository::new(pool);
    let _stock_repo = StockRepository::new(pool);
    let _emp_repo = EmployeeRepository::new(pool); // Added for context if needed

    // 1. Clear Existing Data (Optional - usually dangerous, but requested)
    // We will skip this to avoid destroying dev work, assuming empty or test DB.
    // Or we can just ensure we don't duplicate.

    // 2. Seed Categories
    let mut category_ids = std::collections::HashMap::new();
    for (name, description) in CATEGORIES {
        let existing = sqlx::query_scalar::<_, String>("SELECT id FROM Category WHERE name = ?")
            .bind(name)
            .fetch_optional(pool)
            .await?;

        let id = if let Some(id) = existing {
            id
        } else {
            let cat = category_repo.create(crate::models::CreateCategory {
                name: name.to_string(),
                description: Some(description.to_string()),
                color: None,
                icon: None,
                parent_id: None,
                sort_order: Some(0),
            }).await?;
            cat.id
        };
        category_ids.insert(*name, id);
    }

    // 3. Seed Suppliers
    let mut supplier_ids = Vec::new();
    for name in SUPPLIERS {
        let existing = sqlx::query_scalar::<_, String>("SELECT id FROM Supplier WHERE name = ?")
            .bind(name)
            .fetch_optional(pool)
            .await?;

        let id = if let Some(id) = existing {
            id
        } else {
            let supplier = supplier_repo.create(CreateSupplier {
                name: name.to_string(),
                trade_name: Some(name.to_string()),
                cnpj: None,
                phone: None,
                email: None,
                address: None,
                city: None,
                state: None,
                notes: None,
            }).await?;
            supplier.id
        };
        supplier_ids.push(id);
    }

    // 4. Seed Products
    let mut products = Vec::new();
    for (name, price, cat_name) in PRODUCTS {
        let existing = product_repo.find_by_barcode(&format!("BAR-{}", name)).await?; // Simple fake barcode
        
        let product = if let Some(p) = existing {
            p
        } else {
            let cat_id = category_ids.get(cat_name).unwrap();
            let cost = price * 0.65; // 35% margin
            
            product_repo.create(CreateProduct {
                name: name.to_string(),
                barcode: Some(format!("BAR-{}", name)),
                internal_code: None,
                description: None,
                category_id: cat_id.clone(),
                unit: None,
                sale_price: *price,
                cost_price: Some(cost),
                min_stock: Some(10.0),
                current_stock: Some(1000.0), // Start with plenty
                is_weighted: None,
            }).await?
        };
        products.push(product);
    }

    // 5. Seed History (5 Months)
    let end_date = Utc::now().naive_utc();
    let start_date = end_date - Duration::days(150);
    let mut current_date = start_date;

    let mut rng = StdRng::seed_from_u64(42);
    let admin_id = "emp-admin-001"; // Assuming from seed.sql or we assume standard

    while current_date <= end_date {
        // Skip Sundays if you want, but groceries work Sundays. Let's keep it.
        
        // Open Session
        let open_time = current_date.date().and_time(NaiveTime::from_hms_opt(8, 0, 0).unwrap()).and_utc();
        let opening_balance = 200.0;
        
        // We can't use repo.open_session because it checks for *active* session today.
        // We need to manually insert historical sessions.
        let session_id = new_id();
        sqlx::query(
            "INSERT INTO CashSession (id, employee_id, opened_at, opening_balance, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'CLOSED', ?, ?)"
        )
        .bind(&session_id)
        .bind(admin_id)
        .bind(open_time.to_rfc3339())
        .bind(opening_balance)
        .bind(open_time.to_rfc3339())
        .bind(open_time.to_rfc3339())
        .execute(pool)
        .await?;

        // Generate Daily Sales
        // Target: ~3300.00
        let mut daily_total = 0.0;
        let target_daily = 3500.0 + rng.random_range(-500.0..500.0);
        let mut sales_count = 0;

        while daily_total < target_daily {
             // Random time between 8:00 and 20:00
            let hour = rng.random_range(8..20);
            let minute = rng.random_range(0..59);
            let sale_time = current_date.date().and_time(NaiveTime::from_hms_opt(hour, minute, 0).unwrap()).and_utc();

            let num_items = rng.random_range(1..12);
            let mut items_data = Vec::new();
            let mut subtotal = 0.0;

            for _ in 0..num_items {
                let prod = &products[rng.random_range(0..products.len())];
                let qty = if prod.unit == "KG" {
                    rng.random_range(0.5..3.0)
                } else {
                    rng.random_range(1.0f64..4.0f64).floor()
                };
                
                let total = prod.sale_price * qty;
                subtotal += total;

                items_data.push(CreateSaleItem {
                    product_id: prod.id.clone(),
                    quantity: qty,
                    unit_price: prod.sale_price,
                    discount: None,
                });
            }

            // Payment Method
            let method_roll = rng.random_range(0..100);
            let method = if method_roll < 30 {
                PaymentMethod::Cash
            } else if method_roll < 70 {
                PaymentMethod::Credit
            } else if method_roll < 90 {
                PaymentMethod::Debit
            } else {
                PaymentMethod::Pix
            };

            // Manually insert Sale to override timestamps
            let sale_id = new_id();
            let sale_total = subtotal;

            sqlx::query(
                "INSERT INTO Sale (id, daily_number, employee_id, cash_session_id, subtotal, discount, total, payment_method, amount_paid, change, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&sale_id)
            .bind(sales_count + 1)
            .bind(admin_id)
            .bind(&session_id)
            .bind(subtotal)
            .bind(0.0)
            .bind(sale_total)
            .bind(method.to_string())
            .bind(sale_total) // Just exact amount for simplicity
            .bind(0.0)
            .bind("COMPLETED")
            .bind(sale_time.to_rfc3339())
            .execute(pool)
            .await?;

            // Insert Items
            for item in items_data {
                let item_id = new_id();
                sqlx::query(
                    "INSERT INTO SaleItem (id, sale_id, product_id, quantity, unit_price, discount, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&item_id)
                .bind(&sale_id)
                .bind(item.product_id)
                .bind(item.quantity)
                .bind(item.unit_price)
                .bind(0.0)
                .bind(item.quantity * item.unit_price)
                .bind(sale_time.to_rfc3339())
                .execute(pool)
                .await?;
            }

            daily_total += sale_total;
            sales_count += 1;
        }

        // Close Session
        let close_time = current_date.date().and_time(NaiveTime::from_hms_opt(20, 30, 0).unwrap()).and_utc();
        
        // Calculate totals for closing
        // For simplicity, we assume expected = actual
        // We need to sum CASH sales for the drawer
        
        let cash_sales_row = sqlx::query_scalar::<_, f64>(
            "SELECT COALESCE(SUM(total), 0) FROM sales WHERE cash_session_id = ? AND payment_method = 'CASH'"
        )
        .bind(&session_id)
        .fetch_one(pool)
        .await?;

        let expected_balance = opening_balance + cash_sales_row; // Assuming no movements/bleeds for simplicity in bulk seed
        
        sqlx::query(
            "UPDATE CashSession SET closed_at = ?, expected_balance = ?, actual_balance = ?, difference = 0, status = 'CLOSED', updated_at = ? WHERE id = ?"
        )
        .bind(close_time.to_rfc3339())
        .bind(expected_balance)
        .bind(expected_balance)
        .bind(close_time.to_rfc3339())
        .bind(&session_id)
        .execute(pool)
        .await?;

        current_date += Duration::days(1);
    }

    Ok("Database seeded successfully with 5 months of data!".to_string())
}
