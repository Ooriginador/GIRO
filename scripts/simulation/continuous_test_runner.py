#!/usr/bin/env python3
"""
┌─────────────────────────────────────────────────────────────────────┐
│        🔄 GIRO Continuous Test Runner v1.0                          │
│                  Arkheion Corp © 2026                               │
├─────────────────────────────────────────────────────────────────────┤
│  Executa testes continuamente monitorando as 10 instâncias         │
│  - Detecta problemas em tempo real                                 │
│  - Gera alertas para falhas críticas                               │
│  - Dashboard live no terminal                                      │
└─────────────────────────────────────────────────────────────────────┘

Usage:
    python3 continuous_test_runner.py --interval=30 --duration=3600
"""

import argparse
import curses
import json
import os
import signal
import sqlite3
import sys
import threading
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ============================================================================
# CONFIGURATION
# ============================================================================

SIM_DIR = Path("/tmp/giro-sim")
LOGS_DIR = SIM_DIR / "test-reports"

PC_CONFIG = [
    {"id": "PC-PDV-01", "role": "MASTER", "type": "PDV", "emoji": "👑"},
    {"id": "PC-PDV-02", "role": "SATELLITE", "type": "PDV", "emoji": "💰"},
    {"id": "PC-ESTQ", "role": "SATELLITE", "type": "STOCK", "emoji": "📦"},
    {"id": "PC-GER", "role": "SATELLITE", "type": "MANAGER", "emoji": "📊"},
    {"id": "PC-VEN-01", "role": "SATELLITE", "type": "SALES", "emoji": "🛒"},
    {"id": "PC-VEN-02", "role": "SATELLITE", "type": "SALES", "emoji": "🛒"},
    {"id": "PC-ADM", "role": "SATELLITE", "type": "ADMIN", "emoji": "🔧"},
    {"id": "PC-FIN", "role": "SATELLITE", "type": "FINANCE", "emoji": "💵"},
    {"id": "PC-CAD", "role": "SATELLITE", "type": "REGISTER", "emoji": "📝"},
    {"id": "PC-RESERVA", "role": "SATELLITE", "type": "PDV", "emoji": "🔄"},
]


# ============================================================================
# DATABASE UTILITIES
# ============================================================================


def get_db_path(pc_id: str) -> Path:
    return SIM_DIR / pc_id / "data" / "GIRO" / "giro.db"


def db_query(pc_id: str, query: str, params: tuple = ()) -> List[Dict]:
    db_path = get_db_path(pc_id)
    if not db_path.exists():
        return []
    try:
        conn = sqlite3.connect(str(db_path), timeout=5)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(query, params)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception:
        return []


def db_count(pc_id: str, table: str) -> int:
    result = db_query(pc_id, f"SELECT COUNT(*) as cnt FROM {table}")
    return result[0]["cnt"] if result else 0


# ============================================================================
# HEALTH CHECK SYSTEM
# ============================================================================


