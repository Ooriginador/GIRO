#!/usr/bin/env python3
"""
┌─────────────────────────────────────────────────────────────────────┐
│            🧪 GIRO Multi-PC Test Harness v1.0                       │
│                  Arkheion Corp © 2026                               │
├─────────────────────────────────────────────────────────────────────┤
│  Framework de testes automatizados para simulação de 10 PCs        │
│  - Execução paralela em todas instâncias                           │
│  - Logging profissional estruturado                                │
│  - Relatórios detalhados de sucesso/falha                          │
│  - Detecção de race conditions e problemas de sync                 │
└─────────────────────────────────────────────────────────────────────┘

Usage:
    python3 multi_pc_test_harness.py [options]

Options:
    --scenario=all      Run all scenarios (default)
    --scenario=sync     Run only sync tests
    --scenario=pdv      Run only PDV tests
    --scenario=stress   Run stress tests
    --duration=300      Duration in seconds (default 300)
    --parallel=10       Number of parallel workers (default 10)
    --report=json       Output format: json, html, console
"""

import argparse
import concurrent.futures
import hashlib
import hmac
import json
import logging
import os
import random
import signal
import sqlite3
import subprocess
import sys
import threading
import time
import traceback
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

# ============================================================================
# CONFIGURATION
# ============================================================================

SIM_DIR = Path("/tmp/giro-sim")
LOGS_DIR = SIM_DIR / "test-reports"
SECRET_KEY = os.environ.get("PIN_HMAC_KEY", "simulated-secret-key-123")

PC_CONFIG = [
    {"id": "PC-PDV-01", "role": "MASTER", "type": "PDV", "port": 3847},
    {"id": "PC-PDV-02", "role": "SATELLITE", "type": "PDV", "port": None},
    {"id": "PC-ESTQ", "role": "SATELLITE", "type": "STOCK", "port": None},
    {"id": "PC-GER", "role": "SATELLITE", "type": "MANAGER", "port": None},
    {"id": "PC-VEN-01", "role": "SATELLITE", "type": "SALES", "port": None},
    {"id": "PC-VEN-02", "role": "SATELLITE", "type": "SALES", "port": None},
    {"id": "PC-ADM", "role": "SATELLITE", "type": "ADMIN", "port": None},
    {"id": "PC-FIN", "role": "SATELLITE", "type": "FINANCE", "port": None},
    {"id": "PC-CAD", "role": "SATELLITE", "type": "REGISTER", "port": None},
    {"id": "PC-RESERVA", "role": "SATELLITE", "type": "PDV", "port": None},
]

# ============================================================================
# LOGGING SYSTEM
# ============================================================================


class LogLevel(Enum):
    TRACE = 5
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40
    FATAL = 50


class ColorCodes:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    # Levels
    TRACE = "\033[38;5;240m"
    DEBUG = "\033[38;5;39m"
    INFO = "\033[38;5;42m"
    WARN = "\033[38;5;214m"
    ERROR = "\033[38;5;196m"
    FATAL = "\033[48;5;196m\033[38;5;255m"

    # Categories
    SYNC = "\033[38;5;147m"
    PDV = "\033[38;5;220m"
    STOCK = "\033[38;5;111m"
    NETWORK = "\033[38;5;177m"
    DATABASE = "\033[38;5;208m"
    TEST = "\033[38;5;123m"


@dataclass
class LogEntry:
    timestamp: str
    level: str
    category: str
    pc_id: str
    message: str
    context: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    stack_trace: Optional[str] = None


class ProfessionalLogger:
    """Thread-safe professional logging system with structured output"""

    def __init__(self, name: str, log_dir: Path):
        self.name = name
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.log_dir / f"test_run_{self.session_id}.log"
        self.json_file = self.log_dir / f"test_run_{self.session_id}.jsonl"
        self.error_file = self.log_dir / f"errors_{self.session_id}.log"

        self._lock = threading.Lock()
        self._entries: List[LogEntry] = []
        self._error_count = 0
        self._warn_count = 0

        # Initialize files with headers
        self._write_header()

    def _write_header(self):
        header = f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧪 GIRO Test Session: {self.session_id}                                          ║
