# 🧪 Testing Roadmap - GIRO Enterprise

> **Agente:** 06-testing  
> **Status:** 🟡 IN PROGRESS  
> **Progresso:** 5/12 (42%)  
> **Bloqueador:** -  
> **Última Atualização:** 25 de Janeiro de 2026

---

## 📋 Objetivo

Garantir qualidade do módulo Enterprise através de testes abrangentes:

- Testes unitários (Rust + TypeScript)
- Testes de integração (API/Commands)
- Testes E2E (Playwright)
- Coverage mínimo: 80%

---

## ✅ Progresso

### Testes Rust (Backend) - Existentes

- ✅ `tests/enterprise/contract_tests.rs` - Testes de contrato
- ✅ `tests/enterprise/material_request_tests.rs` - Testes de requisição
- ✅ `tests/enterprise/stock_transfer_tests.rs` - Testes de transferência
- ✅ `tests/enterprise/stock_location_tests.rs` - Testes de localização
- ✅ `tests/enterprise/activity_tests.rs` - Testes de atividade

### Testes TypeScript (Frontend) - Criados

- ✅ `tests/unit/enterprise/permissions.test.ts` - Testes de permissões
- ✅ `tests/unit/enterprise/store.test.ts` - Testes do store
- ✅ `tests/unit/enterprise/hooks.test.ts` - Testes dos hooks
- ✅ `tests/unit/enterprise/components.test.tsx` - Testes de componentes
- ✅ `tests/unit/enterprise/test-utils.ts` - Utilitários de teste

---

## ✅ Checklist de Tasks

### Fase 1: Testes Unitários Rust (4 tasks)

- [ ] **TE-001**: Testes para `contract_service.rs`

  ```rust
  // tests/unit/services/contract_service_test.rs

  #[cfg(test)]
  mod tests {
      use super::*;
      use sqlx::sqlite::SqlitePoolOptions;

      async fn setup_test_db() -> Pool<Sqlite> {
          let pool = SqlitePoolOptions::new()
              .connect(":memory:")
              .await
              .unwrap();

          sqlx::migrate!("./migrations")
              .run(&pool)
              .await
              .unwrap();

          pool
      }

      #[tokio::test]
      async fn test_create_contract() {
          let pool = setup_test_db().await;
          let service = ContractService::new(pool.clone());

          let input = CreateContractInput {
              code: "OBRA-001".to_string(),
              name: "Construção Sede".to_string(),
              client_name: "Empresa ABC".to_string(),
              client_document: "12.345.678/0001-90".to_string(),
              manager_id: create_test_employee(&pool).await,
              start_date: Some(Utc::now().date_naive()),
              ..Default::default()
          };

          let contract = service.create(input).await.unwrap();

          assert_eq!(contract.code, "OBRA-001");
          assert_eq!(contract.status, ContractStatus::Planning);
      }

      #[tokio::test]
      async fn test_contract_lifecycle() {
          let pool = setup_test_db().await;
          let service = ContractService::new(pool.clone());

          // Criar
          let contract = create_test_contract(&pool).await;
          assert_eq!(contract.status, ContractStatus::Planning);

          // Iniciar
          let contract = service.start(&contract.id).await.unwrap();
          assert_eq!(contract.status, ContractStatus::Active);

          // Suspender
          let contract = service.suspend(&contract.id, "Chuvas").await.unwrap();
          assert_eq!(contract.status, ContractStatus::Suspended);

          // Retomar
          let contract = service.resume(&contract.id).await.unwrap();
          assert_eq!(contract.status, ContractStatus::Active);

          // Concluir
          let contract = service.complete(&contract.id).await.unwrap();
          assert_eq!(contract.status, ContractStatus::Completed);
      }

      #[tokio::test]
      async fn test_duplicate_contract_code() {
          let pool = setup_test_db().await;
          let service = ContractService::new(pool.clone());

          let input = CreateContractInput {
              code: "OBRA-001".to_string(),
              ..Default::default()
          };

          service.create(input.clone()).await.unwrap();

          let result = service.create(input).await;

          assert!(matches!(result, Err(AppError::DuplicateCode)));
      }
  }
  ```

