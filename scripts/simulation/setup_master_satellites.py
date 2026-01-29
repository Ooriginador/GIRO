#!/usr/bin/env python3
"""
┌─────────────────────────────────────────────────────────────────────┐
│         🔧 GIRO Master/Satellite Setup Script                      │
│                  Arkheion Corp © 2026                               │
├─────────────────────────────────────────────────────────────────────┤
│  Configuração CORRETA da rede GIRO:                                │
│                                                                     │
│  ✅ MASTER (PC-PDV-01): Recebe dados completos                     │
│  ✅ SATELLITES (9 PCs): Apenas KEY de rede                         │
│                                                                     │
│  Os satellites sincronizam automaticamente com o Master            │
│  via WebSocket quando conectam à rede.                             │
└─────────────────────────────────────────────────────────────────────┘
"""

import hashlib
import hmac
import json
import random
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

# ============================================================================
# CONFIGURATION
# ============================================================================

SIM_DIR = Path("/tmp/giro-sim")
NETWORK_SECRET = "giro-sim-network-2026"  # Shared secret for all PCs
MASTER_IP = "127.0.0.1"
MASTER_PORT = 3847
NOW = datetime.now()

# PC Roles
MASTER_PC = "PC-PDV-01"
SATELLITE_PCS = [
    "PC-PDV-02",
    "PC-ESTQ",
    "PC-GER",
    "PC-VEN-01",
    "PC-VEN-02",
    "PC-ADM",
    "PC-FIN",
    "PC-CAD",
    "PC-RESERVA",
]

# ============================================================================
# DATA GENERATORS (Only for Master)
# ============================================================================

CATEGORIES = [
    {"id": "cat-motor", "name": "Motor", "color": "#ef4444", "icon": "cog"},
    {"id": "cat-filtros", "name": "Filtros", "color": "#f97316", "icon": "filter"},
    {
        "id": "cat-correias",
        "name": "Correias e Tensores",
        "color": "#f59e0b",
        "icon": "refresh-cw",
    },
    {"id": "cat-velas", "name": "Velas e Bobinas", "color": "#eab308", "icon": "zap"},
    {"id": "cat-freios", "name": "Freios", "color": "#22c55e", "icon": "octagon"},
    {"id": "cat-pastilhas", "name": "Pastilhas", "color": "#10b981", "icon": "square"},
    {
        "id": "cat-discos",
        "name": "Discos e Tambores",
        "color": "#14b8a6",
        "icon": "disc",
    },
    {"id": "cat-suspensao", "name": "Suspensão", "color": "#3b82f6", "icon": "truck"},
    {
        "id": "cat-amortecedores",
        "name": "Amortecedores",
        "color": "#6366f1",
        "icon": "arrow-down",
    },
    {"id": "cat-eletrica", "name": "Elétrica", "color": "#8b5cf6", "icon": "zap"},
    {"id": "cat-baterias", "name": "Baterias", "color": "#a855f7", "icon": "battery"},
    {
        "id": "cat-oleo",
        "name": "Óleos e Lubrificantes",
        "color": "#d946ef",
        "icon": "droplet",
    },
    {
        "id": "cat-arrefecimento",
        "name": "Arrefecimento",
        "color": "#ec4899",
        "icon": "thermometer",
    },
]

BRANDS = [
    "BOSCH",
    "NGK",
    "MAHLE",
    "MANN",
    "DENSO",
    "SACHS",
    "MONROE",
    "GATES",
    "CONTINENTAL",
    "MOURA",
    "HELIAR",
]
VEHICLES = [
    "GOL G5",
    "GOL G6",
    "ONIX",
    "HB20",
    "ARGO",
    "POLO",
    "VIRTUS",
    "T-CROSS",
    "RENEGADE",
    "COMPASS",
    "TRACKER",
    "CRETA",
    "KICKS",
]