@dataclass
class HealthStatus:
    pc_id: str
    timestamp: str
    status: str  # "OK", "WARN", "ERROR"
    db_accessible: bool = True
    employee_count: int = 0
    product_count: int = 0
    sale_count: int = 0
    network_connected: bool = True
    last_sync_time: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class HealthMonitor:
    """Monitors health of all PC instances"""

    def __init__(self):
        self.statuses: Dict[str, HealthStatus] = {}
        self.history: Dict[str, List[HealthStatus]] = defaultdict(list)
        self.alerts: List[Dict] = []
        self._lock = threading.Lock()

    def check_pc(self, pc_id: str) -> HealthStatus:
        """Perform comprehensive health check on a PC"""
        status = HealthStatus(
            pc_id=pc_id, timestamp=datetime.now(timezone.utc).isoformat(), status="OK"
        )

        db_path = get_db_path(pc_id)

        # Check database accessibility
        if not db_path.exists():
            status.db_accessible = False
            status.errors.append("Database file not found")
            status.status = "ERROR"
            return status

        try:
            # Get counts
            status.employee_count = db_count(pc_id, "employees")
            status.product_count = db_count(pc_id, "products")
            status.sale_count = db_count(pc_id, "sales")

            # Validate minimums
            if status.employee_count == 0:
                status.errors.append("No employees in database")
                status.status = "ERROR"
            elif status.employee_count < 3:
                status.warnings.append(f"Low employee count: {status.employee_count}")

            if status.product_count == 0:
                status.errors.append("No products in database")
                status.status = "ERROR"
            elif status.product_count < 10:
                status.warnings.append(f"Low product count: {status.product_count}")

            # Check network settings
            net_settings = db_query(
                pc_id, "SELECT key, value FROM settings WHERE key LIKE 'network.%'"
            )
            if not net_settings:
                status.warnings.append("Missing network settings")

            # Check runtime log for connectivity
            log_file = SIM_DIR / pc_id / "runtime.log"
            if log_file.exists():
                log_content = log_file.read_text()
                if (
                    "Conectado ao Master" in log_content
                    or "Autenticado com sucesso" in log_content
                ):
                    status.network_connected = True
                elif pc_id != "PC-PDV-01":  # Master doesn't connect to itself
                    status.network_connected = False
                    status.warnings.append("No master connection in logs")

                # Check for errors in log
                if "ERROR" in log_content or "FATAL" in log_content:
                    status.warnings.append("Errors found in runtime log")

            # Determine final status
            if status.errors:
                status.status = "ERROR"
            elif status.warnings:
                status.status = "WARN"
            else:
                status.status = "OK"

        except Exception as e:
            status.db_accessible = False
            status.errors.append(f"Health check failed: {e}")
            status.status = "ERROR"

        with self._lock:
            self.statuses[pc_id] = status
            self.history[pc_id].append(status)

            # Generate alerts for new errors
            if status.errors:
                self.alerts.append(
                    {
                        "time": status.timestamp,
                        "pc_id": pc_id,
                        "level": "ERROR",
                        "messages": status.errors,
                    }
                )

        return status

    def check_all(self) -> Dict[str, HealthStatus]:
        """Check health of all PCs"""
        for pc in PC_CONFIG:
            self.check_pc(pc["id"])
        return self.statuses

    def get_summary(self) -> Dict:
        """Get summary of all health statuses"""
        ok = sum(1 for s in self.statuses.values() if s.status == "OK")
        warn = sum(1 for s in self.statuses.values() if s.status == "WARN")
        error = sum(1 for s in self.statuses.values() if s.status == "ERROR")

        return {
            "total": len(self.statuses),
            "ok": ok,
            "warn": warn,
            "error": error,
            "health_pct": (
                f"{ok/len(self.statuses)*100:.0f}%" if self.statuses else "N/A"
            ),
            "alerts": len(self.alerts),
        }


# ============================================================================
# SYNC VALIDATOR
# ============================================================================


class SyncValidator:
    """Validates sync consistency across all PCs"""

    def __init__(self):
        self.last_check: Optional[datetime] = None
        self.inconsistencies: List[Dict] = []

    def validate_products(self) -> List[Dict]:
        """Compare products across all PCs"""
        issues = []

        # Get master products
        master_products = db_query(
            "PC-PDV-01",
            "SELECT id, name, sale_price, current_stock FROM products ORDER BY id",
        )
        master_dict = {p["id"]: p for p in master_products}

        for pc in PC_CONFIG:
            if pc["id"] == "PC-PDV-01":
                continue

            local_products = db_query(
                pc["id"],
                "SELECT id, name, sale_price, current_stock FROM products ORDER BY id",
            )
            local_dict = {p["id"]: p for p in local_products}

            # Check for missing products
            for prod_id in master_dict:
                if prod_id not in local_dict:
                    issues.append(
                        {
                            "type": "MISSING_PRODUCT",
                            "pc_id": pc["id"],
                            "product_id": prod_id,
                            "details": f"Product {master_dict[prod_id]['name']} missing on {pc['id']}",
                        }
                    )

            # Check for price/stock differences
            for prod_id, master_prod in master_dict.items():
                if prod_id in local_dict:
                    local_prod = local_dict[prod_id]
                    if abs(master_prod["sale_price"] - local_prod["sale_price"]) > 0.01:
                        issues.append(
                            {
                                "type": "PRICE_MISMATCH",
                                "pc_id": pc["id"],
                                "product_id": prod_id,
                                "master_price": master_prod["sale_price"],
                                "local_price": local_prod["sale_price"],
                            }
                        )

        self.inconsistencies = issues
        self.last_check = datetime.now()
        return issues

    def validate_employees(self) -> List[Dict]:
        """Compare employees across all PCs"""
        issues = []

        master_employees = db_query(
            "PC-PDV-01", "SELECT id, name, role FROM employees ORDER BY id"
        )
        master_ids = {e["id"] for e in master_employees}

        for pc in PC_CONFIG:
            if pc["id"] == "PC-PDV-01":
                continue

            local_employees = db_query(pc["id"], "SELECT id FROM employees")
            local_ids = {e["id"] for e in local_employees}

            missing = master_ids - local_ids
            if missing:
                issues.append(
                    {
                        "type": "MISSING_EMPLOYEES",
                        "pc_id": pc["id"],
                        "count": len(missing),
                        "employee_ids": list(missing)[:5],  # First 5
                    }
                )

        return issues