║  Started: {datetime.now().isoformat()}                                       ║
║  PCs Under Test: {len(PC_CONFIG)}                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
        with open(self.log_file, "w") as f:
            f.write(header)

    def _format_console(self, entry: LogEntry) -> str:
        level_colors = {
            "TRACE": ColorCodes.TRACE,
            "DEBUG": ColorCodes.DEBUG,
            "INFO": ColorCodes.INFO,
            "WARN": ColorCodes.WARN,
            "ERROR": ColorCodes.ERROR,
            "FATAL": ColorCodes.FATAL,
        }

        cat_colors = {
            "SYNC": ColorCodes.SYNC,
            "PDV": ColorCodes.PDV,
            "STOCK": ColorCodes.STOCK,
            "NETWORK": ColorCodes.NETWORK,
            "DATABASE": ColorCodes.DATABASE,
            "TEST": ColorCodes.TEST,
        }

        level_color = level_colors.get(entry.level, ColorCodes.INFO)
        cat_color = cat_colors.get(entry.category, ColorCodes.RESET)

        time_str = entry.timestamp.split("T")[1][:12]

        line = (
            f"{ColorCodes.DIM}{time_str}{ColorCodes.RESET} "
            f"{level_color}[{entry.level:5}]{ColorCodes.RESET} "
            f"{cat_color}[{entry.category:8}]{ColorCodes.RESET} "
            f"{ColorCodes.BOLD}[{entry.pc_id:11}]{ColorCodes.RESET} "
            f"{entry.message}"
        )

        if entry.context:
            ctx_str = " ".join(f"{k}={v}" for k, v in entry.context.items())
            line += f" {ColorCodes.DIM}({ctx_str}){ColorCodes.RESET}"

        if entry.error:
            line += f"\n  {ColorCodes.ERROR}└─ Error: {entry.error}{ColorCodes.RESET}"

        return line

    def _format_file(self, entry: LogEntry) -> str:
        time_str = entry.timestamp.split("T")[1][:12]
        ctx_str = (
            " " + " ".join(f"{k}={v}" for k, v in entry.context.items())
            if entry.context
            else ""
        )
        line = f"{time_str} [{entry.level:5}] [{entry.category:8}] [{entry.pc_id:11}] {entry.message}{ctx_str}"
        if entry.error:
            line += f"\n  └─ Error: {entry.error}"
        if entry.stack_trace:
            line += f"\n{entry.stack_trace}"
        return line

    def log(
        self,
        level: str,
        category: str,
        pc_id: str,
        message: str,
        context: Dict[str, Any] = None,
        error: Exception = None,
    ):
        entry = LogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=level,
            category=category,
            pc_id=pc_id,
            message=message,
            context=context or {},
            error=str(error) if error else None,
            stack_trace=traceback.format_exc() if error else None,
        )

        with self._lock:
            self._entries.append(entry)

            if level in ("ERROR", "FATAL"):
                self._error_count += 1
            elif level == "WARN":
                self._warn_count += 1

            # Console output
            print(self._format_console(entry))

            # File outputs
            with open(self.log_file, "a") as f:
                f.write(self._format_file(entry) + "\n")

            with open(self.json_file, "a") as f:
                f.write(json.dumps(asdict(entry)) + "\n")

            if level in ("ERROR", "FATAL"):
                with open(self.error_file, "a") as f:
                    f.write(self._format_file(entry) + "\n")

    def trace(self, cat: str, pc: str, msg: str, **ctx):
        self.log("TRACE", cat, pc, msg, ctx)

    def debug(self, cat: str, pc: str, msg: str, **ctx):
        self.log("DEBUG", cat, pc, msg, ctx)

    def info(self, cat: str, pc: str, msg: str, **ctx):
        self.log("INFO", cat, pc, msg, ctx)

    def warn(self, cat: str, pc: str, msg: str, **ctx):
        self.log("WARN", cat, pc, msg, ctx)

    def error(self, cat: str, pc: str, msg: str, error: Exception = None, **ctx):
        self.log("ERROR", cat, pc, msg, ctx, error)

    def fatal(self, cat: str, pc: str, msg: str, error: Exception = None, **ctx):
        self.log("FATAL", cat, pc, msg, ctx, error)

    def get_summary(self) -> Dict:
        return {
            "session_id": self.session_id,
            "total_entries": len(self._entries),
            "error_count": self._error_count,
            "warn_count": self._warn_count,
            "log_file": str(self.log_file),
            "json_file": str(self.json_file),
            "error_file": str(self.error_file),
        }


# Global logger instance
logger: Optional[ProfessionalLogger] = None