def generate_products(count: int = 150) -> List[Dict[str, Any]]:
    """Gera produtos de autopeças realistas"""
    products = []
    product_templates = [
        ("Filtro de Óleo", "cat-filtros", 25, 45),
        ("Filtro de Ar", "cat-filtros", 35, 65),
        ("Filtro de Combustível", "cat-filtros", 40, 80),
        ("Filtro de Cabine", "cat-filtros", 30, 55),
        ("Correia Dentada", "cat-correias", 80, 180),
        ("Tensor da Correia", "cat-correias", 120, 250),
        ("Kit Correia", "cat-correias", 280, 450),
        ("Vela de Ignição", "cat-velas", 25, 65),
        ("Bobina de Ignição", "cat-velas", 150, 350),
        ("Jogo de Velas", "cat-velas", 80, 180),
        ("Pastilha de Freio Diant.", "cat-pastilhas", 80, 180),
        ("Pastilha de Freio Tras.", "cat-pastilhas", 60, 140),
        ("Disco de Freio", "cat-discos", 150, 320),
        ("Tambor de Freio", "cat-discos", 120, 250),
        ("Amortecedor Diant.", "cat-amortecedores", 180, 380),
        ("Amortecedor Tras.", "cat-amortecedores", 150, 320),
        ("Kit Amortecedor", "cat-amortecedores", 350, 650),
        ("Bateria 60Ah", "cat-baterias", 380, 520),
        ("Bateria 45Ah", "cat-baterias", 280, 420),
        ("Óleo Motor 5W30", "cat-oleo", 35, 85),
        ("Óleo Motor 10W40", "cat-oleo", 28, 65),
        ("Aditivo Radiador", "cat-arrefecimento", 25, 55),
        ("Bomba D'Água", "cat-arrefecimento", 120, 280),
    ]

    for i in range(count):
        template = random.choice(product_templates)
        brand = random.choice(BRANDS)
        vehicle = random.choice(VEHICLES)

        cost = round(random.uniform(template[2], template[3]), 2)
        price = round(cost * random.uniform(1.3, 1.8), 2)

        product = {
            "id": str(uuid.uuid4()),
            "name": f"{template[0]} {brand} - {vehicle}",
            "sku": f"{brand[:3].upper()}{random.randint(10000, 99999)}",
            "barcode": f"789{random.randint(1000000000, 9999999999)}",
            "category_id": template[1],
            "cost_price": cost,
            "sale_price": price,
            "stock_quantity": random.randint(0, 50),
            "min_stock": random.randint(2, 10),
            "max_stock": random.randint(50, 100),
            "unit": "UN",
            "is_active": True,
            "created_at": (NOW - timedelta(days=random.randint(1, 365))).isoformat(),
            "updated_at": NOW.isoformat(),
        }
        products.append(product)

    return products


def generate_customers(count: int = 80) -> List[Dict[str, Any]]:
    """Gera clientes realistas"""
    first_names = [
        "João",
        "Maria",
        "José",
        "Ana",
        "Carlos",
        "Juliana",
        "Pedro",
        "Fernanda",
        "Lucas",
        "Camila",
    ]
    last_names = [
        "Silva",
        "Santos",
        "Oliveira",
        "Souza",
        "Lima",
        "Pereira",
        "Costa",
        "Ferreira",
        "Almeida",
        "Carvalho",
    ]

    customers = []
    for i in range(count):
        fname = random.choice(first_names)
        lname = random.choice(last_names)

        # CPF válido (formato)
        cpf = f"{random.randint(100,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(10,99)}"

        customer = {
            "id": str(uuid.uuid4()),
            "name": f"{fname} {lname}",
            "document": cpf,
            "document_type": "CPF",
            "email": f"{fname.lower()}.{lname.lower()}{random.randint(1,99)}@email.com",
            "phone": f"({random.randint(11,99)}) 9{random.randint(1000,9999)}-{random.randint(1000,9999)}",
            "address": f"Rua {random.choice(['das Flores', 'dos Pinheiros', 'das Acácias', 'Principal'])}, {random.randint(1,999)}",
            "city": random.choice(
                [
                    "São Paulo",
                    "Rio de Janeiro",
                    "Belo Horizonte",
                    "Curitiba",
                    "Porto Alegre",
                ]
            ),
            "state": random.choice(["SP", "RJ", "MG", "PR", "RS"]),
            "is_active": True,
            "notes": f"Veículo: {random.choice(VEHICLES)}",
            "created_at": (NOW - timedelta(days=random.randint(1, 730))).isoformat(),
            "updated_at": NOW.isoformat(),
        }
        customers.append(customer)

    return customers