# ============================================================================
# LIVE DASHBOARD
# ============================================================================


class LiveDashboard:
    """Terminal-based live dashboard using curses"""

    def __init__(self, monitor: HealthMonitor, validator: SyncValidator):
        self.monitor = monitor
        self.validator = validator
        self.running = True
        self.cycle = 0
        self.start_time = time.time()

    def draw(self, stdscr):
        """Main drawing loop"""
        curses.curs_set(0)
        curses.start_color()
        curses.use_default_colors()
        curses.init_pair(1, curses.COLOR_GREEN, -1)  # OK
        curses.init_pair(2, curses.COLOR_YELLOW, -1)  # WARN
        curses.init_pair(3, curses.COLOR_RED, -1)  # ERROR
        curses.init_pair(4, curses.COLOR_CYAN, -1)  # HEADER
        curses.init_pair(5, curses.COLOR_MAGENTA, -1)  # ACCENT

        while self.running:
            stdscr.clear()
            height, width = stdscr.getmaxyx()

            # Header
            header = "🧪 GIRO Continuous Test Monitor"
            runtime = time.time() - self.start_time
            runtime_str = f"{int(runtime//3600):02d}:{int((runtime%3600)//60):02d}:{int(runtime%60):02d}"

            stdscr.attron(curses.color_pair(4) | curses.A_BOLD)
            stdscr.addstr(0, 0, "╔" + "═" * (width - 2) + "╗")
            stdscr.addstr(1, 0, f"║ {header:<{width-4}} ║")
            stdscr.addstr(
                2,
                0,
                f"║ Cycle: {self.cycle:>5} | Runtime: {runtime_str} | PCs: {len(PC_CONFIG):<{width-45}} ║",
            )
            stdscr.addstr(3, 0, "╠" + "═" * (width - 2) + "╣")
            stdscr.attroff(curses.color_pair(4) | curses.A_BOLD)

            # PC Status Grid
            row = 4
            for i, pc in enumerate(PC_CONFIG):
                pc_id = pc["id"]
                emoji = pc["emoji"]
                status = self.monitor.statuses.get(pc_id)

                if status:
                    status_char = {"OK": "●", "WARN": "◐", "ERROR": "○"}[status.status]
                    color = {"OK": 1, "WARN": 2, "ERROR": 3}[status.status]

                    stdscr.addstr(row, 0, f"║ {emoji} ")
                    stdscr.attron(curses.color_pair(color))
                    stdscr.addstr(f"{status_char}")
                    stdscr.attroff(curses.color_pair(color))

                    info = f" {pc_id:<12} │ Emp:{status.employee_count:>3} │ Prod:{status.product_count:>4} │ Sales:{status.sale_count:>5}"
                    if status.network_connected or pc["role"] == "MASTER":
                        info += " │ 🔗"
                    else:
                        info += " │ ⛓️‍💥"

                    stdscr.addstr(info)

                    # Pad to width
                    padding = width - len(info) - 7
                    if padding > 0:
                        stdscr.addstr(" " * padding + "║")
                else:
                    stdscr.addstr(
                        row,
                        0,
                        f"║ {emoji} ⏳ {pc_id:<12} │ Checking...".ljust(width - 2)
                        + "║",
                    )

                row += 1

            # Separator
            stdscr.addstr(row, 0, "╠" + "═" * (width - 2) + "╣")
            row += 1

            # Summary
            summary = self.monitor.get_summary()
            stdscr.attron(curses.color_pair(4))
            stdscr.addstr(row, 0, f"║ HEALTH: ")
            stdscr.attroff(curses.color_pair(4))

            stdscr.attron(curses.color_pair(1))
            stdscr.addstr(f"✅ OK:{summary['ok']} ")
            stdscr.attroff(curses.color_pair(1))

            stdscr.attron(curses.color_pair(2))
            stdscr.addstr(f"⚠️ WARN:{summary['warn']} ")
            stdscr.attroff(curses.color_pair(2))

            stdscr.attron(curses.color_pair(3))
            stdscr.addstr(f"❌ ERROR:{summary['error']}")
            stdscr.attroff(curses.color_pair(3))

            # Pad
            padding = width - 50
            stdscr.addstr(" " * max(0, padding) + "║")
            row += 1

            # Sync Status
            sync_issues = len(self.validator.inconsistencies)
            stdscr.addstr(row, 0, f"║ SYNC: ")
            if sync_issues == 0:
                stdscr.attron(curses.color_pair(1))
                stdscr.addstr("✓ All synchronized")
                stdscr.attroff(curses.color_pair(1))
            else:
                stdscr.attron(curses.color_pair(3))
                stdscr.addstr(f"✗ {sync_issues} inconsistencies detected")
                stdscr.attroff(curses.color_pair(3))
            stdscr.addstr(" " * (width - 40) + "║")
            row += 1

            # Recent Alerts
            stdscr.addstr(row, 0, "╠" + "═" * (width - 2) + "╣")
            row += 1
            stdscr.attron(curses.color_pair(5) | curses.A_BOLD)
            stdscr.addstr(row, 0, f"║ RECENT ALERTS".ljust(width - 1) + "║")
            stdscr.attroff(curses.color_pair(5) | curses.A_BOLD)
            row += 1

            alerts = self.monitor.alerts[-5:]  # Last 5
            if alerts:
                for alert in reversed(alerts):
                    alert_line = (
                        f"║  [{alert['pc_id']}] {', '.join(alert['messages'][:2])}"
                    )
                    if len(alert_line) > width - 2:
                        alert_line = alert_line[: width - 5] + "..."
                    stdscr.attron(curses.color_pair(3))
                    stdscr.addstr(row, 0, alert_line.ljust(width - 1) + "║")
                    stdscr.attroff(curses.color_pair(3))
                    row += 1
            else:
                stdscr.attron(curses.color_pair(1))
                stdscr.addstr(
                    row,
                    0,
                    f"║  No alerts - all systems operational".ljust(width - 1) + "║",
                )
                stdscr.attroff(curses.color_pair(1))
                row += 1

            # Footer
            stdscr.addstr(row, 0, "╚" + "═" * (width - 2) + "╝")
            row += 1
            stdscr.addstr(
                row, 0, " Press 'q' to quit | 'r' to refresh | 's' to run sync check"
            )

            stdscr.refresh()

            # Handle input
            stdscr.timeout(100)
            try:
                key = stdscr.getch()
                if key == ord("q"):
                    self.running = False
                elif key == ord("r"):
                    self.monitor.check_all()
                elif key == ord("s"):
                    self.validator.validate_products()
            except:
                pass

            time.sleep(0.1)

    def run(self):
        """Start the dashboard"""
        curses.wrapper(self.draw)