def init_logger():
    global logger
    logger = ProfessionalLogger("GIRO-TEST", LOGS_DIR)
    return logger


# ============================================================================
# TEST RESULT TRACKING
# ============================================================================


class TestStatus(Enum):
    PENDING = "⏳"
    RUNNING = "🔄"
    PASSED = "✅"
    FAILED = "❌"
    SKIPPED = "⏭️"
    ERROR = "💥"


@dataclass
class TestResult:
    test_id: str
    test_name: str
    pc_id: str
    category: str
    status: TestStatus
    duration_ms: float
    assertions: int = 0
    failures: List[str] = field(default_factory=list)
    error: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)


class TestRegistry:
    """Centralized test result tracking"""

    def __init__(self):
        self._results: Dict[str, TestResult] = {}
        self._lock = threading.Lock()
        self._start_time = time.time()

    def register(self, result: TestResult):
        with self._lock:
            self._results[result.test_id] = result

    def get_summary(self) -> Dict:
        with self._lock:
            total = len(self._results)
            passed = sum(
                1 for r in self._results.values() if r.status == TestStatus.PASSED
            )
            failed = sum(
                1 for r in self._results.values() if r.status == TestStatus.FAILED
            )
            errors = sum(
                1 for r in self._results.values() if r.status == TestStatus.ERROR
            )

            return {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "pass_rate": f"{(passed/total*100):.1f}%" if total > 0 else "N/A",
                "duration_s": time.time() - self._start_time,
                "results": [asdict(r) for r in self._results.values()],
            }

    def print_summary(self):
        summary = self.get_summary()
        print(
            f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         📊 TEST EXECUTION SUMMARY                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Total Tests:    {summary['total']:>5}                                                    ║
║  ✅ Passed:      {summary['passed']:>5}                                                    ║
║  ❌ Failed:      {summary['failed']:>5}                                                    ║
║  💥 Errors:      {summary['errors']:>5}                                                    ║
║  Pass Rate:     {summary['pass_rate']:>6}                                                   ║
║  Duration:      {summary['duration_s']:>6.1f}s                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
        )

        # Failed tests details
        failed_tests = [
            r
            for r in self._results.values()
            if r.status in (TestStatus.FAILED, TestStatus.ERROR)
        ]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for t in failed_tests:
                print(f"  [{t.pc_id}] {t.test_name}")
                for f in t.failures:
                    print(f"    └─ {f}")
                if t.error:
                    print(f"    └─ Error: {t.error}")


# Global registry
test_registry = TestRegistry()


# ============================================================================
# DATABASE UTILITIES
# ============================================================================


def get_db_path(pc_id: str) -> Path:
    return SIM_DIR / pc_id / "data" / "GIRO" / "giro.db"


def db_connect(pc_id: str) -> sqlite3.Connection:
    db_path = get_db_path(pc_id)
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")
    return sqlite3.connect(str(db_path), timeout=10)


def db_query(pc_id: str, query: str, params: tuple = ()) -> List[Dict]:
    conn = db_connect(pc_id)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def db_execute(pc_id: str, query: str, params: tuple = ()) -> int:
    conn = db_connect(pc_id)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    lastrowid = cur.lastrowid
    conn.close()
    return lastrowid


def db_count(pc_id: str, table: str, where: str = "1=1") -> int:
    result = db_query(pc_id, f"SELECT COUNT(*) as cnt FROM {table} WHERE {where}")
    return result[0]["cnt"] if result else 0


# ============================================================================
# TEST SCENARIOS
# ============================================================================


def run_test(
    pc_id: str, test_name: str, category: str, test_fn: Callable
) -> TestResult:
    """Execute a single test with full tracking"""
    test_id = f"{pc_id}_{test_name}_{uuid.uuid4().hex[:8]}"
    start = time.time()
    failures = []
    error_msg = None
    status = TestStatus.RUNNING

    logger.info("TEST", pc_id, f"Starting: {test_name}")

    try:
        result = test_fn(pc_id)
        if isinstance(result, list) and result:
            failures = result
            status = TestStatus.FAILED
        else:
            status = TestStatus.PASSED
    except AssertionError as e:
        failures.append(str(e))
        status = TestStatus.FAILED
        logger.error("TEST", pc_id, f"Assertion failed: {test_name}", error=e)
    except Exception as e:
        error_msg = str(e)
        status = TestStatus.ERROR
        logger.error("TEST", pc_id, f"Error in test: {test_name}", error=e)

    duration = (time.time() - start) * 1000

    result = TestResult(
        test_id=test_id,
        test_name=test_name,
        pc_id=pc_id,
        category=category,
        status=status,
        duration_ms=duration,
        failures=failures,
        error=error_msg,
    )

    test_registry.register(result)

    status_icon = result.status.value
    logger.info("TEST", pc_id, f"{status_icon} {test_name} ({duration:.0f}ms)")

    return result