- [ ] **TE-002**: Testes para `material_request_service.rs`

  ```rust
  #[tokio::test]
  async fn test_request_workflow() {
      let pool = setup_test_db().await;
      let service = MaterialRequestService::new(pool.clone());

      // Setup
      let contract = create_test_contract(&pool).await;
      let location = create_test_location(&pool, LocationType::Central).await;
      let product = create_test_product(&pool).await;
      create_stock_balance(&pool, &location.id, &product.id, 100.0).await;

      // Criar requisição
      let request = service.create(CreateRequestInput {
          contract_id: contract.id.clone(),
          destination_location_id: location.id.clone(),
          items: vec![
              RequestItem { product_id: product.id.clone(), quantity: 10.0 }
          ],
      }).await.unwrap();

      assert_eq!(request.status, RequestStatus::Draft);

      // Submeter
      let request = service.submit(&request.id).await.unwrap();
      assert_eq!(request.status, RequestStatus::Pending);

      // Aprovar
      let request = service.approve(&request.id, None).await.unwrap();
      assert_eq!(request.status, RequestStatus::Approved);

      // Separar
      let request = service.start_separation(&request.id).await.unwrap();
      assert_eq!(request.status, RequestStatus::Separating);

      // Entregar
      let request = service.deliver(&request.id).await.unwrap();
      assert_eq!(request.status, RequestStatus::Delivered);

      // Verificar baixa de estoque
      let balance = get_stock_balance(&pool, &location.id, &product.id).await;
      assert_eq!(balance.quantity, 90.0);
  }

  #[tokio::test]
  async fn test_insufficient_stock_request() {
      let pool = setup_test_db().await;
      let service = MaterialRequestService::new(pool.clone());

      // Setup com estoque limitado
      let location = create_test_location(&pool, LocationType::Central).await;
      let product = create_test_product(&pool).await;
      create_stock_balance(&pool, &location.id, &product.id, 5.0).await;

      // Tentar requisitar mais do que disponível
      let result = service.create(CreateRequestInput {
          items: vec![
              RequestItem { product_id: product.id.clone(), quantity: 10.0 }
          ],
          ..Default::default()
      }).await;

      assert!(matches!(result, Err(AppError::InsufficientStock { .. })));
  }
  ```

- [ ] **TE-003**: Testes para `stock_transfer_service.rs`

  ```rust
  #[tokio::test]
  async fn test_transfer_between_locations() {
      let pool = setup_test_db().await;
      let service = StockTransferService::new(pool.clone());

      // Setup
      let origin = create_test_location(&pool, LocationType::Central).await;
      let destination = create_test_location(&pool, LocationType::WorkFront).await;
      let product = create_test_product(&pool).await;
      create_stock_balance(&pool, &origin.id, &product.id, 100.0).await;

      // Criar transferência
      let transfer = service.create(CreateTransferInput {
          origin_location_id: origin.id.clone(),
          destination_location_id: destination.id.clone(),
          items: vec![
              TransferItem { product_id: product.id.clone(), quantity: 30.0 }
          ],
      }).await.unwrap();

      // Executar (saída da origem)
      let transfer = service.execute(&transfer.id).await.unwrap();
      assert_eq!(transfer.status, TransferStatus::InTransit);

      let origin_balance = get_stock_balance(&pool, &origin.id, &product.id).await;
      assert_eq!(origin_balance.quantity, 70.0);

      // Receber (entrada no destino)
      let transfer = service.receive(&transfer.id).await.unwrap();
      assert_eq!(transfer.status, TransferStatus::Completed);

      let dest_balance = get_stock_balance(&pool, &destination.id, &product.id).await;
      assert_eq!(dest_balance.quantity, 30.0);
  }
  ```

