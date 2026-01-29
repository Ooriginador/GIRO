import hashlib
import hmac
import json
import os
import sqlite3
import sys
import time
from datetime import datetime

# Usage: python3 inject_db.py <DB_PATH> <MODE>
# MODE: MASTER | SATELLITE

if len(sys.argv) < 3:
    print("Usage: inject_db.py <DB_PATH> <MODE>")
    sys.exit(1)

db_path = sys.argv[1]
mode = sys.argv[2]
secret_key = os.environ.get("PIN_HMAC_KEY", "simulated-secret-key-123")
pin = "1234"

# Generate Pin Hash (HMAC-SHA256)
h = hmac.new(secret_key.encode(), pin.encode(), hashlib.sha256)
pin_hash = h.hexdigest()

print(f"💉 [INJECTOR] Target: {db_path} | Mode: {mode}")

# 0. INJECT LICENSE FILE
license_path = os.path.join(os.path.dirname(db_path), "license.json")
try:
    if not os.path.exists(license_path):
        # Create Dummy License
        license_data = {
            "key": "GIRO-SIMULATION-KEY-123",
            "activated_at": datetime.utcnow().isoformat() + "Z",
            "last_validated_at": datetime.utcnow().isoformat() + "Z",
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
        print("   📜 License File Created (Simulated)")
except Exception as e:
    print(f"   ❌ Error creating license file: {e}")


# Wait for DB creation (Migrations handled by the app)
max_retries = 60
for i in range(max_retries):
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Check if migrations ran (check for 'settings' table)
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='settings';"
            )
            if cursor.fetchone():

                # 1. Create ADMIN User (Only needed on Master usually, but good for all just in case)
                cursor.execute("SELECT id FROM employees WHERE role='ADMIN'")
                if not cursor.fetchone():
                    # print("   👤 Creating Admin User...")
                    cursor.execute(
                        """
                        INSERT INTO employees (id, name, cpf, email, pin, role, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                        (
                            "admin-01",
                            "Admin Simulado",
                            "000.000.000-00",
                            "admin@giro.local",
                            pin_hash,
                            "ADMIN",
                            1,
                        ),
                    )

                # 2. Configure SETTINGS based on Mode
                # print(f"   ⚙️  Configuring Mode: {mode}")

                # FIX: Must be snake_case for Serde (master, satellite, standalone)
                ops_mode = "master" if mode == "MASTER" else "satellite"

                settings = [
                    (
                        "setting-company",
                        "company_name",
                        "Mercadinho Simulado (10 PCs)",
                        "STRING",
                        "general",
                    ),
                    ("setting-mode", "operation_mode", ops_mode, "STRING", "network"),
                ]

                if mode == "MASTER":
                    settings.append(
                        ("setting-port", "server_port", "3000", "NUMBER", "network")
                    )
                    settings.append(
                        (
                            "setting-discovery",
                            "auto_discovery",
                            "true",
                            "BOOLEAN",
                            "network",
                        )
                    )
                else:
                    settings.append(
                        (
                            "setting-discovery",
                            "auto_discovery",
                            "true",
                            "BOOLEAN",
                            "network",
                        )
                    )
                    # Optional: Force connect to Master IP if known (Localhost loopback difficult with mDNS?)
                    # Let's rely on mDNS first.

                for s_id, key, val, typ, grp in settings:
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO settings (id, key, value, type, group_name, updated_at, created_at)
                        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                        (s_id, key, val, typ, grp),
                    )

                # 3. Create License File (Bypass Activation)
                # Note: This is separate from DB, usually in ../license.json
                # We handle this in the bash script

                conn.commit()
                conn.close()
                print(f"   ✅ Injection Success for {mode}!")
                sys.exit(0)
            else:
                pass  # Table not ready
        except Exception as e:
            print(f"   ⚠️  DB Access Error: {e}")

    # print("   ⏳ Waiting for DB...")
    time.sleep(0.5)

print("   ❌ Timeout waiting for DB creation")
sys.exit(1)
