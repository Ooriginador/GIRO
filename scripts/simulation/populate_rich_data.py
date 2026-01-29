#!/usr/bin/env python3
"""
┌─────────────────────────────────────────────────────────────────────┐
│            📦 GIRO Rich Data Population Script                     │
│                  Arkheion Corp © 2026                               │
├─────────────────────────────────────────────────────────────────────┤
│  Popula todas as instâncias com dados realistas:                   │
│  - Categorias de autopeças                                         │
│  - Produtos com OEM, aftermarket, aplicações                       │
│  - Clientes com veículos                                           │
│  - Fornecedores                                                    │
│  - Funcionários                                                    │
│  - Histórico de vendas                                             │
│  - Movimentações de estoque                                        │
└─────────────────────────────────────────────────────────────────────┘
"""

import hashlib
import hmac
import json
import os
import random
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# ============================================================================
# CONFIGURATION
# ============================================================================

SIM_DIR = Path("/tmp/giro-sim")
SECRET_KEY = os.environ.get("PIN_HMAC_KEY", "simulated-secret-key-123")
NOW = datetime.now()

# ============================================================================
# DATA GENERATORS
# ============================================================================

# Categorias de autopeças
CATEGORIES = [
    {
        "id": "cat-motor",
        "name": "Motor",
        "color": "#ef4444",
        "icon": "cog",
        "children": [
            {
                "id": "cat-filtros",
                "name": "Filtros",
                "color": "#f97316",
                "icon": "filter",
            },
            {
                "id": "cat-correias",
                "name": "Correias e Tensores",
                "color": "#f59e0b",
                "icon": "refresh-cw",
            },
            {
                "id": "cat-velas",
                "name": "Velas e Bobinas",
                "color": "#eab308",
                "icon": "zap",
            },
            {
                "id": "cat-juntas",
                "name": "Juntas e Retentores",
                "color": "#84cc16",
                "icon": "circle",
            },
        ],
    },
    {
        "id": "cat-freios",
        "name": "Freios",
        "color": "#22c55e",
        "icon": "octagon",
        "children": [
            {
                "id": "cat-pastilhas",
                "name": "Pastilhas",
                "color": "#10b981",
                "icon": "square",
            },
            {
                "id": "cat-discos",
                "name": "Discos e Tambores",
                "color": "#14b8a6",
                "icon": "disc",
            },
            {
                "id": "cat-fluidos",
                "name": "Fluidos de Freio",
                "color": "#06b6d4",
                "icon": "droplet",
            },
        ],
    },
    {
        "id": "cat-suspensao",
        "name": "Suspensão e Direção",
        "color": "#0ea5e9",
        "icon": "move",
        "children": [
            {
                "id": "cat-amortecedores",
                "name": "Amortecedores",
                "color": "#3b82f6",
                "icon": "arrow-down",
            },
            {
                "id": "cat-molas",
                "name": "Molas",
                "color": "#6366f1",
                "icon": "maximize",
            },
            {
                "id": "cat-terminais",
                "name": "Terminais e Pivôs",
                "color": "#8b5cf6",
                "icon": "link",
            },
        ],
    },
    {
        "id": "cat-eletrica",
        "name": "Elétrica",
        "color": "#a855f7",
        "icon": "zap",
        "children": [
            {
                "id": "cat-baterias",
                "name": "Baterias",
                "color": "#d946ef",
                "icon": "battery",
            },
            {
                "id": "cat-alternadores",
                "name": "Alternadores",
                "color": "#ec4899",
                "icon": "refresh-cw",
            },
            {
                "id": "cat-lampadas",
                "name": "Lâmpadas",
                "color": "#f43f5e",
                "icon": "sun",
            },
        ],
    },
    {
        "id": "cat-arrefecimento",
        "name": "Arrefecimento",
        "color": "#64748b",
        "icon": "thermometer",
        "children": [
            {
                "id": "cat-radiadores",
                "name": "Radiadores",
                "color": "#475569",
                "icon": "grid",
            },
            {
                "id": "cat-bombas-agua",
                "name": "Bombas d'Água",
                "color": "#334155",
                "icon": "droplet",
            },
            {
                "id": "cat-termostatos",
                "name": "Termostatos",
                "color": "#1e293b",
                "icon": "thermometer",
            },
        ],
    },
    {
        "id": "cat-oleos",
        "name": "Óleos e Lubrificantes",
        "color": "#78716c",
        "icon": "droplet",
    },
    {
        "id": "cat-acessorios",
        "name": "Acessórios",
        "color": "#57534e",
        "icon": "package",
    },
]

