# Dashboard Gerencial Enterprise - Implementação Real (PARCIAL)

**Data:** 27/01/2026  
**Status:** Backend Completo | Frontend 50%

## ✅ Implementado

### Backend (Rust)

1. **Model `EnterpriseDashboardStats`** (`models/enterprise.rs`)

   ```rust
   pub struct EnterpriseDashboardStats {
       pub active_contracts: i32,
       pub pending_requests: i32,
       pub in_transit_transfers: i32,
       pub low_stock_items: i32,
       pub monthly_consumption: f64,
       pub consumption_trend: f64,
   }
   ```

2. **Repository Method** (`repositories/contract_repository.rs`)

   - `get_global_dashboard()` - Agrega KPIs globais:
     - **Contratos Ativos:** `SELECT COUNT(*) WHERE status='ACTIVE'`
     - **Requisições Pendentes:** `SELECT COUNT(*) WHERE status='PENDING'`
     - **Transferências em Trânsito:** `SELECT COUNT(*) WHERE status='IN_TRANSIT'`
     - **Itens com Estoque Baixo:** Produtos onde `SUM(balances) <= min_stock`
     - **Consumo Mensal:** `SUM(total_cost) FROM material_consumptions WHERE consumed_at >= current_month`
     - **Tendência:** Comparação com mês anterior (%)

3. **Command Tauri** (`commands/contracts.rs`)

   ```rust
   #[tauri::command]
   pub async fn get_enterprise_dashboard() -> AppResult<EnterpriseDashboardStats> {
       ContractRepository::new().get_global_dashboard().await
   }
   ```

4. **Exportado em `main.rs`**
   - Adicionado `commands::get_enterprise_dashboard` em ambas as listas de comandos.

### Frontend (TypeScript)

1. **Type Interface** (`types/enterprise.ts`)

   - Atualizado `EnterpriseKPIs` para incluir `monthlyConsumption` e `consumptionTrend`.

2. **Tauri Wrapper** (`lib/tauri.ts`)

   ```typescript
   export async function getEnterpriseDashboard(): Promise<EnterpriseKPIs> {
     return tauriInvoke('get_enterprise_dashboard');
   }
   ```

3. **Hook React Query** (`hooks/enterprise/useContracts.ts`)

   ```typescript
   export function useEnterpriseDashboard() {
     return useQuery({
       queryKey: ['enterprise', 'dashboard'],
       queryFn: () => tauri.getEnterpriseDashboard(),
       staleTime: 1000 * 60 * 2, // 2 minutos
     });
   }
   ```

4. **Correção de Hook Legacy**
   - `useContractDashboard()` agora requer `id: string` (era global antes, causava confusão).

## ⚠️ Pendente

### Frontend (`EnterpriseDashboardPage.tsx`)

- **Substituir lógica mock** por `useEnterpriseDashboard()`.
- Atualmente usa:
  ```typescript
  const activeContracts = contracts?.filter((c) => c.status === 'ACTIVE').length || 0;
  ```
- **Deve usar:**
  ```typescript
  const { data: dashboard } = useEnterpriseDashboard();
  const kpis = dashboard || { activeContracts: 0, ... };
  ```

### Gráficos de Consumo

- O widget `ConsumptionChartWidget` ainda usa dados mockados.
- **Necessário:** Backend retornar `MonthlyConsumptionItem[]` com histórico.

### Testes

- Adicionar testes unitários para `get_global_dashboard()`.
- Atualizar mocks de `useContractDashboard` nos testes existentes.

## Relatórios de Compliance (Não Iniciado)

### Kardex (Rastreio de Movimentação)

- **Objetivo:** Relatório de todas as movimentações de um produto (entradas, saídas, transferências, consumos).
- **Schema Necessário:** Tabela de histórico ou query com UNION de:
  - `stock_movements` (ajustes)
  - `material_request_items` (consumos via requisição)
  - `stock_transfer_items` (transferências)
- **Formato:** CSV/PDF com colunas [Data, Tipo, Documento, Qtd Entrada, Qtd Saída, Saldo].

### Próxima Ação Recomendada

1. Finalizar integração do Dashboard (`EnterpriseDashboardPage.tsx`).
2. Criar comando `get_product_kardex(product_id, start_date, end_date)`.
3. UI de Relatórios com filtros de período e produto.
