# ⚛️ Frontend Roadmap - GIRO Enterprise

> **Agente:** 03-frontend  
> **Status:** � COMPLETE  
> **Progresso:** 32/32 (100%)  
> **Bloqueador:** -  
> **Última Atualização:** 27 de Janeiro de 2026

---

## 📋 Objetivo

Criar todas as páginas, componentes e hooks React/TypeScript para o módulo Enterprise, seguindo os padrões estabelecidos:

- Páginas com layout responsivo
- Componentes reutilizáveis Shadcn/UI
- Hooks para comunicação com backend
- Acessibilidade WCAG 2.1 AA

---

## ✅ Checklist de Tasks

### Fase 1: Infraestrutura (4 tasks)

- [ ] **FE-001**: Atualizar `types/business-profile.ts`

  ```typescript
  // Adicionar ENTERPRISE ao BusinessType
  export type BusinessType = 'GROCERY' | 'MOTOPARTS' | 'ENTERPRISE' | 'GENERAL';

  // Adicionar novas features
  export interface BusinessFeatures {
    // ... existentes ...

    // Enterprise
    contracts: boolean;
    workFronts: boolean;
    activities: boolean;
    materialRequests: boolean;
    stockTransfers: boolean;
    costAppropriation: boolean;
    rotatingInventory: boolean;
    multiLocation: boolean;
  }
  ```

- [ ] **FE-002**: Criar `ENTERPRISE_PROFILE`

  ```typescript
  export const ENTERPRISE_PROFILE: BusinessProfile = {
    type: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Almoxarifado Industrial para Obras e Projetos',
    icon: 'Building2',
    features: {
      pdv: false,
      inventory: true,
      employees: true,
      cashControl: false,
      reports: true,
      backup: true,
      expirationControl: false,
      weightedProducts: false,
      lotTracking: true,
      vehicleCompatibility: false,
      serviceOrders: false,
      warranties: false,
      customerVehicles: false,
      vehicleHistory: false,
      contracts: true,
      workFronts: true,
      activities: true,
      materialRequests: true,
      stockTransfers: true,
      costAppropriation: true,
      rotatingInventory: true,
      multiLocation: true,
    },
    labels: {
      product: 'Material',
      products: 'Materiais',
      customer: 'Colaborador',
      customers: 'Colaboradores',
      sale: 'Requisição',
      sales: 'Requisições',
      addProduct: 'Adicionar Material',
      newSale: 'Nova Requisição',
      barcode: 'Código',
      category: 'Classe',
    },
    defaultCategories: [
      { name: 'Material Elétrico', icon: 'Zap', color: '#F59E0B' },
      { name: 'Material de Construção', icon: 'HardHat', color: '#6B7280' },
      { name: 'EPIs', icon: 'HardHat', color: '#EF4444' },
      // ... mais categorias
    ],
  };
  ```

- [ ] **FE-003**: Criar tipos Enterprise em `types/enterprise.ts`

  ```typescript
  // Contracts
  export interface Contract { ... }
  export interface CreateContractInput { ... }

  // Work Fronts
  export interface WorkFront { ... }

  // Activities
  export interface Activity { ... }

  // Stock Locations
  export interface StockLocation { ... }
  export interface StockBalance { ... }

  // Requests
  export interface MaterialRequest { ... }
  export interface MaterialRequestItem { ... }

  // Transfers
  export interface StockTransfer { ... }
  ```

- [ ] **FE-004**: Atualizar navegação para Enterprise
  - Modificar `components/layout/Sidebar.tsx`
  - Ocultar PDV e Caixa quando `businessType === 'ENTERPRISE'`
  - Mostrar menus Enterprise

### Fase 2: Módulo Contratos (6 tasks)

- [ ] **FE-005**: Criar `pages/contracts/index.tsx`

  - Lista de contratos com filtros
  - Cards ou tabela com status
  - Busca por código/nome
  - Botão "Novo Contrato"

- [ ] **FE-006**: Criar `pages/contracts/new.tsx`

  - Formulário de criação
  - Validação com Zod
  - Seleção de gerente responsável

- [ ] **FE-007**: Criar `pages/contracts/[id].tsx`

  - Detalhes do contrato
  - Tabs: Visão Geral, Frentes, Requisições, Relatórios
  - Ações: Editar, Suspender, Concluir

