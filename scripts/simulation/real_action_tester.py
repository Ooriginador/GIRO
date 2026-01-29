#!/usr/bin/env python3
"""
┌─────────────────────────────────────────────────────────────────────┐
│         🚀 GIRO Real Action Tester v1.0                            │
│                  Arkheion Corp © 2026                               │
├─────────────────────────────────────────────────────────────────────┤
│  Executa ações REAIS nas instâncias GIRO via WebSocket:            │
│  - Login de funcionários                                           │
│  - Abertura/fechamento de caixa                                    │
│  - Criação de vendas                                               │
│  - Movimentação de estoque                                         │
│  - Sincronização entre PCs                                         │
└─────────────────────────────────────────────────────────────────────┘
"""

import asyncio
import json
import random
import sqlite3
import time
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import websockets
except ImportError:
    print("❌ Instalando websockets...")
    import subprocess

    subprocess.run(["pip", "install", "websockets"], check=True)
    import websockets

# ============================================================================
# CONFIGURATION
# ============================================================================

SIM_DIR = Path("/tmp/giro-sim")
MASTER_HOST = "127.0.0.1"
MASTER_PORT = 3847
MASTER_WS_URL = f"ws://{MASTER_HOST}:{MASTER_PORT}"

# ============================================================================
# PROTOCOL
# ============================================================================


@dataclass
class ActionResult:
    success: bool
    action: str
    pc_id: str
    response: Optional[Dict] = None
    error: Optional[str] = None
    duration_ms: float = 0


class GiroWebSocketClient:
    """Cliente WebSocket para comunicação com GIRO Master"""

    def __init__(self, pc_id: str):
        self.pc_id = pc_id
        self.ws = None
        self.token = None
        self.employee_id = None
        self.request_id = 0

    async def connect(self) -> bool:
        """Conecta ao servidor Master"""
        try:
            self.ws = await asyncio.wait_for(
                websockets.connect(MASTER_WS_URL), timeout=5.0
            )
            print(f"  ✅ {self.pc_id}: Conectado ao Master")
            return True
        except Exception as e:
            print(f"  ❌ {self.pc_id}: Erro ao conectar - {e}")
            return False

    async def disconnect(self):
        """Desconecta do servidor"""
        if self.ws:
            await self.ws.close()
            self.ws = None

    async def send_request(self, action: str, payload: Dict = None) -> ActionResult:
        """Envia requisição e aguarda resposta"""
        if not self.ws:
            return ActionResult(False, action, self.pc_id, error="Not connected")

        self.request_id += 1
        request = {
            "id": self.request_id,  # u64, não string
            "action": action,
            "payload": payload or {},
            "timestamp": int(time.time() * 1000),  # i64 em ms
        }

        if self.token:
            request["token"] = self.token

        start = time.time()
        try:
            await self.ws.send(json.dumps(request))
            response_raw = await asyncio.wait_for(self.ws.recv(), timeout=10.0)
            response = json.loads(response_raw)
            duration = (time.time() - start) * 1000

            if response.get("success", False):
                return ActionResult(
                    True,
                    action,
                    self.pc_id,
                    response=response.get("data"),
                    duration_ms=duration,
                )
            else:
                return ActionResult(
                    False,
                    action,
                    self.pc_id,
                    error=response.get("error", "Unknown error"),
                    duration_ms=duration,
                )

        except asyncio.TimeoutError:
            return ActionResult(False, action, self.pc_id, error="Timeout")
        except Exception as e:
            return ActionResult(False, action, self.pc_id, error=str(e))

    async def system_login(self, terminal_name: str) -> ActionResult:
        """Login de sistema (terminal)"""
        # Formato correto: camelCase, com secret da rede
        result = await self.send_request(
            "auth.system",
            {
                "secret": "giro-sim-secret-2024",
                "terminalId": str(uuid.uuid4()),
                "terminalName": terminal_name,
            },
        )
        # Capturar token para usar nas próximas requisições
        if result.success and result.response:
            self.token = result.response.get("token")
        return result

    async def employee_login(self, pin: str) -> ActionResult:
        """Login de funcionário com PIN"""
        result = await self.send_request("auth.login", {"pin": pin})
        if result.success and result.response:
            self.token = result.response.get("token")
            self.employee_id = result.response.get("employee", {}).get("id")
        return result

    async def search_products(self, query: str = "", limit: int = 10) -> ActionResult:
        """Busca produtos"""
        return await self.send_request(
            "product.search", {"query": query, "limit": limit}
        )

    async def get_product(self, product_id: str) -> ActionResult:
        """Obtém produto por ID"""
        return await self.send_request("product.get", {"id": product_id})

    async def adjust_stock(
        self, product_id: str, quantity: float, reason: str = "adjustment"
    ) -> ActionResult:
        """Ajusta estoque de produto"""
        return await self.send_request(
            "stock.adjust",
            {"productId": product_id, "quantity": quantity, "reason": reason},
        )

    async def get_categories(self) -> ActionResult:
        """Lista categorias"""
        return await self.send_request("category.list", {})

    async def sync_full(self) -> ActionResult:
        """Solicita sincronização completa"""
        return await self.send_request("sync.full", {"sinceVersion": 0})

    async def sync_delta(self, since_version: int = 0) -> ActionResult:
        """Obtém delta de sincronização"""
        return await self.send_request("sync.delta", {"sinceVersion": since_version})


