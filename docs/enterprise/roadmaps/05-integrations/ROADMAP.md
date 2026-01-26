# 🔌 Integrations Roadmap - GIRO Enterprise

> **Agente:** 05-integrations  
> **Status:** � READY  
> **Progresso:** 0/6 (0%)  
> **Bloqueador:** -  
> **Última Atualização:** 25 de Janeiro de 2026

---

## 📋 Objetivo

Adaptar e criar integrações específicas para o perfil Enterprise:

- Mobile Scanner para inventário rotativo
- Exportação para ERPs de construção (Sienge, UAU)
- Importação de catálogo de fornecedores

---

## ✅ Checklist de Tasks

### Fase 1: Mobile Scanner Adaptation (3 tasks)

- [ ] **IN-001**: Adaptar módulo de inventário para Enterprise

  ```typescript
  // giro-mobile/app/inventory/scan.tsx

  // Adicionar suporte a multi-localização
  interface InventoryScanContext {
    locationId: string; // Local sendo inventariado
    locationType: LocationType;
    contractId?: string; // Se for local de obra
  }

  export function InventoryScanScreen() {
    const { locationId, locationType } = useLocalSearchParams();

    // Buscar saldos esperados do local
    const { data: balances } = useLocationBalances(locationId);

    // Scanner contínuo
    const handleScan = async (barcode: string) => {
      const product = await findProductByBarcode(barcode);

      if (!product) {
        showNotFound(barcode);
        return;
      }

      const expectedQty = balances?.find((b) => b.productId === product.id)?.quantity ?? 0;

      // Abrir modal de contagem
      openCountModal({
        product,
        expectedQty,
        locationId,
      });
    };

    return <ScannerView onScan={handleScan} />;
  }
  ```

- [ ] **IN-002**: Criar sync de contagem para GIRO Desktop

  ```typescript
  // Sincronização de contagens do mobile para desktop
  interface InventoryCountSync {
    inventoryId: string;
    locationId: string;
    counts: {
      productId: string;
      countedQty: number;
      countedAt: string;
      countedBy: string;
    }[];
    deviceId: string;
    syncedAt?: string;
  }

  // API endpoint no desktop para receber contagens
  #[command]
  pub async fn receive_mobile_counts(
      sync: InventoryCountSync,
      state: tauri::State<'_, AppState>,
  ) -> Result<(), String> {
      let service = InventoryService::new(state.pool.clone());

      for count in sync.counts {
          service.register_count(
              &sync.inventory_id,
              &count.product_id,
              count.counted_qty,
              &count.counted_by,
          ).await?;
      }

      Ok(())
  }
  ```

- [ ] **IN-003**: Adicionar modo offline para contagem

  ```typescript
  // Armazenar contagens localmente quando offline
  import AsyncStorage from '@react-native-async-storage/async-storage';

  const PENDING_COUNTS_KEY = '@giro/pending_counts';

  async function savePendingCount(count: InventoryCount) {
    const pending = await getPendingCounts();
    pending.push(count);
    await AsyncStorage.setItem(PENDING_COUNTS_KEY, JSON.stringify(pending));
  }

  async function syncPendingCounts() {
    const pending = await getPendingCounts();

    for (const count of pending) {
      try {
        await api.post('/inventory/counts', count);
        // Remover do pending após sucesso
        await removePendingCount(count.id);
      } catch (error) {
        // Manter para próxima tentativa
        console.error('Falha ao sincronizar:', error);
      }
    }
  }
  ```

### Fase 2: Exportação ERP (2 tasks)

- [ ] **IN-004**: Criar exportação para formato Sienge

  ```typescript
  // Sienge é um ERP popular em construtoras
  // Formato de importação de movimentações de estoque

  interface SiengeExportConfig {
    codigoEmpresa: string;
    codigoAlmoxarifado: string;
  }

  interface SiengeMovimentacao {
    tipo: 'E' | 'S';           // Entrada ou Saída
    dataMovimentacao: string;  // DD/MM/YYYY
    codigoProduto: string;
    descricaoProduto: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    centroCusto?: string;
    observacao?: string;
  }

  #[command]
  pub async fn export_sienge(
      start_date: String,
      end_date: String,
      config: SiengeExportConfig,
      state: tauri::State<'_, AppState>,
  ) -> Result<String, String> {
      let movements = fetch_movements(start_date, end_date, &state.pool).await?;

      let csv = generate_sienge_csv(movements, config);

      Ok(csv)
  }
  ```