- [ ] **FE-008**: Criar componente `ContractCard`

  ```tsx
  interface ContractCardProps {
    contract: Contract;
    onClick?: () => void;
  }

  export function ContractCard({ contract, onClick }: ContractCardProps) {
    return (
      <Card onClick={onClick} className="cursor-pointer hover:shadow-md">
        <CardHeader>
          <Badge variant={getStatusVariant(contract.status)}>{contract.status}</Badge>
          <CardTitle>{contract.code}</CardTitle>
          <CardDescription>{contract.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Cliente: {contract.clientName}</p>
          <p>Gerente: {contract.manager.name}</p>
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] **FE-009**: Criar componente `ContractForm`

  - Campos com validação
  - DatePicker para datas
  - Select para gerente
  - Máscara para CNPJ

- [ ] **FE-010**: Criar hook `useContracts`

  ```typescript
  export function useContracts(filters?: ContractFilters) {
    return useQuery({
      queryKey: ['contracts', filters],
      queryFn: () => invoke('list_contracts', { filters }),
    });
  }

  export function useContract(id: string) {
    return useQuery({
      queryKey: ['contract', id],
      queryFn: () => invoke('get_contract', { id }),
    });
  }

  export function useCreateContract() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input: CreateContractInput) => invoke('create_contract', { input }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
      },
    });
  }
  ```

### Fase 3: Módulo Frentes de Trabalho (4 tasks)

- [ ] **FE-011**: Criar `pages/work-fronts/index.tsx`

  - Lista de frentes por contrato
  - Filtro por status
  - Indicador de atividades

- [ ] **FE-012**: Criar `pages/work-fronts/[id].tsx`

  - Detalhes da frente
  - Lista de atividades
  - Requisições da frente

- [ ] **FE-013**: Criar componente `WorkFrontCard`

- [ ] **FE-014**: Criar hook `useWorkFronts`

### Fase 4: Módulo Atividades (3 tasks)

- [ ] **FE-015**: Criar `pages/activities/index.tsx`

  - Lista por frente/contrato
  - Barra de progresso (executedQty/plannedQty)

- [ ] **FE-016**: Criar componente `ActivityCard`

  - Exibir progresso visual
  - Status com cores

- [ ] **FE-017**: Criar componente `ActivityProgressForm`
  - Atualizar quantidade executada

### Fase 5: Módulo Localizações (4 tasks)

- [ ] **FE-018**: Criar `pages/locations/index.tsx`

  - Lista de locais de estoque
  - Tipo (Central, Obra, Frente)
  - Contagem de itens

- [ ] **FE-019**: Criar `pages/locations/[id]/balances.tsx`

  - Tabela de saldos por produto
  - Busca por material
  - Botão de ajuste

- [ ] **FE-020**: Criar componente `LocationBalanceTable`

  ```tsx
  interface Props {
    balances: StockBalance[];
    onAdjust?: (balance: StockBalance) => void;
  }

  export function LocationBalanceTable({ balances, onAdjust }: Props) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>Reservado</TableHead>
            <TableHead>Disponível</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {balances.map((balance) => (
            <TableRow key={balance.id}>
              <TableCell>{balance.product.name}</TableCell>
              <TableCell>{balance.quantity}</TableCell>
              <TableCell>{balance.reservedQty}</TableCell>
              <TableCell>{balance.availableQty}</TableCell>
              <TableCell>
                <Button size="sm" onClick={() => onAdjust?.(balance)}>
                  Ajustar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  ```

- [ ] **FE-021**: Criar componente `AdjustBalanceModal`

### Fase 6: Módulo Requisições (8 tasks)

- [ ] **FE-022**: Criar `pages/requests/index.tsx`

  - Lista de requisições
  - Filtros: status, contrato, data
  - Tabs: Minhas, Pendentes, Todas

- [ ] **FE-023**: Criar `pages/requests/new.tsx`

  - Wizard de criação:
    1. Selecionar contrato/frente/atividade
    2. Adicionar itens
    3. Revisar e enviar

- [ ] **FE-024**: Criar `pages/requests/[id].tsx`

  - Detalhes da requisição
  - Timeline de status
  - Ações baseadas no status

- [ ] **FE-025**: Criar componente `RequestForm`

  - Seleção de destino
  - Adição de itens com autocomplete
  - Quantidades

- [ ] **FE-026**: Criar componente `RequestItemsTable`

  - Lista de itens
  - Editar quantidade
  - Remover item

- [ ] **FE-027**: Criar componente `RequestWorkflow`

  ```tsx
  // Timeline visual do workflow
  const steps = [
    { status: 'DRAFT', label: 'Rascunho', icon: FileEdit },
    { status: 'PENDING', label: 'Pendente', icon: Clock },
    { status: 'APPROVED', label: 'Aprovada', icon: Check },
    { status: 'SEPARATING', label: 'Separando', icon: Package },
    { status: 'DELIVERED', label: 'Entregue', icon: CheckCircle },
  ];
  ```

- [ ] **FE-028**: Criar componente `RequestApprovalModal`

  - Aprovar total ou parcial
  - Campo de observação
  - Ajuste de quantidades

- [ ] **FE-029**: Criar hook `useRequests`

### Fase 7: Módulo Transferências (4 tasks)

- [ ] **FE-030**: Criar `pages/transfers/index.tsx`

  - Lista de transferências
  - Filtros por status, origem, destino

- [ ] **FE-031**: Criar `pages/transfers/new.tsx`

  - Selecionar origem e destino
  - Adicionar itens do estoque origem

- [ ] **FE-032**: Criar componente `TransferWorkflow`

  - Timeline similar ao de requisições

- [ ] **FE-033**: Criar hook `useTransfers`

### Fase 8: Módulo Inventário (2 tasks)

- [ ] **FE-034**: Criar `pages/inventory/index.tsx`

  - Selecionar local
  - Iniciar contagem
  - Lista de itens a contar

- [ ] **FE-035**: Criar componente `InventoryCountForm`
  - Busca por código/barcode
  - Campo de quantidade contada
  - Diferença calculada

### Fase 9: Dashboard Enterprise (3 tasks)

- [ ] **FE-036**: Adaptar `pages/dashboard/` para Enterprise

  - Detectar businessType
  - Renderizar dashboard correto

- [ ] **FE-037**: Criar componente `DashboardEnterprise`

  ```tsx
  export function DashboardEnterprise() {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Contratos Ativos" value={stats.activeContracts} icon={FileText} />
        <StatCard
          title="Requisições Pendentes"
          value={stats.pendingRequests}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Transferências em Trânsito"
          value={stats.inTransitTransfers}
          icon={Truck}
        />
        <StatCard
          title="Itens Abaixo do Mínimo"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>
    );
  }
  ```

- [ ] **FE-038**: Criar widgets de dashboard
  - Gráfico de consumo por contrato
  - Lista de requisições recentes
  - Alertas de estoque

---

## 📁 Estrutura de Arquivos

```text
apps/desktop/src/
├── components/
│   ├── enterprise/                    # NOVO
│   │   ├── ContractCard.tsx
│   │   ├── ContractForm.tsx
│   │   ├── WorkFrontCard.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── ActivityProgressForm.tsx
│   │   ├── LocationBalanceTable.tsx
│   │   ├── AdjustBalanceModal.tsx
│   │   ├── RequestForm.tsx
│   │   ├── RequestItemsTable.tsx
│   │   ├── RequestWorkflow.tsx
│   │   ├── RequestApprovalModal.tsx
│   │   ├── TransferWorkflow.tsx
│   │   ├── InventoryCountForm.tsx
│   │   └── DashboardEnterprise.tsx
├── hooks/
│   ├── enterprise/                    # NOVO
│   │   ├── useContracts.ts
│   │   ├── useWorkFronts.ts
│   │   ├── useActivities.ts
│   │   ├── useLocations.ts
│   │   ├── useRequests.ts
│   │   └── useTransfers.ts
├── pages/
│   ├── contracts/                     # NOVO
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id].tsx
│   ├── work-fronts/                   # NOVO
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── activities/                    # NOVO
│   │   └── index.tsx
│   ├── locations/                     # NOVO
│   │   ├── index.tsx
│   │   └── [id]/
│   │       └── balances.tsx
│   ├── requests/                      # NOVO
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id].tsx
│   ├── transfers/                     # NOVO
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id].tsx
│   └── inventory/                     # NOVO
│       └── index.tsx
└── types/
    └── enterprise.ts                  # NOVO