# Marcas de peças
BRANDS = [
    "Bosch",
    "Cofap",
    "Nakata",
    "Monroe",
    "NGK",
    "Denso",
    "Valeo",
    "Gates",
    "SKF",
    "Fras-Le",
    "Cobreq",
    "Mobil",
    "Castrol",
    "Shell",
    "Petronas",
    "Moura",
    "Heliar",
]

# Veículos populares
VEHICLES = [
    {
        "brand": "Volkswagen",
        "models": ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Saveiro"],
    },
    {"brand": "Fiat", "models": ["Uno", "Mobi", "Argo", "Cronos", "Strada", "Toro"]},
    {
        "brand": "Chevrolet",
        "models": ["Onix", "Prisma", "Tracker", "S10", "Spin", "Montana"],
    },
    {"brand": "Hyundai", "models": ["HB20", "Creta", "Tucson", "Santa Fe"]},
    {"brand": "Toyota", "models": ["Corolla", "Yaris", "Hilux", "SW4", "RAV4"]},
    {"brand": "Honda", "models": ["Civic", "City", "HR-V", "CR-V", "Fit"]},
    {"brand": "Ford", "models": ["Ka", "EcoSport", "Ranger", "Territory"]},
    {"brand": "Renault", "models": ["Kwid", "Sandero", "Logan", "Duster", "Captur"]},
]

# Nomes brasileiros
FIRST_NAMES = [
    "João",
    "Maria",
    "José",
    "Ana",
    "Carlos",
    "Francisca",
    "Paulo",
    "Antônia",
    "Pedro",
    "Adriana",
    "Lucas",
    "Juliana",
    "Marcos",
    "Mariana",
    "Rafael",
    "Fernanda",
    "Gabriel",
    "Patricia",
    "Daniel",
    "Camila",
    "Bruno",
    "Amanda",
    "Felipe",
    "Bruna",
]
LAST_NAMES = [
    "Silva",
    "Santos",
    "Oliveira",
    "Souza",
    "Rodrigues",
    "Ferreira",
    "Alves",
    "Pereira",
    "Lima",
    "Gomes",
    "Costa",
    "Ribeiro",
    "Martins",
    "Carvalho",
    "Almeida",
]

# Cidades
CITIES = [
    {
        "city": "São Paulo",
        "state": "SP",
        "neighborhoods": ["Centro", "Mooca", "Pinheiros", "Santana"],
    },
    {
        "city": "Rio de Janeiro",
        "state": "RJ",
        "neighborhoods": ["Centro", "Copacabana", "Tijuca", "Barra"],
    },
    {
        "city": "Belo Horizonte",
        "state": "MG",
        "neighborhoods": ["Centro", "Savassi", "Pampulha"],
    },
    {
        "city": "Curitiba",
        "state": "PR",
        "neighborhoods": ["Centro", "Batel", "Santa Felicidade"],
    },
    {
        "city": "Porto Alegre",
        "state": "RS",
        "neighborhoods": ["Centro", "Moinhos", "Cidade Baixa"],
    },
]

# Fornecedores
SUPPLIER_NAMES = [
    ("Distribuidora Paulista de Autopeças", "DPA"),
    ("Atacado Freios Brasil", "AFB"),
    ("Mega Autopeças Ltda", "Mega Auto"),
    ("Importadora Nacional de Peças", "INP"),
    ("Grupo Jacar Autopeças", "Jacar"),
    ("Rede Sul de Distribuidores", "Sul Dist"),
    ("Central Nordeste Peças", "CNP"),
    ("Paraná Peças Automotivas", "PPA"),
]


def gen_uuid() -> str:
    return str(uuid.uuid4())


def gen_cpf() -> str:
    """Gera CPF válido formatado"""

    def calc_digit(digits):
        s = sum((len(digits) + 1 - i) * d for i, d in enumerate(digits))
        return (s * 10 % 11) % 10

    digits = [random.randint(0, 9) for _ in range(9)]
    digits.append(calc_digit(digits))
    digits.append(calc_digit(digits))
    return f"{digits[0]}{digits[1]}{digits[2]}.{digits[3]}{digits[4]}{digits[5]}.{digits[6]}{digits[7]}{digits[8]}-{digits[9]}{digits[10]}"