def generate_suppliers(count: int = 12) -> List[Dict[str, Any]]:
    """Gera fornecedores"""
    suppliers_data = [
        ("Distribuidora AutoMax", "Peças em geral"),
        ("Importadora Nippon", "Peças japonesas"),
        ("Grupo Motor Parts", "Motor e câmbio"),
        ("Freios Brasil", "Sistema de freios"),
        ("Suspensão Total", "Suspensão e direção"),
        ("Elétrica Master", "Elétrica automotiva"),
        ("Baterias Express", "Baterias"),
        ("Lubrificantes Premium", "Óleos e aditivos"),
        ("Filtros & Cia", "Filtros"),
        ("Auto Peças Nacional", "Peças nacionais"),
        ("Import Tech", "Peças importadas"),
        ("Arrefecimento SP", "Sistema de arrefecimento"),
    ]

    suppliers = []
    for i, (name, specialty) in enumerate(suppliers_data[:count]):
        supplier = {
            "id": str(uuid.uuid4()),
            "name": name,
            "fantasy_name": name.split()[0],
            "document": f"{random.randint(10,99)}.{random.randint(100,999)}.{random.randint(100,999)}/0001-{random.randint(10,99)}",
            "document_type": "CNPJ",
            "email": f"contato@{name.lower().replace(' ', '')}.com.br",
            "phone": f"(11) {random.randint(3000,3999)}-{random.randint(1000,9999)}",
            "address": f"Av. Industrial, {random.randint(100, 9999)}",
            "city": "São Paulo",
            "state": "SP",
            "is_active": True,
            "notes": specialty,
            "created_at": (NOW - timedelta(days=random.randint(365, 1095))).isoformat(),
            "updated_at": NOW.isoformat(),
        }
        suppliers.append(supplier)

    return suppliers


def generate_employees() -> List[Dict[str, Any]]:
    """Gera funcionários para o sistema"""
    employees = [
        {"name": "Admin Sistema", "role": "ADMIN", "pin": "1234"},
        {"name": "Carlos Gerente", "role": "GERENTE", "pin": "2345"},
        {"name": "Ana Caixa", "role": "CAIXA", "pin": "3456"},
        {"name": "Pedro Vendedor", "role": "VENDEDOR", "pin": "4567"},
        {"name": "Maria Estoque", "role": "ESTOQUISTA", "pin": "5678"},
        {"name": "João Financeiro", "role": "FINANCEIRO", "pin": "6789"},
        {"name": "Fernanda Cadastro", "role": "CADASTRO", "pin": "7890"},
    ]

    result = []
    for emp in employees:
        result.append(
            {
                "id": str(uuid.uuid4()),
                "name": emp["name"],
                "role": emp["role"],
                "pin": emp["pin"],  # PIN direto, sem hash
                "is_active": True,
                "created_at": (
                    NOW - timedelta(days=random.randint(30, 365))
                ).isoformat(),
                "updated_at": NOW.isoformat(),
            }
        )

    return result


# ============================================================================
# DATABASE OPERATIONS
# ============================================================================


def find_db_path(pc_name: str) -> Path | None:
    """Encontra o banco de dados de um PC"""
    pc_dir = SIM_DIR / pc_name

    # Tentar encontrar em locais comuns
    possible_paths = [
        pc_dir / "data" / "GIRO" / "giro.db",
        pc_dir / "data" / "giro.db",
        pc_dir / "giro.db",
    ]

    for path in possible_paths:
        if path.exists():
            return path

    return None