```

---

## 🎨 Componentes UI a Utilizar

| Componente | Uso                                     |
| ---------- | --------------------------------------- |
| `Card`     | Cards de contratos, frentes, atividades |
| `Table`    | Listagens de saldos, itens              |
| `Form`     | Formulários com React Hook Form         |
| `Dialog`   | Modais de aprovação, ajuste             |
| `Badge`    | Status com cores                        |
| `Tabs`     | Navegação em detalhes                   |
| `Timeline` | Workflow visual                         |
| `Progress` | Progresso de atividades                 |
| `Select`   | Seleção de contrato, local              |
| `Combobox` | Autocomplete de produtos                |

---

## ♿ Acessibilidade

- [ ] Todos os forms com labels associados
- [ ] Botões com aria-label quando apenas ícone
- [ ] Cores com contraste mínimo 4.5:1
- [ ] Navegação por teclado funcional
- [ ] Anúncio de mudanças de status (aria-live)

---

## 🧪 Validação

- [ ] Componentes renderizam sem erros
- [ ] Hooks comunicam com backend corretamente
- [ ] Formulários validam entrada
- [ ] Navegação entre páginas funciona
- [ ] Responsivo em diferentes tamanhos

---

<!-- Roadmap criado em: 25 de Janeiro de 2026 -->