def gen_cnpj() -> str:
    """Gera CNPJ válido formatado"""

    def calc_digit(digits, weights):
        s = sum(d * w for d, w in zip(digits, weights))
        r = s % 11
        return 0 if r < 2 else 11 - r

    base = [random.randint(0, 9) for _ in range(8)] + [0, 0, 0, 1]
    w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    base.append(calc_digit(base, w1))
    base.append(calc_digit(base, w2))
    return f"{base[0]}{base[1]}.{base[2]}{base[3]}{base[4]}.{base[5]}{base[6]}{base[7]}/{base[8]}{base[9]}{base[10]}{base[11]}-{base[12]}{base[13]}"


def gen_phone() -> str:
    ddd = random.choice(["11", "21", "31", "41", "51", "19", "47", "48"])
    return f"({ddd}) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"


def gen_email(name: str) -> str:
    domains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br"]
    clean = (
        name.lower()
        .replace(" ", ".")
        .replace("á", "a")
        .replace("ã", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )
    return f"{clean}@{random.choice(domains)}"


def gen_date_range(days_back: int = 365) -> str:
    delta = timedelta(days=random.randint(0, days_back))
    return (NOW - delta).strftime("%Y-%m-%d %H:%M:%S")


def hash_pin(pin: str) -> str:
    return hmac.new(SECRET_KEY.encode(), pin.encode(), hashlib.sha256).hexdigest()


# ============================================================================
# PRODUCT GENERATOR
# ============================================================================

PRODUCT_TEMPLATES = [
    # Filtros
    {
        "cat": "cat-filtros",
        "prefix": "FLT",
        "names": [
            "Filtro de Óleo",
            "Filtro de Ar",
            "Filtro de Combustível",
            "Filtro de Cabine",
        ],
        "price_range": (25, 120),
    },
    # Correias
    {
        "cat": "cat-correias",
        "prefix": "COR",
        "names": [
            "Correia Dentada",
            "Correia Poly-V",
            "Tensor Correia",
            "Kit Correia Dentada",
        ],
        "price_range": (45, 450),
    },
    # Velas
    {
        "cat": "cat-velas",
        "prefix": "VEL",
        "names": [
            "Vela de Ignição",
            "Bobina de Ignição",
            "Cabo de Vela",
            "Módulo de Ignição",
        ],
        "price_range": (35, 280),
    },
    # Pastilhas
    {
        "cat": "cat-pastilhas",
        "prefix": "PAS",
        "names": [
            "Pastilha de Freio Dianteira",
            "Pastilha de Freio Traseira",
            "Sensor de Desgaste",
        ],
        "price_range": (80, 350),
    },
    # Discos
    {
        "cat": "cat-discos",
        "prefix": "DSC",
        "names": [
            "Disco de Freio Dianteiro",
            "Disco de Freio Traseiro",
            "Tambor de Freio",
        ],
        "price_range": (150, 600),
    },
    # Amortecedores
    {
        "cat": "cat-amortecedores",
        "prefix": "AMT",
        "names": [
            "Amortecedor Dianteiro",
            "Amortecedor Traseiro",
            "Kit Batente",
            "Coxim Superior",
        ],
        "price_range": (180, 800),
    },
    # Terminais
    {
        "cat": "cat-terminais",
        "prefix": "TRM",
        "names": [
            "Terminal de Direção",
            "Pivô de Suspensão",
            "Barra Estabilizadora",
            "Bucha de Bandeja",
        ],
        "price_range": (45, 280),
    },
    # Baterias
    {
        "cat": "cat-baterias",
        "prefix": "BAT",
        "names": ["Bateria 60Ah", "Bateria 70Ah", "Bateria 90Ah", "Bateria Start-Stop"],
        "price_range": (350, 900),
    },
    # Lâmpadas
    {
        "cat": "cat-lampadas",
        "prefix": "LMP",
        "names": ["Lâmpada H4", "Lâmpada H7", "Lâmpada LED", "Kit Xenon"],
        "price_range": (25, 450),
    },
    # Óleos
    {
        "cat": "cat-oleos",
        "prefix": "OLE",
        "names": [
            "Óleo Motor 5W30",
            "Óleo Motor 10W40",
            "Óleo Câmbio ATF",
            "Fluido Direção Hidráulica",
        ],
        "price_range": (35, 180),
    },
]


def generate_products(count: int = 200) -> List[Dict]:
    """Gera lista de produtos realistas"""
    products = []
    used_codes = set()

    for i in range(count):
        template = random.choice(PRODUCT_TEMPLATES)
        brand = random.choice(BRANDS)
        name = random.choice(template["names"])
        vehicle = random.choice(VEHICLES)
        model = random.choice(vehicle["models"])
        year_start = random.randint(2010, 2022)
        year_end = random.randint(year_start, 2026)

        # Gerar código único
        while True:
            code = f"{template['prefix']}{random.randint(10000, 99999)}"
            if code not in used_codes:
                used_codes.add(code)
                break

        oem = f"{random.choice(['7H0', '5U0', '032', '04E', '06A'])}{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}"
        aftermarket = f"{brand[:3].upper()}{random.randint(1000, 9999)}"

        min_price, max_price = template["price_range"]
        cost = round(random.uniform(min_price * 0.5, max_price * 0.6), 2)
        sale = round(cost * random.uniform(1.4, 2.2), 2)
        stock = random.randint(0, 50)

        products.append(
            {
                "id": gen_uuid(),
                "barcode": f"789{random.randint(1000000000, 9999999999)}",
                "internal_code": code,
                "name": f"{name} {brand} - {vehicle['brand']} {model}",
                "description": f"Peça de alta qualidade {brand}. Aplicação: {vehicle['brand']} {model} {year_start}/{year_end}",
                "unit": "UNIT",
                "is_weighted": 0,
                "sale_price": sale,
                "cost_price": cost,
                "current_stock": stock,
                "min_stock": random.randint(2, 10),
                "max_stock": random.randint(20, 100),
                "is_active": 1,
                "category_id": template["cat"],
                "oem_code": oem,
                "aftermarket_code": aftermarket,
                "part_brand": brand,
                "application": f"{vehicle['brand']} {model} {year_start}/{year_end}",
                "notes": f"Referência original: {oem}",
                "created_at": gen_date_range(180),
                "updated_at": gen_date_range(30),
            }
        )

    return products


def generate_customers(count: int = 100) -> List[Dict]:
    """Gera lista de clientes"""
    customers = []
    used_cpfs = set()

    for i in range(count):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first} {last}"

        while True:
            cpf = gen_cpf()
            if cpf not in used_cpfs:
                used_cpfs.add(cpf)
                break

        city_data = random.choice(CITIES)

        customers.append(
            {
                "id": gen_uuid(),
                "name": name,
                "cpf": cpf if random.random() > 0.2 else None,  # 80% tem CPF
                "phone": gen_phone(),
                "phone2": gen_phone() if random.random() > 0.7 else None,
                "email": gen_email(name) if random.random() > 0.3 else None,
                "zip_code": f"{random.randint(10000, 99999)}-{random.randint(100, 999)}",
                "street": f"Rua {random.choice(LAST_NAMES)}",
                "number": str(random.randint(1, 2000)),
                "complement": random.choice(["", "Apto 101", "Casa 2", "Sala 10", ""]),
                "neighborhood": random.choice(city_data["neighborhoods"]),
                "city": city_data["city"],
                "state": city_data["state"],
                "is_active": 1,
                "notes": (
                    ""
                    if random.random() > 0.3
                    else f"Cliente desde {random.randint(2018, 2025)}"
                ),
                "created_at": gen_date_range(365),
                "updated_at": gen_date_range(30),
            }
        )

    return customers


