#!/usr/bin/env python3
"""
GIRO Network Full Test Suite
Testa todo o fluxo: auth.system → sync.full → auth.login
"""

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import websockets


@dataclass
class TestResult:
    name: str
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class GIRONetworkTester:
    def __init__(self, master_uri: str = "ws://127.0.0.1:3847"):
        self.master_uri = master_uri
        self.network_secret = "giro-sim-network-2026"
        self.results: list[TestResult] = []

    def _msg(self, id: int, action: str, payload: dict) -> str:
        return json.dumps(
            {
                "id": id,
                "action": action,
                "payload": payload,
                "timestamp": int(time.time() * 1000),
            }
        )

    async def test_connection(self) -> TestResult:
        """Testa conexão básica ao Master"""
        try:
            async with websockets.connect(self.master_uri) as ws:
                return TestResult(
                    name="WebSocket Connection",
                    success=True,
                    message=f"Conectado ao {self.master_uri}",
                )
        except Exception as e:
            return TestResult(
                name="WebSocket Connection", success=False, message=f"Falha: {e}"
            )

    async def test_auth_system(self) -> TestResult:
        """Testa autenticação de sistema (Satellite → Master)"""
        try:
            async with websockets.connect(self.master_uri) as ws:
                msg = self._msg(
                    1,
                    "auth.system",
                    {
                        "secret": self.network_secret,
                        "terminalId": "test-satellite",
                        "terminalName": "Test Satellite",
                    },
                )
                await ws.send(msg)
                response = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(response)

                if data.get("success"):
                    return TestResult(
                        name="auth.system",
                        success=True,
                        message=f"Token obtido, expira em: {data['data']['expiresAt']}",
                        data=data["data"],
                    )
                else:
                    return TestResult(
                        name="auth.system",
                        success=False,
                        message=f"Erro: {data.get('error')}",
                    )
        except Exception as e:
            return TestResult(
                name="auth.system", success=False, message=f"Exceção: {e}"
            )

    async def test_sync_full(self) -> TestResult:
        """Testa sincronização completa de dados"""
        try:
            async with websockets.connect(self.master_uri) as ws:
                # Auth primeiro
                auth_msg = self._msg(
                    1,
                    "auth.system",
                    {
                        "secret": self.network_secret,
                        "terminalId": "test-satellite",
                        "terminalName": "Test Satellite",
                    },
                )
                await ws.send(auth_msg)
                await asyncio.wait_for(ws.recv(), timeout=10)

                # Sync
                sync_msg = self._msg(
                    2,
                    "sync.full",
                    {
                        "tables": [
                            "products",
                            "categories",
                            "customers",
                            "employees",
                            "suppliers",
                            "settings",
                        ]
                    },
                )
                await ws.send(sync_msg)
                response = await asyncio.wait_for(ws.recv(), timeout=30)
                data = json.loads(response)

                if data.get("success"):
                    sync_data = data.get("data", {})
                    counts = {
                        "products": len(sync_data.get("products", [])),
                        "categories": len(sync_data.get("categories", [])),
                        "customers": len(sync_data.get("customers", [])),
                        "employees": len(sync_data.get("employees", [])),
                        "suppliers": len(sync_data.get("suppliers", [])),
                        "settings": len(sync_data.get("settings", [])),
                    }
                    return TestResult(
                        name="sync.full",
                        success=True,
                        message=f"Produtos: {counts['products']}, Funcionários: {counts['employees']}, Clientes: {counts['customers']}",
                        data=counts,
                    )
                else:
                    return TestResult(
                        name="sync.full",
                        success=False,
                        message=f"Erro: {data.get('error')}",
                    )
        except Exception as e:
            return TestResult(name="sync.full", success=False, message=f"Exceção: {e}")

    async def test_auth_login(self, pin: str, expected_name: str) -> TestResult:
        """Testa login de funcionário por PIN"""
        try:
            async with websockets.connect(self.master_uri) as ws:
                msg = self._msg(
                    1,
                    "auth.login",
                    {
                        "pin": pin,
                        "deviceId": "test-device",
                        "deviceName": "Test Device",
                    },
                )
                await ws.send(msg)
                response = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(response)

                if data.get("success"):
                    emp = data["data"]["employee"]
                    return TestResult(
                        name=f"auth.login (PIN: {pin})",
                        success=True,
                        message=f"{emp['name']} ({emp['role']})",
                        data=emp,
                    )
                else:
                    return TestResult(
                        name=f"auth.login (PIN: {pin})",
                        success=False,
                        message=f"Erro: {data.get('error')}",
                    )
        except Exception as e:
            return TestResult(
                name=f"auth.login (PIN: {pin})", success=False, message=f"Exceção: {e}"
            )

    async def run_all_tests(self):
        """Executa todos os testes"""
        print("=" * 60)
        print("🧪 GIRO Network Test Suite")
        print("=" * 60)
        print()

        # Teste de conexão
        result = await self.test_connection()
        self.results.append(result)
        self._print_result(result)

        if not result.success:
            print("\n❌ Falha na conexão. Abortando testes.")
            return

        # Teste auth.system
        result = await self.test_auth_system()
        self.results.append(result)
        self._print_result(result)

        # Teste sync.full
        result = await self.test_sync_full()
        self.results.append(result)
        self._print_result(result)

        # Testes de login
        logins = [
            ("1234", "João Silva"),
            ("2345", "Maria Santos"),
            ("3456", "Pedro Oliveira"),
            ("4567", "Ana Costa"),
            ("5678", "Carlos Souza"),
        ]

        for pin, name in logins:
            result = await self.test_auth_login(pin, name)
            self.results.append(result)
            self._print_result(result)

        # Resumo
        print()
        print("=" * 60)
        passed = sum(1 for r in self.results if r.success)
        failed = len(self.results) - passed
        print(f"📊 Resultado: {passed}/{len(self.results)} testes passaram")
        if failed > 0:
            print(f"❌ {failed} teste(s) falharam")
        else:
            print("✅ Todos os testes passaram!")
        print("=" * 60)

    def _print_result(self, result: TestResult):
        icon = "✅" if result.success else "❌"
        print(f"{icon} {result.name}: {result.message}")


async def main():
    tester = GIRONetworkTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