def configure_master(db_path: Path):
    """Configura o Master com dados completos"""
    print(f"\n{'='*60}")
    print(f"🏆 CONFIGURANDO MASTER: {MASTER_PC}")
    print(f"{'='*60}")
    print(f"📂 DB: {db_path}")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # 1. Configurar como MASTER
    settings = [
        ("network.role", "MASTER"),
        ("network.secret", NETWORK_SECRET),
        ("network.port", str(MASTER_PORT)),
        ("pdv.name", "PDV Principal"),
        ("company.name", "Auto Peças Exemplo LTDA"),
        ("company.document", "12.345.678/0001-90"),
    ]

    for key, value in settings:
        setting_id = f"setting-{key.replace('.', '-')}"
        cursor.execute(
            """
            INSERT OR REPLACE INTO settings (id, key, value, type, group_name, updated_at)
            VALUES (?, ?, ?, 'STRING', 'network', datetime('now'))
        """,
            (setting_id, key, value),
        )
    print(f"   ✅ Configurações de rede definidas (role=MASTER)")

    # 2. Inserir categorias
    categories = CATEGORIES
    for cat in categories:
        cursor.execute(
            """
            INSERT OR REPLACE INTO categories (id, name, color, icon, parent_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, datetime('now'), datetime('now'))
        """,
            (cat["id"], cat["name"], cat["color"], cat["icon"]),
        )
    print(f"   ✅ {len(categories)} categorias inseridas")

    # 3. Inserir produtos
    products = generate_products(150)
    for p in products:
        cursor.execute(
            """
            INSERT OR REPLACE INTO products 
            (id, name, internal_code, barcode, category_id, cost_price, sale_price, 
             current_stock, min_stock, max_stock, unit, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                p["id"],
                p["name"],
                p["sku"],  # maps to internal_code
                p["barcode"],
                p["category_id"],
                p["cost_price"],
                p["sale_price"],
                p["stock_quantity"],  # maps to current_stock
                p["min_stock"],
                p["max_stock"],
                p["unit"],
                p["is_active"],
                p["created_at"],
                p["updated_at"],
            ),
        )
    print(f"   ✅ {len(products)} produtos inseridos")

    # 4. Inserir clientes
    customers = generate_customers(80)
    for c in customers:
        cursor.execute(
            """
            INSERT OR REPLACE INTO customers
            (id, name, cpf, email, phone, street, city, state, 
             is_active, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                c["id"],
                c["name"],
                c["document"],  # cpf
                c["email"],
                c["phone"],
                c["address"],  # street
                c["city"],
                c["state"],
                c["is_active"],
                c["notes"],
                c["created_at"],
                c["updated_at"],
            ),
        )
    print(f"   ✅ {len(customers)} clientes inseridos")

    # 5. Inserir fornecedores
    suppliers = generate_suppliers(12)
    for s in suppliers:
        cursor.execute(
            """
            INSERT OR REPLACE INTO suppliers
            (id, name, trade_name, cnpj, email, phone, 
             address, city, state, is_active, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                s["id"],
                s["name"],
                s["fantasy_name"],  # trade_name
                s["document"],  # cnpj
                s["email"],
                s["phone"],
                s["address"],
                s["city"],
                s["state"],
                s["is_active"],
                s["notes"],
                s["created_at"],
                s["updated_at"],
            ),
        )
    print(f"   ✅ {len(suppliers)} fornecedores inseridos")

    # 6. Inserir funcionários
    employees = generate_employees()
    for e in employees:
        cursor.execute(
            """
            INSERT OR REPLACE INTO employees
            (id, name, role, pin, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                e["id"],
                e["name"],
                e["role"],
                e["pin"],
                e["is_active"],
                e["created_at"],
                e["updated_at"],
            ),
        )
    print(f"   ✅ {len(employees)} funcionários inseridos")

    conn.commit()
    conn.close()

    print(f"\n   🎉 MASTER configurado com sucesso!")
    print(f"   📊 Total: {len(categories)} categorias, {len(products)} produtos,")
    print(f"            {len(customers)} clientes, {len(suppliers)} fornecedores,")
    print(f"            {len(employees)} funcionários")