# ============================================================================
# CONTINUOUS TEST RUNNER
# ============================================================================


class ContinuousTestRunner:
    """Runs tests continuously at specified intervals"""

    def __init__(self, interval: int = 30, duration: int = 3600):
        self.interval = interval
        self.duration = duration
        self.monitor = HealthMonitor()
        self.validator = SyncValidator()
        self.running = True
        self.cycle = 0
        self.start_time = time.time()
        self.log_file = (
            LOGS_DIR / f"continuous_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        )

        LOGS_DIR.mkdir(parents=True, exist_ok=True)

        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def _handle_signal(self, signum, frame):
        print("\n\n🛑 Received shutdown signal, stopping...")
        self.running = False

    def log(self, message: str):
        """Log to file and console"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        line = f"[{timestamp}] {message}"
        print(line)
        with open(self.log_file, "a") as f:
            f.write(line + "\n")

    def run_cycle(self):
        """Execute one test cycle"""
        self.cycle += 1
        self.log(f"\n{'='*60}")
        self.log(f"🔄 CYCLE {self.cycle} - {datetime.now().isoformat()}")
        self.log(f"{'='*60}")

        # Health checks
        self.log("📊 Running health checks...")
        self.monitor.check_all()
        summary = self.monitor.get_summary()
        self.log(
            f"   Health: ✅{summary['ok']} ⚠️{summary['warn']} ❌{summary['error']}"
        )

        # Sync validation
        self.log("🔄 Validating sync consistency...")
        sync_issues = self.validator.validate_products()
        if sync_issues:
            self.log(f"   ⚠️ Found {len(sync_issues)} sync inconsistencies!")
            for issue in sync_issues[:3]:
                self.log(
                    f"      - {issue['type']}: {issue.get('details', issue['pc_id'])}"
                )
        else:
            self.log("   ✅ All PCs synchronized")

        # Report errors
        for pc_id, status in self.monitor.statuses.items():
            if status.errors:
                self.log(f"   ❌ {pc_id}: {', '.join(status.errors)}")
            if status.warnings:
                self.log(f"   ⚠️ {pc_id}: {', '.join(status.warnings)}")

        return summary

    def run(self, use_dashboard: bool = True):
        """Main run loop"""
        self.log(f"🚀 Starting Continuous Test Runner")
        self.log(f"   Interval: {self.interval}s, Duration: {self.duration}s")
        self.log(f"   Log file: {self.log_file}")

        if use_dashboard:
            # Run dashboard in main thread
            dashboard = LiveDashboard(self.monitor, self.validator)

            # Start background test thread
            def test_loop():
                while self.running and (time.time() - self.start_time) < self.duration:
                    self.run_cycle()
                    dashboard.cycle = self.cycle
                    time.sleep(self.interval)
                dashboard.running = False

            test_thread = threading.Thread(target=test_loop, daemon=True)
            test_thread.start()

            dashboard.run()
        else:
            # Console-only mode
            while self.running and (time.time() - self.start_time) < self.duration:
                self.run_cycle()

                if self.running:
                    self.log(f"⏳ Next cycle in {self.interval}s...")
                    time.sleep(self.interval)

        # Final summary
        self.log("\n" + "=" * 60)
        self.log("📈 FINAL SUMMARY")
        self.log("=" * 60)
        summary = self.monitor.get_summary()
        self.log(f"   Total cycles: {self.cycle}")
        self.log(f"   Final health: {summary['health_pct']}")
        self.log(f"   Total alerts: {summary['alerts']}")
        self.log(f"   Log saved to: {self.log_file}")


# ============================================================================
# MAIN
# ============================================================================


def main():
    parser = argparse.ArgumentParser(description="GIRO Continuous Test Runner")
    parser.add_argument(
        "--interval", type=int, default=30, help="Seconds between test cycles"
    )
    parser.add_argument(
        "--duration", type=int, default=3600, help="Total duration in seconds"
    )
    parser.add_argument(
        "--no-dashboard", action="store_true", help="Disable curses dashboard"
    )

    args = parser.parse_args()

    runner = ContinuousTestRunner(interval=args.interval, duration=args.duration)

    runner.run(use_dashboard=not args.no_dashboard)


if __name__ == "__main__":
    main()