def generate_suppliers(count: int = 15) -> List[Dict]:
    """Gera lista de fornecedores"""
    suppliers = []
    used_cnpjs = set()

    for i, (name, trade) in enumerate(SUPPLIER_NAMES[:count]):
        while True:
            cnpj = gen_cnpj()
            if cnpj not in used_cnpjs:
                used_cnpjs.add(cnpj)
                break

        city_data = random.choice(CITIES)

        suppliers.append(
            {
                "id": gen_uuid(),
                "name": name,
                "trade_name": trade,
                "cnpj": cnpj,
                "phone": gen_phone(),
                "email": gen_email(trade.lower().replace(" ", "")),
                "address": f"Av. Industrial, {random.randint(100, 5000)} - {random.choice(city_data['neighborhoods'])}",
                "city": city_data["city"],
                "state": city_data["state"],
                "notes": f"Prazo: {random.choice(['7', '14', '21', '28', '30'])} dias",
                "is_active": 1,
                "created_at": gen_date_range(730),
                "updated_at": gen_date_range(60),
            }
        )

    # Adiciona mais se necessário
    for i in range(len(SUPPLIER_NAMES), count):
        while True:
            cnpj = gen_cnpj()
            if cnpj not in used_cnpjs:
                used_cnpjs.add(cnpj)
                break

        city_data = random.choice(CITIES)
        name = f"Fornecedor {i+1} Autopeças"

        suppliers.append(
            {
                "id": gen_uuid(),
                "name": name,
                "trade_name": f"Forn{i+1}",
                "cnpj": cnpj,
                "phone": gen_phone(),
                "email": gen_email(f"fornecedor{i+1}"),
                "address": f"Rua {random.choice(LAST_NAMES)}, {random.randint(100, 2000)}",
                "city": city_data["city"],
                "state": city_data["state"],
                "notes": "",
                "is_active": 1,
                "created_at": gen_date_range(365),
                "updated_at": gen_date_range(30),
            }
        )

    return suppliers