# ============================================================================
# ACTION SCENARIOS
# ============================================================================


class ActionScenario:
    """Cenário de ação para executar"""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.results: List[ActionResult] = []

    async def execute(self, clients: List[GiroWebSocketClient]) -> List[ActionResult]:
        raise NotImplementedError


class SystemLoginScenario(ActionScenario):
    """Cenário: Login de sistema em todos os terminais"""

    def __init__(self):
        super().__init__("system_login", "Login de sistema nos terminais")

    async def execute(self, clients: List[GiroWebSocketClient]) -> List[ActionResult]:
        results = []
        for client in clients:
            result = await client.system_login(client.pc_id)
            results.append(result)
            if result.success:
                print(
                    f"  ✅ {client.pc_id}: Sistema logado ({result.duration_ms:.0f}ms)"
                )
            else:
                print(f"  ❌ {client.pc_id}: Falha - {result.error}")
        return results


class ProductSearchScenario(ActionScenario):
    """Cenário: Busca de produtos em paralelo"""

    def __init__(self):
        super().__init__("product_search", "Busca de produtos em múltiplos terminais")

    async def execute(self, clients: List[GiroWebSocketClient]) -> List[ActionResult]:
        search_terms = [
            "filtro",
            "pastilha",
            "óleo",
            "correia",
            "amortecedor",
            "vela",
            "bateria",
            "disco",
        ]

        async def search_on_client(client: GiroWebSocketClient):
            term = random.choice(search_terms)
            result = await client.search_products(term, limit=5)
            if result.success:
                count = len(result.response) if result.response else 0
                print(
                    f"  🔍 {client.pc_id}: '{term}' → {count} produtos ({result.duration_ms:.0f}ms)"
                )
            else:
                print(f"  ❌ {client.pc_id}: Busca falhou - {result.error}")
            return result

        tasks = [search_on_client(c) for c in clients]
        return await asyncio.gather(*tasks)


class StockMovementScenario(ActionScenario):
    """Cenário: Movimentação de estoque"""

    def __init__(self):
        super().__init__("stock_movement", "Ajustes de estoque simulados")

    async def execute(self, clients: List[GiroWebSocketClient]) -> List[ActionResult]:
        # Primeiro, busca alguns produtos
        if not clients:
            return []

        master = clients[0]
        search_result = await master.search_products("", limit=20)

        if not search_result.success or not search_result.response:
            print(f"  ⚠️ Não foi possível buscar produtos para movimentar")
            return [search_result]

        products = search_result.response
        results = [search_result]

        # Cada cliente ajusta estoque de um produto diferente
        for i, client in enumerate(
            clients[1:4]
        ):  # Apenas 3 clientes para não sobrecarregar
            if i < len(products):
                product = products[i]
                qty = random.randint(-5, 10)
                result = await client.adjust_stock(
                    product.get("id", ""), qty, f"Teste automático {client.pc_id}"
                )
                results.append(result)
                if result.success:
                    print(
                        f"  📦 {client.pc_id}: Ajustou {qty:+d} unidades ({result.duration_ms:.0f}ms)"
                    )
                else:
                    print(f"  ❌ {client.pc_id}: Ajuste falhou - {result.error}")

        return results


class SyncScenario(ActionScenario):
    """Cenário: Sincronização entre terminais"""

    def __init__(self):
        super().__init__("sync", "Sincronização de dados")

    async def execute(self, clients: List[GiroWebSocketClient]) -> List[ActionResult]:
        results = []

        # Solicita sync delta em todos os clientes
        for client in clients[:5]:  # Limita a 5
            result = await client.sync_delta(since_version=0)
            results.append(result)
            if result.success:
                data = result.response or {}
                count = len(data.get("products", [])) + len(data.get("categories", []))
                print(
                    f"  🔄 {client.pc_id}: Sync delta - {count} itens ({result.duration_ms:.0f}ms)"
                )
            else:
                print(f"  ❌ {client.pc_id}: Sync falhou - {result.error}")

        # Aguarda processamento
        await asyncio.sleep(0.5)

        # Tenta sync full no primeiro cliente
        if clients:
            result = await clients[0].sync_full()
            results.append(result)
            if result.success:
                print(
                    f"  📊 {clients[0].pc_id}: Sync full concluído ({result.duration_ms:.0f}ms)"
                )

        return results


