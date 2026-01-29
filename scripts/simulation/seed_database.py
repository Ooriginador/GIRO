#!/usr/bin/env python3
"""
Seed Database Script for GIRO Desktop Simulation
Populates database with realistic test data for all modules
"""

import hashlib
import hmac
import json
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone

# Configuration
SECRET_KEY = os.environ.get("PIN_HMAC_KEY", "simulated-secret-key-123")


def generate_id():
    """Generate a UUID for database IDs"""
    return str(uuid.uuid4())


def hash_pin(pin: str) -> str:
    """Generate HMAC-SHA256 hash for PIN"""
    h = hmac.new(SECRET_KEY.encode(), pin.encode(), hashlib.sha256)
    return h.hexdigest()


def now():
    """Current datetime as string"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


# ============================================================================
# SEED DATA
# ============================================================================

EMPLOYEES = [
    # (id, name, cpf, email, pin, role)
    (
        "emp-admin",
        "João Silva (Admin)",
        "111.111.111-11",
        "joao@giro.local",
        "1234",
        "ADMIN",
    ),
    (
        "emp-gerente",
        "Maria Santos (Gerente)",
        "222.222.222-22",
        "maria@giro.local",
        "2345",
        "MANAGER",
    ),
    (
        "emp-caixa-01",
        "Pedro Oliveira (Caixa 1)",
        "333.333.333-33",
        "pedro@giro.local",
        "3456",
        "CASHIER",
    ),
    (
        "emp-caixa-02",
        "Ana Costa (Caixa 2)",
        "444.444.444-44",
        "ana@giro.local",
        "4567",
        "CASHIER",
    ),
    (
        "emp-vendedor-01",
        "Carlos Souza (Vendedor)",
        "555.555.555-55",
        "carlos@giro.local",
        "5678",
        "SELLER",
    ),
    (
        "emp-vendedor-02",
        "Fernanda Lima (Vendedora)",
        "666.666.666-66",
        "fernanda@giro.local",
        "6789",
        "SELLER",
    ),
    (
        "emp-estoque",
        "Roberto Alves (Estoque)",
        "777.777.777-77",
        "roberto@giro.local",
        "7890",
        "STOCKIST",
    ),
    (
        "emp-financeiro",
        "Lucia Pereira (Financeiro)",
        "888.888.888-88",
        "lucia@giro.local",
        "8901",
        "FINANCIAL",
    ),
    (
        "emp-cadastro",
        "Marcos Dias (Cadastro)",
        "999.999.999-99",
        "marcos@giro.local",
        "9012",
        "REGISTER",
    ),
    (
        "emp-tecnico",
        "Paulo Ramos (Técnico)",
        "000.000.000-00",
        "paulo@giro.local",
        "0123",
        "TECHNICIAN",
    ),
]

CATEGORIES = [
    ("cat-bebidas", "Bebidas", "🍺", None),
    ("cat-bebidas-alcool", "Bebidas Alcoólicas", "🍷", "cat-bebidas"),
    ("cat-bebidas-refri", "Refrigerantes", "🥤", "cat-bebidas"),
    ("cat-bebidas-sucos", "Sucos", "🧃", "cat-bebidas"),
    ("cat-alimentos", "Alimentos", "🍞", None),
    ("cat-laticinios", "Laticínios", "🥛", "cat-alimentos"),
    ("cat-padaria", "Padaria", "🥖", "cat-alimentos"),
    ("cat-carnes", "Carnes", "🥩", "cat-alimentos"),
    ("cat-limpeza", "Limpeza", "🧹", None),
    ("cat-higiene", "Higiene Pessoal", "🧴", None),
    ("cat-motopeças", "Motopeças", "🏍️", None),
    ("cat-oleo-filtro", "Óleos e Filtros", "🛢️", "cat-motopeças"),
    ("cat-pneus", "Pneus e Câmaras", "⚫", "cat-motopeças"),
    ("cat-eletrica", "Elétrica", "⚡", "cat-motopeças"),
]

SUPPLIERS = [
    ("sup-ambev", "Ambev", "00.000.000/0001-00", "contato@ambev.com", "(11) 3333-3333"),
    (
        "sup-coca",
        "Coca-Cola FEMSA",
        "11.111.111/0001-11",
        "vendas@cocacola.com",
        "(11) 4444-4444",
    ),
    (
        "sup-nestle",
        "Nestlé Brasil",
        "22.222.222/0001-22",
        "vendas@nestle.com",
        "(11) 5555-5555",
    ),
    (
        "sup-unilever",
        "Unilever",
        "33.333.333/0001-33",
        "comercial@unilever.com",
        "(11) 6666-6666",
    ),
    (
        "sup-honda",
        "Honda Motos Peças",
        "44.444.444/0001-44",
        "pecas@honda.com",
        "(11) 7777-7777",
    ),
    (
        "sup-yamaha",
        "Yamaha Parts",
        "55.555.555/0001-55",
        "parts@yamaha.com",
        "(11) 8888-8888",
    ),
]

PRODUCTS = [
    # (id, name, barcode, price, cost, stock, category_id, supplier_id)
    (
        "prod-001",
        "Cerveja Skol Lata 350ml",
        "7891149100101",
        4.99,
        2.50,
        240,
        "cat-bebidas-alcool",
        "sup-ambev",
    ),
    (
        "prod-002",
        "Cerveja Brahma Lata 350ml",
        "7891149100102",
        4.79,
        2.40,
        180,
        "cat-bebidas-alcool",
        "sup-ambev",
    ),
    (
        "prod-003",
        "Coca-Cola 2L",
        "7894900011517",
        10.99,
        6.00,
        120,
        "cat-bebidas-refri",
        "sup-coca",
    ),
    (
        "prod-004",
        "Coca-Cola Lata 350ml",
        "7894900011524",
        5.49,
        2.80,
        300,
        "cat-bebidas-refri",
        "sup-coca",
    ),
    (
        "prod-005",
        "Guaraná Antarctica 2L",
        "7891991000826",
        8.99,
        4.50,
        90,
        "cat-bebidas-refri",
        "sup-ambev",
    ),
    (
        "prod-006",
        "Suco Del Valle Uva 1L",
        "7898192030012",
        7.99,
        4.00,
        60,
        "cat-bebidas-sucos",
        "sup-coca",
    ),
    (
        "prod-007",
        "Leite Integral Ninho 1L",
        "7891000100103",
        6.49,
        4.20,
        150,
        "cat-laticinios",
        "sup-nestle",
    ),
    (
        "prod-008",
        "Iogurte Danone Natural 170g",
        "7891025104803",
        3.99,
        2.00,
        80,
        "cat-laticinios",
        "sup-nestle",
    ),
    (
        "prod-009",
        "Pão Francês kg",
        "0000000000001",
        12.99,
        7.00,
        50,
        "cat-padaria",
        None,
    ),
    (
        "prod-010",
        "Detergente Ypê 500ml",
        "7896098900123",
        2.99,
        1.20,
        200,
        "cat-limpeza",
        "sup-unilever",
    ),
    (
        "prod-011",
        "Sabonete Dove 90g",
        "7891150025776",
        4.49,
        2.30,
        150,
        "cat-higiene",
        "sup-unilever",
    ),
    (
        "prod-012",
        "Óleo Motor 4T 1L Honda",
        "7898000000001",
        45.90,
        28.00,
        30,
        "cat-oleo-filtro",
        "sup-honda",
    ),
    (
        "prod-013",
        "Filtro Óleo CG 160",
        "7898000000002",
        18.90,
        9.50,
        25,
        "cat-oleo-filtro",
        "sup-honda",
    ),
    (
        "prod-014",
        "Pneu 100/80-18 Traseiro",
        "7898000000003",
        189.90,
        120.00,
        15,
        "cat-pneus",
        "sup-yamaha",
    ),
    (
        "prod-015",
        "Câmara de Ar Aro 18",
        "7898000000004",
        35.90,
        18.00,
        40,
        "cat-pneus",
        "sup-yamaha",
    ),
    (
        "prod-016",
        "Bateria 5Ah Moto",
        "7898000000005",
        89.90,
        55.00,
        20,
        "cat-eletrica",
        "sup-honda",
    ),
    (
        "prod-017",
        "Vela de Ignição NGK",
        "7898000000006",
        22.90,
        12.00,
        50,
        "cat-eletrica",
        "sup-honda",
    ),
    (
        "prod-018",
        "Água Mineral 500ml",
        "7896000000001",
        2.49,
        0.80,
        500,
        "cat-bebidas",
        None,
    ),
    (
        "prod-019",
        "Café Pilão 500g",
        "7896000000002",
        15.99,
        9.00,
        100,
        "cat-alimentos",
        None,
    ),
    (
        "prod-020",
        "Açúcar Cristal 1kg",
        "7896000000003",
        5.99,
        3.50,
        80,
        "cat-alimentos",
        None,
    ),
]

CUSTOMERS = [
    ("cli-001", "Cliente Varejo Comum", None, "cliente@email.com", "(11) 99999-0001"),
    ("cli-002", "José da Moto", "123.456.789-00", "jose@email.com", "(11) 99999-0002"),
    (
        "cli-003",
        "Oficina do Zé",
        "12.345.678/0001-90",
        "oficina@email.com",
        "(11) 3333-0003",
    ),
    (
        "cli-004",
        "Maria Consumidora",
        "987.654.321-00",
        "maria.c@email.com",
        "(11) 99999-0004",
    ),
    (
        "cli-005",
        "Mercadinho da Esquina",
        "98.765.432/0001-10",
        "mercadinho@email.com",
        "(11) 3333-0005",
    ),
]

VEHICLE_BRANDS = [
    ("brand-honda", "Honda"),
    ("brand-yamaha", "Yamaha"),
    ("brand-suzuki", "Suzuki"),
    ("brand-kawasaki", "Kawasaki"),
    ("brand-bmw", "BMW Motorrad"),
]

VEHICLE_MODELS = [
    ("model-cg160", "CG 160 Titan", "brand-honda"),
    ("model-biz125", "Biz 125", "brand-honda"),
    ("model-xre300", "XRE 300", "brand-honda"),
    ("model-fazer250", "Fazer 250", "brand-yamaha"),
    ("model-factor150", "Factor 150", "brand-yamaha"),
    ("model-yes125", "Yes 125", "brand-suzuki"),
]

SERVICES = [
    ("svc-001", "Troca de Óleo Completa", 45.00, 30),
    ("svc-002", "Revisão Básica", 80.00, 60),
    ("svc-003", "Revisão Completa", 180.00, 120),
    ("svc-004", "Troca de Pneu", 25.00, 20),
    ("svc-005", "Balanceamento", 30.00, 15),
    ("svc-006", "Alinhamento", 40.00, 20),
    ("svc-007", "Diagnóstico Elétrico", 60.00, 45),
    ("svc-008", "Troca de Bateria", 35.00, 15),
]


def seed_employees(cursor):
    """Seed employees table"""
    print("   👥 Seeding Employees...")
    for emp in EMPLOYEES:
        emp_id, name, cpf, email, pin, role = emp
        cursor.execute(
            """
            INSERT OR IGNORE INTO employees (id, name, cpf, email, pin, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        """,
            (emp_id, name, cpf, email, hash_pin(pin), role, now(), now()),
        )
    print(f"      ✅ {len(EMPLOYEES)} employees created")


def seed_categories(cursor):
    """Seed categories table"""
    print("   📁 Seeding Categories...")
    colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]
    for i, cat in enumerate(CATEGORIES):
        cat_id, name, icon, parent_id = cat
        color = colors[i % len(colors)]
        cursor.execute(
            """
            INSERT OR IGNORE INTO categories (id, name, icon, color, parent_id, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        """,
            (cat_id, name, icon, color, parent_id, now(), now()),
        )
    print(f"      ✅ {len(CATEGORIES)} categories created")


def seed_suppliers(cursor):
    """Seed suppliers table"""
    print("   🏭 Seeding Suppliers...")
    for sup in SUPPLIERS:
        sup_id, name, cnpj, email, phone = sup
        cursor.execute(
            """
            INSERT OR IGNORE INTO suppliers (id, name, cnpj, email, phone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        """,
            (sup_id, name, cnpj, email, phone, now(), now()),
        )
    print(f"      ✅ {len(SUPPLIERS)} suppliers created")


def seed_products(cursor):
    """Seed products table"""
    print("   📦 Seeding Products...")
    for i, prod in enumerate(PRODUCTS):
        prod_id, name, barcode, price, cost, stock, cat_id, sup_id = prod
        internal_code = f"PROD-{i+1:04d}"
        # Ensure category exists - use default if not
        if not cat_id:
            cat_id = "cat-alimentos"
        cursor.execute(
            """
            INSERT OR IGNORE INTO products (id, name, barcode, internal_code, sale_price, cost_price, current_stock, 
                                           min_stock, category_id, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 5, ?, 1, ?, ?)
        """,
            (
                prod_id,
                name,
                barcode,
                internal_code,
                price,
                cost,
                stock,
                cat_id,
                now(),
                now(),
            ),
        )
    print(f"      ✅ {len(PRODUCTS)} products created")


def seed_customers(cursor):
    """Seed customers table"""
    print("   👤 Seeding Customers...")
    for cust in CUSTOMERS:
        cust_id, name, cpf, email, phone = cust
        cursor.execute(
            """
            INSERT OR IGNORE INTO customers (id, name, cpf, email, phone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        """,
            (cust_id, name, cpf, email, phone, now(), now()),
        )
    print(f"      ✅ {len(CUSTOMERS)} customers created")


def seed_vehicle_brands(cursor):
    """Seed vehicle brands table"""
    print("   🏍️ Seeding Vehicle Brands...")
    for brand in VEHICLE_BRANDS:
        brand_id, name = brand
        cursor.execute(
            """
            INSERT OR IGNORE INTO vehicle_brands (id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        """,
            (brand_id, name, now(), now()),
        )
    print(f"      ✅ {len(VEHICLE_BRANDS)} brands created")


def seed_vehicle_models(cursor):
    """Seed vehicle models table"""
    print("   🛵 Seeding Vehicle Models...")
    for model in VEHICLE_MODELS:
        model_id, name, brand_id = model
        cursor.execute(
            """
            INSERT OR IGNORE INTO vehicle_models (id, name, brand_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """,
            (model_id, name, brand_id, now(), now()),
        )
    print(f"      ✅ {len(VEHICLE_MODELS)} models created")


def seed_services(cursor):
    """Seed services table"""
    print("   🔧 Seeding Services...")
    for svc in SERVICES:
        svc_id, name, price, time_minutes = svc
        cursor.execute(
            """
            INSERT OR IGNORE INTO services (id, name, default_price, estimated_time, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
        """,
            (svc_id, name, price, time_minutes, now(), now()),
        )
    print(f"      ✅ {len(SERVICES)} services created")


def seed_sample_sales(cursor):
    """Create some sample sales for testing - SKIPPED for now"""
    print("   💰 Seeding Sample Sales...")
    print("      ⏭️  Skipped (manual testing recommended)")
    return


def seed_settings(cursor, mode: str, terminal_name: str):
    """Seed settings for network configuration"""
    print(f"   ⚙️ Seeding Settings (Mode: {mode})...")

    role_value = "MASTER" if mode == "MASTER" else "SATELLITE"

    settings = [
        (
            "setting-company",
            "company_name",
            "Mercadinho Simulado (10 PCs)",
            "STRING",
            "general",
        ),
        ("setting-role", "network.role", role_value, "STRING", "network"),
        ("setting-terminal", "terminal.name", terminal_name, "STRING", "network"),
        ("setting-discovery", "auto_discovery", "true", "BOOLEAN", "network"),
    ]

    if mode == "MASTER":
        settings.append(
            ("setting-port", "network.server_port", "3847", "NUMBER", "network")
        )

    for s_id, key, val, typ, grp in settings:
        cursor.execute(
            """
            INSERT OR REPLACE INTO settings (id, key, value, type, group_name, updated_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (s_id, key, val, typ, grp, now(), now()),
        )

    print(f"      ✅ {len(settings)} settings configured")


def create_license_file(db_path: str):
    """Create license.json file"""
    license_path = os.path.join(os.path.dirname(db_path), "license.json")

    if os.path.exists(license_path):
        print("   📜 License file already exists")
        return

    license_data = {
        "key": "GIRO-SIMULATION-KEY-123",
        "activated_at": datetime.now(timezone.utc).isoformat(),
        "last_validated_at": datetime.now(timezone.utc).isoformat(),
        "info": {
            "key": "GIRO-SIMULATION-KEY-123",
            "status": "active",
            "message": "Ativado via Simulação",
            "valid": True,
            "expires_at": "2099-12-31T23:59:59Z",
            "days_remaining": 9999,
            "company_name": "Mercadinho Simulado (10 PCs)",
            "company_cnpj": "00.000.000/0001-00",
            "max_users": 100,
            "features": ["ALL"],
            "plan_type": "ENTERPRISE",
            "is_lifetime": True,
            "can_offline": True,
            "grace_period_days": 365,
            "admin_user": None,
        },
    }

    with open(license_path, "w") as f:
        json.dump(license_data, f, indent=2)

    print("   📜 License file created")


def main():
    if len(sys.argv) < 3:
        print("Usage: seed_database.py <DB_PATH> <MODE> [TERMINAL_NAME]")
        print("  MODE: MASTER | SATELLITE")
        print("  TERMINAL_NAME: optional, defaults to 'Terminal'")
        sys.exit(1)

    db_path = sys.argv[1]
    mode = sys.argv[2].upper()
    terminal_name = sys.argv[3] if len(sys.argv) > 3 else "Terminal"

    print(f"🌱 [SEED] Database: {db_path}")
    print(f"   Mode: {mode} | Terminal: {terminal_name}")
    print("-" * 50)

    # Wait for database to exist
    max_retries = 60
    for i in range(max_retries):
        if os.path.exists(db_path):
            break
        print(f"   ⏳ Waiting for database... ({i+1}/{max_retries})")
        import time

        time.sleep(0.5)
    else:
        print("   ❌ Database not found!")
        sys.exit(1)

    # Create license file
    create_license_file(db_path)

    # Connect and seed
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if migrations ran
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='employees'"
        )
        if not cursor.fetchone():
            print("   ❌ Database schema not ready (no employees table)")
            sys.exit(1)

        # Seed all data
        seed_employees(cursor)
        seed_categories(cursor)
        seed_suppliers(cursor)
        seed_products(cursor)
        seed_customers(cursor)
        seed_vehicle_brands(cursor)
        seed_vehicle_models(cursor)
        seed_services(cursor)
        seed_sample_sales(cursor)
        seed_settings(cursor, mode, terminal_name)

        conn.commit()
        conn.close()

        print("-" * 50)
        print(f"✅ Database seeded successfully!")
        print(f"   🔑 Admin PIN: 1234")
        print(f"   🔑 Manager PIN: 2345")
        print(f"   🔑 Cashier PINs: 3456, 4567")

    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