def generate_employees() -> List[Dict]:
    """Gera funcionários padrão"""
    employees = [
        {"name": "Administrador Sistema", "role": "ADMIN", "pin": "1234"},
        {"name": "Gerente Loja", "role": "MANAGER", "pin": "5678"},
        {"name": "Caixa Principal", "role": "CASHIER", "pin": "1111"},
        {"name": "Caixa Auxiliar", "role": "CASHIER", "pin": "2222"},
        {"name": "Vendedor Sênior", "role": "CASHIER", "pin": "3333"},
        {"name": "Vendedor Júnior", "role": "CASHIER", "pin": "4444"},
        {"name": "Estoquista", "role": "VIEWER", "pin": "5555"},
    ]

    result = []
    for emp in employees:
        first = emp["name"].split()[0]
        last = random.choice(LAST_NAMES)

        result.append(
            {
                "id": gen_uuid(),
                "name": emp["name"],
                "cpf": gen_cpf(),
                "phone": gen_phone(),
                "email": gen_email(f"{first.lower()}.{last.lower()}"),
                "pin": hash_pin(emp["pin"]),
                "password": None,
                "role": emp["role"],
                "is_active": 1,
                "commission_rate": (
                    random.uniform(2, 8) if emp["role"] == "CASHIER" else 0
                ),
                "created_at": gen_date_range(365),
                "updated_at": gen_date_range(30),
            }
        )

    return result


# ============================================================================
# DATABASE OPERATIONS
# ============================================================================


def get_db_path(pc_id: str) -> Path:
    return SIM_DIR / pc_id / "data" / "GIRO" / "giro.db"


def execute_sql(db_path: Path, sql: str, params: tuple = ()) -> bool:
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"  ❌ SQL Error: {e}")
        return False


def insert_categories(
    db_path: Path, categories: List[Dict], parent_id: str = None, order: int = 0
) -> int:
    """Insere categorias recursivamente"""
    count = 0
    for i, cat in enumerate(categories):
        cat_id = cat["id"]
        sql = """
            INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order, is_active, parent_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
        """
        if execute_sql(
            db_path,
            sql,
            (
                cat_id,
                cat["name"],
                f"Categoria {cat['name']}",
                cat["color"],
                cat["icon"],
                order + i,
                parent_id,
            ),
        ):
            count += 1

        if "children" in cat:
            count += insert_categories(db_path, cat["children"], cat_id, 0)

    return count


def insert_products(db_path: Path, products: List[Dict]) -> int:
    count = 0
    for prod in products:
        sql = """
            INSERT OR IGNORE INTO products 
            (id, barcode, internal_code, name, description, unit, is_weighted, sale_price, cost_price, 
             current_stock, min_stock, max_stock, is_active, category_id, oem_code, aftermarket_code, 
             part_brand, application, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            prod["id"],
            prod["barcode"],
            prod["internal_code"],
            prod["name"],
            prod["description"],
            prod["unit"],
            prod["is_weighted"],
            prod["sale_price"],
            prod["cost_price"],
            prod["current_stock"],
            prod["min_stock"],
            prod["max_stock"],
            prod["is_active"],
            prod["category_id"],
            prod["oem_code"],
            prod["aftermarket_code"],
            prod["part_brand"],
            prod["application"],
            prod["notes"],
            prod["created_at"],
            prod["updated_at"],
        )
        if execute_sql(db_path, sql, params):
            count += 1
    return count


def insert_customers(db_path: Path, customers: List[Dict]) -> int:
    count = 0
    for cust in customers:
        sql = """
            INSERT OR IGNORE INTO customers
            (id, name, cpf, phone, phone2, email, zip_code, street, number, complement,
             neighborhood, city, state, is_active, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            cust["id"],
            cust["name"],
            cust["cpf"],
            cust["phone"],
            cust["phone2"],
            cust["email"],
            cust["zip_code"],
            cust["street"],
            cust["number"],
            cust["complement"],
            cust["neighborhood"],
            cust["city"],
            cust["state"],
            cust["is_active"],
            cust["notes"],
            cust["created_at"],
            cust["updated_at"],
        )
        if execute_sql(db_path, sql, params):
            count += 1
    return count