- [ ] **IN-005**: Criar exportação para formato UAU

  ```typescript
  // UAU é outro ERP usado em construtoras
  // Formato XML para integração

  interface UAUExportConfig {
    codigoObra: string;
    codigoEmpreiteiro?: string;
  }

  #[command]
  pub async fn export_uau(
      contract_id: String,
      start_date: String,
      end_date: String,
      config: UAUExportConfig,
      state: tauri::State<'_, AppState>,
  ) -> Result<String, String> {
      let consumptions = fetch_consumptions(contract_id, start_date, end_date, &state.pool).await?;

      let xml = generate_uau_xml(consumptions, config);

      Ok(xml)
  }
  ```

### Fase 3: Importação de Catálogo (1 task)

- [ ] **IN-006**: Criar importação de catálogo de fornecedores

  ```typescript
  // Importar tabela de produtos de fornecedores
  // Suporte a CSV e XLSX

  interface CatalogImportMapping {
    codigoColumn: string;
    descricaoColumn: string;
    unidadeColumn: string;
    precoColumn?: string;
    categoriaColumn?: string;
  }

  interface CatalogImportResult {
    total: number;
    imported: number;
    updated: number;
    errors: { row: number; message: string }[];
  }

  #[command]
  pub async fn import_supplier_catalog(
      file_path: String,
      supplier_id: String,
      mapping: CatalogImportMapping,
      state: tauri::State<'_, AppState>,
  ) -> Result<CatalogImportResult, String> {
      // Ler arquivo (CSV ou XLSX)
      let rows = parse_catalog_file(&file_path)?;

      let mut result = CatalogImportResult::default();

      for (i, row) in rows.iter().enumerate() {
          match process_catalog_row(row, &supplier_id, &mapping, &state.pool).await {
              Ok(action) => {
                  match action {
                      ImportAction::Created => result.imported += 1,
                      ImportAction::Updated => result.updated += 1,
                  }
              }
              Err(e) => {
                  result.errors.push(ImportError { row: i + 1, message: e });
              }
          }
          result.total += 1;
      }

      Ok(result)
  }
  ```

---

## 🔄 Fluxo de Sincronização Mobile

```text
┌─────────────────────────────────────────────────────────────────┐
│                   SYNC INVENTÁRIO MOBILE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Mobile]                           [Desktop]                  │
│       │                                  │                      │
│   ┌───┴───┐                              │                      │
│   │ Scan  │                              │                      │
│   │ Items │                              │                      │
│   └───┬───┘                              │                      │
│       │                                  │                      │
│       ▼                                  │                      │
│   ┌───────┐     ┌─────────┐              │                      │
│   │ Save  │────►│ Pending │              │                      │
│   │ Local │     │  Queue  │              │                      │
│   └───────┘     └────┬────┘              │                      │
│                      │                   │                      │
│                      ▼                   │                      │
│                 ┌─────────┐              │                      │
│                 │ Online? │              │                      │
│                 └────┬────┘              │                      │
│                      │                   │                      │
│               ┌──────┴──────┐            │                      │
│               │             │            │                      │
│               ▼ YES         ▼ NO         │                      │
│          ┌─────────┐   ┌─────────┐       │                      │
│          │  Sync   │   │  Wait   │       │                      │
│          │ to API  │   │ Retry   │       │                      │
│          └────┬────┘   └─────────┘       │                      │
│               │                          │                      │
│               └─────────────────────────►│                      │
│                                          ▼                      │
│                                    ┌──────────┐                 │
│                                    │ Process  │                 │
│                                    │ Counts   │                 │
│                                    └──────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Formatos de Exportação

| ERP      | Formato | Campos                        |
| -------- | ------- | ----------------------------- |
| Sienge   | CSV     | Data, Produto, Qtd, Valor, CC |
| UAU      | XML     | Estruturado por obra          |
| Genérico | XLSX    | Todos os campos               |

---

## 🧪 Validação

- [ ] Mobile Scanner funciona offline
- [ ] Contagens sincronizam corretamente
- [ ] Exportação Sienge gera CSV válido
- [ ] Exportação UAU gera XML válido
- [ ] Importação de catálogo processa erros gracefully

---

<!-- Roadmap criado em: 25 de Janeiro de 2026 -->