class ConcurrentActionsScenario(ActionScenario):
    """Cenário: Ações concorrentes de múltiplos terminais"""

    def __init__(self):
        super().__init__("concurrent", "Ações concorrentes simultâneas")

    async def execute(self, clients: List[GiroWebSocketClient]) -> List[ActionResult]:
        async def random_action(client: GiroWebSocketClient):
            action = random.choice(["search", "categories", "sync_delta"])

            if action == "search":
                return await client.search_products(
                    random.choice(["a", "e", "i", "o", "u"])
                )
            elif action == "categories":
                return await client.get_categories()
            else:
                return await client.sync_delta(since_version=0)

        # Executa 3 rodadas de ações concorrentes
        all_results = []
        for round_num in range(3):
            print(f"  🔄 Rodada {round_num + 1}/3...")
            tasks = [random_action(c) for c in clients]
            results = await asyncio.gather(*tasks)
            all_results.extend(results)

            successes = sum(1 for r in results if r.success)
            print(f"     ✅ {successes}/{len(results)} ações bem sucedidas")

            await asyncio.sleep(0.5)

        return all_results


# ============================================================================
# MAIN EXECUTOR
# ============================================================================


async def run_real_action_tests():
    """Executa todos os cenários de teste"""

    print(
        """
╔═══════════════════════════════════════════════════════════════════╗
║         🚀 GIRO Real Action Tester - Arkheion Corp               ║
╚═══════════════════════════════════════════════════════════════════╝
    """
    )

    # Configuração dos PCs
    pcs = [
        "PC-PDV-01",
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

    print("📡 Conectando aos terminais via WebSocket...")
    print(f"   Master: {MASTER_WS_URL}")
    print()

    # Criar clientes e fazer login de sistema imediatamente
    clients: List[GiroWebSocketClient] = []
    for pc_id in pcs:
        client = GiroWebSocketClient(pc_id)
        if await client.connect():
            # Login de sistema imediato para obter token
            login_result = await client.system_login(pc_id)
            if login_result.success:
                print(f"  ✅ {pc_id}: Conectado e autenticado")
                clients.append(client)
            else:
                print(f"  ⚠️ {pc_id}: Conectado mas login falhou: {login_result.error}")
                await client.disconnect()

    if not clients:
        print("❌ Nenhum cliente autenticou. Verifique se o Master está rodando.")
        return

    print(f"\n✅ {len(clients)} terminais conectados e autenticados")
    print()

    # Cenários de teste (sem o SystemLoginScenario pois já foi feito)
    scenarios = [
        ProductSearchScenario(),
        StockMovementScenario(),
        SyncScenario(),
        ConcurrentActionsScenario(),
    ]

    total_actions = 0
    successful_actions = 0

    for scenario in scenarios:
        print(f"═══════════════════════════════════════════════════════════")
        print(f"📋 {scenario.name.upper()}: {scenario.description}")
        print(f"═══════════════════════════════════════════════════════════")

        try:
            results = await scenario.execute(clients)
            scenario.results = results

            successes = sum(1 for r in results if r.success)
            total_actions += len(results)
            successful_actions += successes

            print(f"   Resultado: {successes}/{len(results)} ações bem sucedidas")
            print()

        except Exception as e:
            print(f"   ❌ Erro no cenário: {e}")
            import traceback

            traceback.print_exc()
            print()

    # Desconectar
    print("🔌 Desconectando terminais...")
    for client in clients:
        await client.disconnect()

    # Resumo
    success_rate = (
        (successful_actions / total_actions * 100) if total_actions > 0 else 0
    )

    print(
        f"""
╔═══════════════════════════════════════════════════════════════════╗
║                    📊 RESUMO DE EXECUÇÃO                          ║
╠═══════════════════════════════════════════════════════════════════╣
║  Total de Ações:     {total_actions:>4}                                        ║
║  Ações Bem Sucedidas:{successful_actions:>4}                                        ║
║  Taxa de Sucesso:   {success_rate:>5.1f}%                                       ║
╚═══════════════════════════════════════════════════════════════════╝
    """
    )


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    asyncio.run(run_real_action_tests())