def configure_satellite(db_path: Path, pc_name: str, port_offset: int):
    """Configura um Satellite apenas com a KEY de rede"""
    print(f"\n   🛰️  {pc_name}...")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Apenas configurações de rede - NÃO popular dados!
    satellite_port = MASTER_PORT + port_offset
    settings = [
        ("network.role", "SATELLITE"),
        ("network.secret", NETWORK_SECRET),
        ("network.master_ip", MASTER_IP),
        ("network.master_port", str(MASTER_PORT)),
        ("network.port", str(satellite_port)),
        ("pdv.name", f"PDV {pc_name}"),
    ]

    for key, value in settings:
        setting_id = f"setting-{key.replace('.', '-')}-{pc_name}"
        cursor.execute(
            """
            INSERT OR REPLACE INTO settings (id, key, value, type, group_name, updated_at)
            VALUES (?, ?, ?, 'STRING', 'network', datetime('now'))
        """,
            (setting_id, key, value),
        )

    # Inserir apenas o admin para poder acessar (funcionários sincronizam depois)
    cursor.execute(
        """
        INSERT OR REPLACE INTO employees
        (id, name, role, pin, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """,
        (f"admin-{pc_name}", "Admin Local", "ADMIN", "1234", True),
    )

    conn.commit()
    conn.close()

    print(f"      ✅ Configurado (role=SATELLITE, port={satellite_port})")


def main():
    print(
        """
╔═══════════════════════════════════════════════════════════════════════╗
║        🔧 GIRO Network Setup - Master/Satellite Configuration        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Arquitetura:                                                         ║
║                                                                       ║
║  📍 MASTER (PC-PDV-01)                                               ║
║     └── Dados completos (produtos, clientes, funcionários...)        ║
║                                                                       ║
║  🛰️  SATELLITES (9 PCs)                                              ║
║     └── Apenas KEY de rede (dados sincronizam automaticamente)       ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
"""
    )

    # Verificar se diretório de simulação existe
    if not SIM_DIR.exists():
        print(f"❌ Diretório de simulação não encontrado: {SIM_DIR}")
        print("   Execute primeiro: bash scripts/run-real-10-instances.sh")
        return

    # 1. Configurar MASTER
    master_db = find_db_path(MASTER_PC)
    if not master_db:
        print(f"❌ Banco do Master não encontrado: {MASTER_PC}")
        return

    configure_master(master_db)

    # 2. Configurar SATELLITES
    print(f"\n{'='*60}")
    print(f"🛰️  CONFIGURANDO SATELLITES (apenas KEY de rede)")
    print(f"{'='*60}")

    configured = 0
    for i, pc_name in enumerate(SATELLITE_PCS, start=1):
        db_path = find_db_path(pc_name)
        if db_path:
            configure_satellite(db_path, pc_name, i)
            configured += 1
        else:
            print(f"   ⚠️  {pc_name}: banco não encontrado, pulando...")

    print(f"\n{'='*60}")
    print(f"✅ CONFIGURAÇÃO CONCLUÍDA")
    print(f"{'='*60}")
    print(f"   • Master: {MASTER_PC} (dados completos)")
    print(f"   • Satellites: {configured} configurados (apenas KEY)")
    print(f"   • Network Secret: {NETWORK_SECRET}")
    print(f"\n💡 Os Satellites irão sincronizar dados automaticamente")
    print(f"   quando conectarem ao Master via WebSocket.")
    print(f"\n🔄 Para forçar sync, no Satellite: Configurações > Rede > Sincronizar")


if __name__ == "__main__":
    main()
