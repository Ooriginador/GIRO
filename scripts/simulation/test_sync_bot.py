import json
import os
import sqlite3
import time
import uuid
from datetime import datetime

# Setup
SIM_DIR = "/tmp/giro-sim"
MASTER_DB = f"{SIM_DIR}/PC-PDV-01/data/GIRO/giro.db"
SATELLITE_DB = f"{SIM_DIR}/PC-PDV-02/data/GIRO/giro.db"
CHECK_INTERVAL_SEC = 2
SEARCH_TIMEOUT_SEC = 30


def get_connection(db_path):
    return sqlite3.connect(db_path)


def create_sale_on_satellite(db_path):
    print(f"🛍️  [BOT] Criando Venda no SATELLITE ({db_path})...")
    conn = get_connection(db_path)
    cur = conn.cursor()

    # Needs valid Employee and Session (We'll blindly pick one or fake it if constraints allow)
    # Since we injected 'admin-01', we use it.

    # 1. Open Cash Session if needed (Simplified: Assuming one open or insert one)
    session_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, "admin-01", 100.0, "OPEN", datetime.utcnow().isoformat()),
    )

    # 2. Create Sale
    sale_id = str(uuid.uuid4())
    total = 50.0

    sale_sql = """
    INSERT INTO sales (id, subtotal, total, payment_method, amount_paid, status, cash_session_id, employee_id, created_at, daily_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    cur.execute(
        sale_sql,
        (
            sale_id,
            total,
            total,
            "CASH",
            total,
            "COMPLETED",
            session_id,
            "admin-01",
            datetime.utcnow().isoformat(),
            999,
        ),
    )

    # 3. Add Item (Fake Product)
    prod_id = "prod-test-01"
    try:
        # Use valid columns: sale_price instead of price, internal_code, category_id
        cur.execute(
            """
            INSERT INTO products (id, internal_code, name, sale_price, current_stock, min_stock, unit, category_id, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                prod_id,
                "TEST-01",
                "Produto Teste Sync",
                10.0,
                100,
                5,
                "UNIT",
                "default-category",
                datetime.utcnow().isoformat(),
                datetime.utcnow().isoformat(),
            ),
        )
    except sqlite3.IntegrityError:
        pass  # Already exists

    item_id = str(uuid.uuid4())
    item_sql = """
    INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    cur.execute(
        item_sql, (item_id, sale_id, prod_id, "Produto Teste Sync", 5, 10.0, 50.0)
    )

    conn.commit()
    conn.close()

    print(f"   ✅ Venda Criada! ID: {sale_id}")
    return sale_id


def verify_on_master(db_path, sale_id):
    print(f"📡 [BOT] Monitorando MASTER ({db_path}) por sincronização...")

    start_time = time.time()

    while (time.time() - start_time) < SEARCH_TIMEOUT_SEC:
        try:
            conn = get_connection(db_path)
            cur = conn.cursor()
            cur.execute("SELECT id, total FROM sales WHERE id = ?", (sale_id,))
            row = cur.fetchone()
            conn.close()

            if row:
                print(f"   🎉 SUCESSO! Venda {sale_id} encontrada no Master!")
                print(f"      Total: {row[1]}")
                return True
        except Exception as e:
            print(f"   ⚠️ Erro ao ler master: {e}")

        print("      ... aguardando sync ...")
        time.sleep(CHECK_INTERVAL_SEC)

    print("   ❌ TIMEOUT: Venda não chegou no Master a tempo.")
    return False


if __name__ == "__main__":
    print("🤖 Iniciando Teste Automatizado de Sincronização SATELLITE -> MASTER")

    if not os.path.exists(MASTER_DB) or not os.path.exists(SATELLITE_DB):
        print("❌ Bancos de dados não encontrados. A simulação está rodando?")
        exit(1)

    sale_uuid = create_sale_on_satellite(SATELLITE_DB)
    success = verify_on_master(MASTER_DB, sale_uuid)

    if success:
        print("\n🏆 TESTE PASSOU: Sincronização Nativa Funcionando!")
        exit(0)
    else:
        print("\n💀 TESTE FALHOU: Verifique logs do giro-desktop.")
        exit(1)