- [ ] **TE-004**: Testes para `inventory_service.rs`

  ```rust
  #[tokio::test]
  async fn test_inventory_count_and_adjustment() {
      let pool = setup_test_db().await;
      let service = InventoryService::new(pool.clone());

      // Setup
      let location = create_test_location(&pool, LocationType::Central).await;
      let product = create_test_product(&pool).await;
      create_stock_balance(&pool, &location.id, &product.id, 100.0).await;

      // Iniciar inventário
      let inventory = service.start(&location.id).await.unwrap();

      // Registrar contagem (encontrou 95 unidades)
      service.register_count(&inventory.id, &product.id, 95.0, "user1").await.unwrap();

      // Verificar diferença
      let counts = service.get_counts(&inventory.id).await.unwrap();
      let count = counts.iter().find(|c| c.product_id == product.id).unwrap();
      assert_eq!(count.expected_qty, 100.0);
      assert_eq!(count.counted_qty, 95.0);
      assert_eq!(count.difference, -5.0);

      // Aplicar ajuste
      service.apply_adjustments(&inventory.id).await.unwrap();

      // Verificar saldo atualizado
      let balance = get_stock_balance(&pool, &location.id, &product.id).await;
      assert_eq!(balance.quantity, 95.0);
  }
  ```

### Fase 2: Testes Unitários Frontend (3 tasks)

- [ ] **TE-005**: Testes para hooks Enterprise

  ```typescript
  // tests/unit/hooks/useContracts.test.ts

  import { renderHook, waitFor } from '@testing-library/react';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { useContracts, useCreateContract } from '@/hooks/enterprise/useContracts';
  import { invoke } from '@tauri-apps/api/tauri';

  vi.mock('@tauri-apps/api/tauri');

  describe('useContracts', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    beforeEach(() => {
      queryClient.clear();
    });

    it('should fetch contracts list', async () => {
      const mockContracts = [
        { id: '1', code: 'OBRA-001', name: 'Obra 1', status: 'ACTIVE' },
        { id: '2', code: 'OBRA-002', name: 'Obra 2', status: 'PLANNING' },
      ];

      vi.mocked(invoke).mockResolvedValue(mockContracts);

      const { result } = renderHook(() => useContracts(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockContracts);
      expect(invoke).toHaveBeenCalledWith('list_contracts', { filters: undefined });
    });

    it('should filter by status', async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      renderHook(() => useContracts({ status: 'ACTIVE' }), { wrapper });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('list_contracts', {
          filters: { status: 'ACTIVE' },
        });
      });
    });
  });

  describe('useCreateContract', () => {
    it('should create contract and invalidate cache', async () => {
      const newContract = { id: '3', code: 'OBRA-003', name: 'Nova Obra' };
      vi.mocked(invoke).mockResolvedValue(newContract);

      const { result } = renderHook(() => useCreateContract(), { wrapper });

      await result.current.mutateAsync({
        code: 'OBRA-003',
        name: 'Nova Obra',
        managerId: 'user1',
      });

      expect(invoke).toHaveBeenCalledWith('create_contract', {
        input: expect.objectContaining({ code: 'OBRA-003' }),
      });
    });
  });
  ```

- [ ] **TE-006**: Testes para componentes Enterprise

  ```typescript
  // tests/unit/components/ContractCard.test.tsx

  import { render, screen, fireEvent } from '@testing-library/react';
  import { ContractCard } from '@/components/enterprise/ContractCard';

  describe('ContractCard', () => {
    const mockContract = {
      id: '1',
      code: 'OBRA-001',
      name: 'Construção Sede',
      clientName: 'Empresa ABC',
      status: 'ACTIVE',
      manager: { id: 'u1', name: 'João Silva' },
    };

    it('should render contract information', () => {
      render(<ContractCard contract={mockContract} />);

      expect(screen.getByText('OBRA-001')).toBeInTheDocument();
      expect(screen.getByText('Construção Sede')).toBeInTheDocument();
      expect(screen.getByText('Cliente: Empresa ABC')).toBeInTheDocument();
      expect(screen.getByText('Gerente: João Silva')).toBeInTheDocument();
    });

    it('should show correct status badge', () => {
      render(<ContractCard contract={mockContract} />);

      const badge = screen.getByText('ACTIVE');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<ContractCard contract={mockContract} onClick={handleClick} />);

      fireEvent.click(screen.getByText('OBRA-001'));

      expect(handleClick).toHaveBeenCalled();
    });
  });
  ```