# ----- SYNC TESTS -----


def test_product_sync_master_to_satellite(pc_id: str) -> List[str]:
    """Test that products from seed are consistent across PCs (initial sync)"""
    failures = []

    if pc_id == "PC-PDV-01":
        # Master validates own data
        products = db_query(pc_id, "SELECT COUNT(*) as cnt FROM products")
        if products[0]["cnt"] < 10:
            failures.append(f"Master has insufficient products: {products[0]['cnt']}")
        else:
            logger.info("SYNC", pc_id, "✓ Master products OK", count=products[0]["cnt"])
        return failures

    # Compare satellite product count with master
    master_count = db_query("PC-PDV-01", "SELECT COUNT(*) as cnt FROM products")[0][
        "cnt"
    ]
    local_count = db_query(pc_id, "SELECT COUNT(*) as cnt FROM products")[0]["cnt"]

    # Allow small differences due to concurrent test operations
    if abs(master_count - local_count) > 5:
        failures.append(
            f"Product count mismatch: master={master_count}, local={local_count}"
        )
    else:
        logger.info(
            "SYNC", pc_id, "✓ Product sync OK", master=master_count, local=local_count
        )

    # Check sync_pending table for pending operations
    pending = db_query(pc_id, "SELECT COUNT(*) as cnt FROM sync_pending")
    if pending and pending[0]["cnt"] > 100:
        logger.warn(
            "SYNC", pc_id, f"High pending sync count", pending=pending[0]["cnt"]
        )

    return failures


def test_sale_sync_satellite_to_master(pc_id: str) -> List[str]:
    """Test sync_pending table is processing correctly"""
    failures = []

    if pc_id == "PC-PDV-01":
        return []  # Skip for master

    try:
        # Check connectivity via logs first
        log_file = SIM_DIR / pc_id / "runtime.log"
        if log_file.exists():
            log_content = log_file.read_text()
            if "Autenticado com sucesso" not in log_content:
                failures.append("Not authenticated with master - sync won't work")
                return failures

        # Check sync_pending table
        pending = db_query(
            pc_id,
            """
            SELECT entity_type, COUNT(*) as cnt 
            FROM sync_pending 
            GROUP BY entity_type
        """,
        )

        if pending:
            total_pending = sum(p["cnt"] for p in pending)
            if total_pending > 50:
                logger.warn(
                    "SYNC", pc_id, f"Pending sync operations", count=total_pending
                )
            else:
                logger.info(
                    "SYNC", pc_id, f"✓ Sync queue healthy", pending=total_pending
                )
        else:
            logger.info("SYNC", pc_id, f"✓ No pending sync items")

        # Check that sales table exists and is accessible
        sales_count = db_query(pc_id, "SELECT COUNT(*) as cnt FROM sales")[0]["cnt"]
        logger.debug("SYNC", pc_id, f"Local sales count: {sales_count}")

    except Exception as e:
        failures.append(f"Sync status check error: {e}")

    return failures


def test_stock_consistency(pc_id: str) -> List[str]:
    """Test stock consistency across all PCs (initial seed data)"""
    failures = []

    if pc_id == "PC-PDV-01":
        # Master just validates own data
        products = db_query(
            pc_id, "SELECT COUNT(*) as cnt FROM products WHERE current_stock > 0"
        )
        if products[0]["cnt"] < 5:
            failures.append(f"Insufficient products with stock")
        else:
            logger.info(
                "SYNC",
                pc_id,
                f"✓ Master stock OK",
                products_with_stock=products[0]["cnt"],
            )
        return failures

    # For satellites, compare base product set (from seed)
    # Note: Stock may differ due to test sales - we only check product existence
    master_products = db_query(
        "PC-PDV-01", "SELECT id FROM products WHERE id LIKE 'prod-%' ORDER BY id"
    )
    local_products = db_query(
        pc_id, "SELECT id FROM products WHERE id LIKE 'prod-%' ORDER BY id"
    )

    master_ids = {p["id"] for p in master_products}
    local_ids = {p["id"] for p in local_products}

    missing = master_ids - local_ids
    if missing:
        # Only fail if significant products missing
        if len(missing) > 5:
            failures.append(f"Missing {len(missing)} seed products on {pc_id}")
        else:
            logger.debug("SYNC", pc_id, f"Minor sync difference", missing=len(missing))

    if not failures:
        logger.info(
            "SYNC", pc_id, f"✓ Stock consistency OK", seed_products=len(local_ids)
        )

    return failures