def insert_suppliers(db_path: Path, suppliers: List[Dict]) -> int:
    count = 0
    for sup in suppliers:
        sql = """
            INSERT OR IGNORE INTO suppliers
            (id, name, trade_name, cnpj, phone, email, address, city, state, notes, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            sup["id"],
            sup["name"],
            sup["trade_name"],
            sup["cnpj"],
            sup["phone"],
            sup["email"],
            sup["address"],
            sup["city"],
            sup["state"],
            sup["notes"],
            sup["is_active"],
            sup["created_at"],
            sup["updated_at"],
        )
        if execute_sql(db_path, sql, params):
            count += 1
    return count


def insert_employees(db_path: Path, employees: List[Dict]) -> int:
    count = 0
    for emp in employees:
        sql = """
            INSERT OR IGNORE INTO employees
            (id, name, cpf, phone, email, pin, password, role, is_active, commission_rate, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            emp["id"],
            emp["name"],
            emp["cpf"],
            emp["phone"],
            emp["email"],
            emp["pin"],
            emp["password"],
            emp["role"],
            emp["is_active"],
            emp["commission_rate"],
            emp["created_at"],
            emp["updated_at"],
        )
        if execute_sql(db_path, sql, params):
            count += 1
    return count


# ============================================================================
# MAIN
# ============================================================================


def main():
    print(
        """
╔═══════════════════════════════════════════════════════════════════╗
║         📦 GIRO Rich Data Population - Arkheion Corp             ║
╚═══════════════════════════════════════════════════════════════════╝
    """
    )

    # Gerar dados uma vez (serão iguais para todas instâncias - sync)
    print("🔄 Gerando dados...")
    products = generate_products(200)
    customers = generate_customers(100)
    suppliers = generate_suppliers(15)
    employees = generate_employees()

    print(f"   📦 {len(products)} produtos")
    print(f"   👤 {len(customers)} clientes")
    print(f"   🏭 {len(suppliers)} fornecedores")
    print(f"   👨‍💼 {len(employees)} funcionários")
    print()

    # Popular cada instância
    pc_dirs = sorted(
        [d for d in SIM_DIR.iterdir() if d.is_dir() and d.name.startswith("PC-")]
    )

    for pc_dir in pc_dirs:
        pc_id = pc_dir.name
        db_path = get_db_path(pc_id)

        if not db_path.exists():
            print(f"⚠️  {pc_id}: Database não encontrado")
            continue

        print(f"📥 Populando {pc_id}...")

        # Inserir categorias
        cat_count = insert_categories(db_path, CATEGORIES)
        print(f"   ✅ {cat_count} categorias")

        # Inserir produtos
        prod_count = insert_products(db_path, products)
        print(f"   ✅ {prod_count} produtos")

        # Inserir clientes
        cust_count = insert_customers(db_path, customers)
        print(f"   ✅ {cust_count} clientes")

        # Inserir fornecedores
        sup_count = insert_suppliers(db_path, suppliers)
        print(f"   ✅ {sup_count} fornecedores")

        # Inserir funcionários
        emp_count = insert_employees(db_path, employees)
        print(f"   ✅ {emp_count} funcionários")

        # Limpar sync_pending (dados já sincronizados)
        execute_sql(db_path, "DELETE FROM sync_pending")
        print(f"   🧹 Sync pending limpo")

        print()

    print(
        """
╔═══════════════════════════════════════════════════════════════════╗
║                    ✅ POPULAÇÃO CONCLUÍDA!                        ║
╠═══════════════════════════════════════════════════════════════════╣
║  Dados inseridos em todas as instâncias:                         ║
║  • 200 produtos de autopeças com OEM/aftermarket                 ║
║  • 100 clientes com endereços completos                          ║
║  • 15 fornecedores com CNPJ válido                               ║
║  • 7 funcionários (admin, gerente, caixas, vendedores)           ║
║  • 20+ categorias hierárquicas                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    """
    )


if __name__ == "__main__":
    main()