- [ ] **TE-007**: Testes para RequestWorkflow

  ```typescript
  // tests/unit/components/RequestWorkflow.test.tsx

  import { render, screen } from '@testing-library/react';
  import { RequestWorkflow } from '@/components/enterprise/RequestWorkflow';

  describe('RequestWorkflow', () => {
    it('should highlight current step', () => {
      render(<RequestWorkflow currentStatus="APPROVED" />);

      // Steps anteriores devem estar completos
      expect(screen.getByTestId('step-DRAFT')).toHaveClass('completed');
      expect(screen.getByTestId('step-PENDING')).toHaveClass('completed');

      // Step atual deve estar ativo
      expect(screen.getByTestId('step-APPROVED')).toHaveClass('active');

      // Steps futuros devem estar pendentes
      expect(screen.getByTestId('step-SEPARATING')).toHaveClass('pending');
      expect(screen.getByTestId('step-DELIVERED')).toHaveClass('pending');
    });

    it('should show rejection status correctly', () => {
      render(<RequestWorkflow currentStatus="REJECTED" />);

      expect(screen.getByTestId('step-PENDING')).toHaveClass('completed');
      expect(screen.getByTestId('step-REJECTED')).toHaveClass('error');
    });
  });
  ```

### Fase 3: Testes de Integração (3 tasks)

- [ ] **TE-008**: Testes de integração Commands

  ```rust
  // tests/integration/commands_test.rs

  #[tokio::test]
  async fn test_full_request_flow_command() {
      let app = setup_test_app().await;

      // Criar contrato via command
      let contract: Contract = app.invoke("create_contract", json!({
          "input": {
              "code": "TEST-001",
              "name": "Teste Integração",
              "managerId": "admin"
          }
      })).await.unwrap();

      // Criar local
      let location: StockLocation = app.invoke("create_location", json!({
          "input": {
              "name": "Almoxarifado Central",
              "type": "CENTRAL"
          }
      })).await.unwrap();

      // Criar produto
      let product: Product = app.invoke("create_product", json!({
          "input": {
              "name": "Cimento",
              "unit": "SACK"
          }
      })).await.unwrap();

      // Dar entrada no estoque
      app.invoke("adjust_stock_balance", json!({
          "locationId": location.id,
          "productId": product.id,
          "quantity": 100.0,
          "reason": "Entrada inicial"
      })).await.unwrap();

      // Criar requisição
      let request: MaterialRequest = app.invoke("create_request", json!({
          "input": {
              "contractId": contract.id,
              "destinationLocationId": location.id,
              "items": [{ "productId": product.id, "quantity": 10.0 }]
          }
      })).await.unwrap();

      assert_eq!(request.status, "DRAFT");

      // Submeter
      let request: MaterialRequest = app.invoke("submit_request", json!({
          "id": request.id
      })).await.unwrap();

      assert_eq!(request.status, "PENDING");
  }
  ```

- [ ] **TE-009**: Testes de integração Frontend-Backend

  ```typescript
  // tests/integration/contracts.test.ts

  import { invoke } from '@tauri-apps/api/tauri';

  describe('Contracts Integration', () => {
    beforeEach(async () => {
      await invoke('reset_test_database');
    });

    it('should create and list contracts', async () => {
      // Criar
      const created = await invoke('create_contract', {
        input: {
          code: 'INT-001',
          name: 'Integration Test',
          managerId: 'admin',
        },
      });

      expect(created.id).toBeDefined();

      // Listar
      const list = await invoke('list_contracts', {});

      expect(list).toHaveLength(1);
      expect(list[0].code).toBe('INT-001');
    });

    it('should filter contracts by status', async () => {
      await invoke('create_contract', { input: { code: 'A1', status: 'ACTIVE' } });
      await invoke('create_contract', { input: { code: 'A2', status: 'PLANNING' } });

      const active = await invoke('list_contracts', {
        filters: { status: 'ACTIVE' },
      });

      expect(active).toHaveLength(1);
      expect(active[0].code).toBe('A1');
    });
  });
  ```