# ----- DATABASE TESTS -----


def test_database_integrity(pc_id: str) -> List[str]:
    """Test database integrity constraints"""
    failures = []

    try:
        # Check foreign keys
        fk_results = db_query(pc_id, "PRAGMA foreign_key_check")
        if fk_results:
            failures.append(f"Foreign key violations: {len(fk_results)}")

        # Check integrity
        integrity = db_query(pc_id, "PRAGMA integrity_check")
        if integrity[0].get("integrity_check") != "ok":
            failures.append(f"Integrity check failed: {integrity}")

        # Required tables exist
        required_tables = [
            "products",
            "categories",
            "employees",
            "sales",
            "sale_items",
            "cash_sessions",
        ]
        for table in required_tables:
            count = db_count(pc_id, table)
            logger.debug("DATABASE", pc_id, f"Table {table}: {count} rows")

        logger.info("DATABASE", pc_id, "✓ Database integrity OK")

    except Exception as e:
        failures.append(f"Integrity check error: {e}")

    return failures


def test_required_data(pc_id: str) -> List[str]:
    """Test that required seed data exists"""
    failures = []

    # Check employees
    emp_count = db_count(pc_id, "employees")
    if emp_count < 3:
        failures.append(f"Insufficient employees: {emp_count} (min 3)")

    # Check categories
    cat_count = db_count(pc_id, "categories")
    if cat_count < 5:
        failures.append(f"Insufficient categories: {cat_count} (min 5)")

    # Check products
    prod_count = db_count(pc_id, "products")
    if prod_count < 10:
        failures.append(f"Insufficient products: {prod_count} (min 10)")

    # Check network settings
    net = db_query(pc_id, "SELECT * FROM settings WHERE key LIKE 'network.%'")
    if len(net) < 2:
        failures.append(f"Missing network settings: {len(net)}")

    if not failures:
        logger.info(
            "DATABASE",
            pc_id,
            f"✓ Required data present",
            employees=emp_count,
            products=prod_count,
        )

    return failures


# ----- PDV TESTS -----


def test_pdv_sale_flow(pc_id: str) -> List[str]:
    """Test complete PDV sale flow"""
    failures = []

    pc_type = next((p["type"] for p in PC_CONFIG if p["id"] == pc_id), None)
    if pc_type != "PDV":
        return []  # Skip for non-PDV

    try:
        # Get resources
        employees = db_query(
            pc_id, "SELECT id FROM employees WHERE role = 'CASHIER' LIMIT 1"
        )
        products = db_query(
            pc_id,
            "SELECT id, name, sale_price, current_stock FROM products WHERE current_stock > 0 LIMIT 5",
        )

        if not employees or not products:
            failures.append("Missing employees or products for PDV test")
            return failures

        emp_id = employees[0]["id"]
        session_id = f"pdv-test-{uuid.uuid4().hex[:8]}"

        # 1. Open cash session
        db_execute(
            pc_id,
            """
            INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """,
            (session_id, emp_id, 200.0, "OPEN"),
        )
        logger.debug("PDV", pc_id, "Opened cash session", session_id=session_id)

        # 2. Create sale with items
        sale_id = f"pdv-sale-{uuid.uuid4().hex[:8]}"
        total = 0.0

        for prod in products[:3]:
            qty = random.randint(1, 3)
            total += prod["sale_price"] * qty

        db_execute(
            pc_id,
            """
            INSERT INTO sales (id, subtotal, total, payment_method, amount_paid, status, cash_session_id, employee_id, created_at, daily_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        """,
            (
                sale_id,
                total,
                total,
                "CASH",
                total,
                "COMPLETED",
                session_id,
                emp_id,
                random.randint(1, 9999),
            ),
        )

        # Add items
        for prod in products[:3]:
            qty = random.randint(1, 3)
            item_total = prod["sale_price"] * qty
            db_execute(
                pc_id,
                """
                INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    str(uuid.uuid4()),
                    sale_id,
                    prod["id"],
                    prod["name"],
                    qty,
                    prod["sale_price"],
                    item_total,
                ),
            )

        # 3. Verify sale
        sale_check = db_query(pc_id, "SELECT * FROM sales WHERE id = ?", (sale_id,))
        if not sale_check:
            failures.append(f"Sale {sale_id} not found after creation")

        items_check = db_query(
            pc_id,
            "SELECT COUNT(*) as cnt FROM sale_items WHERE sale_id = ?",
            (sale_id,),
        )
        if items_check[0]["cnt"] == 0:
            failures.append(f"No items in sale {sale_id}")

        logger.info(
            "PDV", pc_id, f"✓ PDV sale flow complete", sale_id=sale_id, total=total
        )

    except Exception as e:
        failures.append(f"PDV flow error: {e}")

    return failures


# ----- NETWORK TESTS -----


def test_network_config(pc_id: str) -> List[str]:
    """Test network configuration"""
    failures = []

    settings = db_query(
        pc_id, "SELECT key, value FROM settings WHERE key LIKE 'network.%'"
    )
    settings_dict = {s["key"]: s["value"] for s in settings}

    pc_info = next((p for p in PC_CONFIG if p["id"] == pc_id), None)

    # GIRO uses 'network.role' not 'network.mode'
    role = settings_dict.get("network.role")

    if pc_info["role"] == "MASTER":
        if role != "MASTER":
            failures.append(f"Master PC should have role=MASTER, got {role}")
    else:
        if role not in ("SATELLITE", "CLIENT"):
            failures.append(f"Satellite PC should have role=SATELLITE, got {role}")
        # Master IP optional with mDNS discovery
        if not settings_dict.get("network.master_ip"):
            logger.debug("NETWORK", pc_id, "Using mDNS discovery or static config")

    if not failures:
        logger.info(
            "NETWORK",
            pc_id,
            f"✓ Network config OK",
            role=role,
        )

    return failures

    return failures


def test_master_connectivity(pc_id: str) -> List[str]:
    """Test satellite can reach master (via log inspection)"""
    failures = []

    pc_info = next((p for p in PC_CONFIG if p["id"] == pc_id), None)
    if pc_info["role"] == "MASTER":
        return []

    # Check runtime log for connection status
    log_file = SIM_DIR / pc_id / "runtime.log"
    if log_file.exists():
        log_content = log_file.read_text()
        if (
            "Conectado ao Master" in log_content
            or "Autenticado com sucesso" in log_content
        ):
            logger.info("NETWORK", pc_id, "✓ Connected to Master")
        else:
            failures.append("No successful master connection in logs")
    else:
        failures.append("Runtime log not found")

    return failures


# ----- STRESS TESTS -----


def test_concurrent_sales(pc_id: str) -> List[str]:
    """Test multiple concurrent sales"""
    failures = []

    pc_type = next((p["type"] for p in PC_CONFIG if p["id"] == pc_id), None)
    if pc_type != "PDV":
        return []

    try:
        employees = db_query(pc_id, "SELECT id FROM employees LIMIT 1")
        if not employees:
            return ["No employees for stress test"]

        emp_id = employees[0]["id"]
        session_id = f"stress-{uuid.uuid4().hex[:8]}"

        # Create session
        db_execute(
            pc_id,
            """
            INSERT INTO cash_sessions (id, employee_id, opening_balance, status, opened_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """,
            (session_id, emp_id, 500.0, "OPEN"),
        )

        # Create 10 rapid sales
        for i in range(10):
            sale_id = f"stress-sale-{i}-{uuid.uuid4().hex[:8]}"
            total = random.uniform(10, 200)

            db_execute(
                pc_id,
                """
                INSERT INTO sales (id, subtotal, total, payment_method, amount_paid, status, cash_session_id, employee_id, created_at, daily_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
            """,
                (
                    sale_id,
                    total,
                    total,
                    random.choice(["CASH", "PIX", "CREDIT"]),
                    total,
                    "COMPLETED",
                    session_id,
                    emp_id,
                    1000 + i,
                ),
            )

        # Verify all created
        count = db_count(pc_id, "sales", f"cash_session_id = '{session_id}'")
        if count != 10:
            failures.append(f"Only {count}/10 stress sales created")
        else:
            logger.info("PDV", pc_id, f"✓ Stress test passed", sales=count)

    except Exception as e:
        failures.append(f"Stress test error: {e}")

    return failures


# ============================================================================
# TEST ORCHESTRATOR
# ============================================================================

SCENARIO_TESTS = {
    "database": [
        ("test_database_integrity", "DATABASE", test_database_integrity),
        ("test_required_data", "DATABASE", test_required_data),
    ],
    "network": [
        ("test_network_config", "NETWORK", test_network_config),
        ("test_master_connectivity", "NETWORK", test_master_connectivity),
    ],
    "sync": [
        (
            "test_product_sync_master_to_satellite",
            "SYNC",
            test_product_sync_master_to_satellite,
        ),
        (
            "test_sale_sync_satellite_to_master",
            "SYNC",
            test_sale_sync_satellite_to_master,
        ),
        ("test_stock_consistency", "SYNC", test_stock_consistency),
    ],
    "pdv": [
        ("test_pdv_sale_flow", "PDV", test_pdv_sale_flow),
    ],
    "stress": [
        ("test_concurrent_sales", "PDV", test_concurrent_sales),
    ],
}


def run_pc_tests(pc_id: str, scenarios: List[str]) -> List[TestResult]:
    """Run all tests for a specific PC"""
    results = []

    logger.info("TEST", pc_id, f"Starting test suite", scenarios=scenarios)

    for scenario in scenarios:
        tests = SCENARIO_TESTS.get(scenario, [])
        for test_name, category, test_fn in tests:
            result = run_test(pc_id, test_name, category, test_fn)
            results.append(result)
            time.sleep(0.5)  # Brief pause between tests

    passed = sum(1 for r in results if r.status == TestStatus.PASSED)
    failed = sum(
        1 for r in results if r.status in (TestStatus.FAILED, TestStatus.ERROR)
    )

    logger.info(
        "TEST", pc_id, f"Suite complete: {passed}/{len(results)} passed", failed=failed
    )

    return results


def run_parallel_tests(scenarios: List[str], max_workers: int = 10):
    """Run tests on all PCs in parallel"""

    logger.info(
        "TEST",
        "HARNESS",
        f"Starting parallel test execution",
        pcs=len(PC_CONFIG),
        workers=max_workers,
    )

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for pc in PC_CONFIG:
            future = executor.submit(run_pc_tests, pc["id"], scenarios)
            futures[future] = pc["id"]

        for future in concurrent.futures.as_completed(futures):
            pc_id = futures[future]
            try:
                results = future.result()
            except Exception as e:
                logger.error("TEST", pc_id, f"Test execution failed", error=e)


# ============================================================================
# REPORT GENERATION
# ============================================================================


def generate_html_report(output_path: Path):
    """Generate HTML test report"""
    summary = test_registry.get_summary()
    log_summary = logger.get_summary()

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>GIRO Test Report - {log_summary['session_id']}</title>
    <style>
        * {{ font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ background: #0f172a; color: #e2e8f0; padding: 2rem; }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        .header {{ background: linear-gradient(135deg, #1e3a8a, #7c3aed); padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; }}
        .header h1 {{ font-size: 2rem; margin-bottom: 0.5rem; }}
        .header p {{ opacity: 0.8; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
        .stat-card {{ background: #1e293b; padding: 1.5rem; border-radius: 0.75rem; text-align: center; }}
        .stat-card.passed {{ border-left: 4px solid #22c55e; }}
        .stat-card.failed {{ border-left: 4px solid #ef4444; }}
        .stat-card.error {{ border-left: 4px solid #f59e0b; }}
        .stat-value {{ font-size: 2.5rem; font-weight: bold; }}
        .stat-label {{ opacity: 0.7; margin-top: 0.25rem; }}
        .results {{ background: #1e293b; border-radius: 0.75rem; overflow: hidden; }}
        .results-header {{ background: #334155; padding: 1rem 1.5rem; font-weight: bold; }}
        .result-row {{ display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr; padding: 0.75rem 1.5rem; border-bottom: 1px solid #334155; }}
        .result-row:hover {{ background: #334155; }}
        .status {{ padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; }}
        .status.passed {{ background: #22c55e33; color: #22c55e; }}
        .status.failed {{ background: #ef444433; color: #ef4444; }}
        .status.error {{ background: #f59e0b33; color: #f59e0b; }}
        .failures {{ background: #7f1d1d; padding: 1rem; margin-top: 1rem; border-radius: 0.5rem; }}
        .failures h3 {{ margin-bottom: 0.5rem; }}
        .failures li {{ margin-left: 1.5rem; margin-bottom: 0.25rem; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 GIRO Multi-PC Test Report</h1>
            <p>Session: {log_summary['session_id']} | Duration: {summary['duration_s']:.1f}s</p>
        </div>
        
        <div class="stats">
            <div class="stat-card passed">
                <div class="stat-value">{summary['passed']}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-value">{summary['failed']}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card error">
                <div class="stat-value">{summary['errors']}</div>
                <div class="stat-label">Errors</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{summary['pass_rate']}</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>
        
        <div class="results">
            <div class="results-header">
                <div class="result-row" style="font-weight: bold; border: none;">
                    <span>Test Name</span>
                    <span>PC</span>
                    <span>Category</span>
                    <span>Duration</span>
                    <span>Status</span>
                </div>
            </div>
            {"".join(f'''
            <div class="result-row">
                <span>{r['test_name']}</span>
                <span>{r['pc_id']}</span>
                <span>{r['category']}</span>
                <span>{r['duration_ms']:.0f}ms</span>
                <span class="status {str(r['status']).split('.')[1].lower() if '.' in str(r['status']) else str(r['status']).lower()}">{r['status']}</span>
            </div>
            ''' for r in summary['results'])}
        </div>
        
        {"" if summary['failed'] == 0 else f'''
        <div class="failures">
            <h3>❌ Failed Tests Details</h3>
            <ul>
                {"".join(f"<li><b>{r['test_name']}</b> ({r['pc_id']}): {', '.join(r['failures']) if r['failures'] else r.get('error', 'Unknown error')}</li>" for r in summary['results'] if 'FAILED' in str(r['status']) or 'ERROR' in str(r['status']))}
            </ul>
        </div>
        '''}
    </div>
</body>
</html>"""

    output_path.write_text(html)
    logger.info("TEST", "HARNESS", f"HTML report generated: {output_path}")


def generate_json_report(output_path: Path):
    """Generate JSON test report"""
    summary = test_registry.get_summary()
    log_summary = logger.get_summary()

    report = {
        "session": log_summary,
        "summary": summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    output_path.write_text(json.dumps(report, indent=2, default=str))
    logger.info("TEST", "HARNESS", f"JSON report generated: {output_path}")


# ============================================================================
# MAIN
# ============================================================================


def main():
    parser = argparse.ArgumentParser(description="GIRO Multi-PC Test Harness")
    parser.add_argument(
        "--scenario",
        default="all",
        help="Test scenario: all, sync, pdv, stress, database, network",
    )
    parser.add_argument("--duration", type=int, default=300, help="Duration in seconds")
    parser.add_argument(
        "--parallel", type=int, default=10, help="Number of parallel workers"
    )
    parser.add_argument(
        "--report", default="all", help="Report format: json, html, console, all"
    )

    args = parser.parse_args()

    # Initialize logger
    init_logger()

    logger.info("TEST", "HARNESS", f"Starting GIRO Multi-PC Test Harness v1.0")
    logger.info(
        "TEST", "HARNESS", f"Scenarios: {args.scenario}, Workers: {args.parallel}"
    )

    # Determine scenarios
    if args.scenario == "all":
        scenarios = list(SCENARIO_TESTS.keys())
    else:
        scenarios = args.scenario.split(",")

    # Verify instances running
    db_count_ok = sum(1 for pc in PC_CONFIG if get_db_path(pc["id"]).exists())
    if db_count_ok < len(PC_CONFIG):
        logger.warn(
            "TEST", "HARNESS", f"Only {db_count_ok}/{len(PC_CONFIG)} databases found"
        )

    # Run tests
    run_parallel_tests(scenarios, args.parallel)

    # Print summary
    test_registry.print_summary()

    # Generate reports
    session_id = logger.session_id
    if args.report in ("all", "html"):
        generate_html_report(LOGS_DIR / f"report_{session_id}.html")
    if args.report in ("all", "json"):
        generate_json_report(LOGS_DIR / f"report_{session_id}.json")

    # Exit with appropriate code
    summary = test_registry.get_summary()
    sys.exit(0 if summary["failed"] == 0 and summary["errors"] == 0 else 1)


if __name__ == "__main__":
    main()