- [ ] **TE-010**: Testes de permissão

  ```typescript
  // tests/integration/permissions.test.ts

  describe('Permissions Integration', () => {
    it('should allow CONTRACT_MANAGER to approve requests', async () => {
      await loginAs('contract_manager');

      const request = await createTestRequest();
      const result = await invoke('approve_request', { id: request.id });

      expect(result.status).toBe('APPROVED');
    });

    it('should deny REQUESTER from approving requests', async () => {
      await loginAs('requester');

      const request = await createTestRequest();

      await expect(invoke('approve_request', { id: request.id })).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should only show accessible contracts', async () => {
      await loginAs('supervisor_contract_a');

      const contracts = await invoke('list_accessible_contracts', {});

      expect(contracts.every((c) => c.id === 'contract_a')).toBe(true);
    });
  });
  ```

### Fase 4: Testes E2E (2 tasks)

- [ ] **TE-011**: E2E Fluxo de Requisição

  ```typescript
  // e2e/enterprise/request-flow.spec.ts

  import { test, expect } from '@playwright/test';

  test.describe('Request Flow E2E', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.fill('[data-testid="pin-input"]', '1234');
      await page.click('[data-testid="login-button"]');
    });

    test('complete request workflow', async ({ page }) => {
      // Navegar para requisições
      await page.click('[data-testid="nav-requests"]');
      await page.click('[data-testid="new-request"]');

      // Preencher requisição
      await page.selectOption('[data-testid="contract-select"]', 'OBRA-001');
      await page.selectOption('[data-testid="location-select"]', 'Almoxarifado Central');

      // Adicionar item
      await page.fill('[data-testid="product-search"]', 'Cimento');
      await page.click('[data-testid="product-option-0"]');
      await page.fill('[data-testid="quantity-input"]', '10');
      await page.click('[data-testid="add-item"]');

      // Verificar item adicionado
      await expect(page.locator('[data-testid="item-row-0"]')).toContainText('Cimento');
      await expect(page.locator('[data-testid="item-row-0"]')).toContainText('10');

      // Submeter
      await page.click('[data-testid="submit-request"]');

      // Verificar status
      await expect(page.locator('[data-testid="request-status"]')).toContainText('Pendente');

      // Aprovar (como gerente)
      await page.click('[data-testid="approve-button"]');
      await page.click('[data-testid="confirm-approve"]');

      await expect(page.locator('[data-testid="request-status"]')).toContainText('Aprovada');
    });
  });
  ```

- [ ] **TE-012**: E2E Inventário

  ```typescript
  // e2e/enterprise/inventory.spec.ts

  import { test, expect } from '@playwright/test';

  test.describe('Inventory E2E', () => {
    test('complete inventory count', async ({ page }) => {
      await page.goto('/inventory');

      // Selecionar local
      await page.selectOption('[data-testid="location-select"]', 'Almoxarifado Central');

      // Iniciar inventário
      await page.click('[data-testid="start-inventory"]');

      // Contar primeiro item
      await page.fill('[data-testid="count-input-0"]', '95');
      await page.click('[data-testid="save-count-0"]');

      // Verificar diferença calculada
      await expect(page.locator('[data-testid="diff-0"]')).toContainText('-5');

      // Finalizar inventário
      await page.click('[data-testid="finish-inventory"]');
      await page.click('[data-testid="apply-adjustments"]');

      // Verificar conclusão
      await expect(page.locator('[data-testid="inventory-status"]')).toContainText('Concluído');
    });
  });
  ```

---

## 📊 Cobertura Alvo

| Área                | Mínimo        | Ideal |
| ------------------- | ------------- | ----- |
| Backend Services    | 80%           | 90%   |
| Frontend Hooks      | 70%           | 85%   |
| Frontend Components | 60%           | 75%   |
| E2E Flows           | 100% críticos | -     |

---

## 🧪 Validação

- [ ] Todos os testes passam localmente
- [ ] Coverage ≥ 80% no backend
- [ ] Coverage ≥ 70% no frontend
- [ ] E2E flui sem falhas
- [ ] CI pipeline verde

---

<!-- Roadmap criado em: 25 de Janeiro de 2026 -->
