# 🏍️ Módulo Motopeças - Documentação Técnica

> **Status**: ✅ Backend Completo | ✅ UI Completa (OS e Garantias)  
> **Última Atualização**: 9 de Janeiro de 2026

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Backend Rust](#backend-rust)
4. [Frontend React](#frontend-react)
5. [Fluxos de Trabalho](#fluxos-de-trabalho)
6. [API Reference](#api-reference)
7. [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral

O módulo de motopeças transforma o GIRO de um sistema exclusivo para mercearias em uma plataforma **multi-segmento**, adicionando funcionalidades específicas para oficinas de motocicletas.

### Features Implementadas

✅ **Sistema de Perfis de Negócio**

- Tipos: `GROCERY`, `MOTOPARTS`, `BOTH`
- Feature gates para renderização condicional
- Wizard de configuração inicial

✅ **Base de Veículos (FIPE)**

- 100+ marcas de motos
- 1000+ modelos
- 5000+ anos/versões
- Importação automática via API FIPE

✅ **Compatibilidade de Peças**

- Relacionamento N:M produto ↔ veículo
- Seleção em cascata (marca → modelo → ano)
- Quick view e editor completo

✅ **Gestão de Clientes**

- Cadastro com endereço e contatos
- Múltiplos veículos por cliente
- Controle de KM atual

✅ **Ordens de Serviço (OS)**

- Numeração sequencial automática
- Workflow completo (6 status)
- Itens (peças + serviços)
- Cálculo automático de totais
- Sistema de garantia

✅ **Gestão de Garantias**

- Workflow completo (Aprovada, Negada, Resolvida)
- Múltiplos tipos de resolução (Troca, Reembolso, Reparo)
- Histórico auditável
- Integração com Vendas e OS

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Components        │  Hooks              │  Stores          │
│  ─────────────────│────────────────────│─────────────────  │
│  VehicleSelector   │  useVehicles        │  BusinessProfile  │
│  CustomerSearch    │  useCustomers       │                   │
│  ServiceOrderList  │  useServiceOrders   │                   │
│  ServiceOrderDetails│  useServices       │                   │
└─────────────────────────────────────────────────────────────┘
                              ⬇ Tauri IPC
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Rust/Tauri)                      │
├─────────────────────────────────────────────────────────────┤
│  Commands         │  Services           │  Repositories     │
│  ────────────────│────────────────────│──────────────────  │
│  vehicles.rs      │  (future)           │  vehicle_repo.rs  │
│  customers.rs     │                     │  customer_repo.rs │
│  service_orders.rs│                     │  service_order_   │
│  (54 commands)    │                     │  repo.rs          │
└─────────────────────────────────────────────────────────────┘
                              ⬇ SQLx
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE (SQLite)                        │
├─────────────────────────────────────────────────────────────┤
│  vehicle_brands       customers           service_orders    │
│  vehicle_models       customer_vehicles   service_order_items│
│  vehicle_years        services            warranty_claims   │
│  product_compatibilities                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🦀 Backend Rust

### 📁 Estrutura de Arquivos

```
src-tauri/src/
├── models/
│   ├── vehicle.rs           (VehicleBrand, Model, Year, ProductCompatibility)
│   ├── customer.rs          (Customer, CustomerVehicle)
│   └── service_order.rs     (ServiceOrder, ServiceOrderItem, Service)
├── repositories/
│   ├── vehicle_repository.rs        (340 linhas)
│   ├── customer_repository.rs       (380 linhas)
│   └── service_order_repository.rs  (580 linhas)
└── commands/
    ├── vehicles.rs          (17 commands)
    ├── customers.rs         (14 commands)
    └── service_orders.rs    (22 commands)
```

### 🔑 Models Principais

#### Vehicle

```rust
pub struct VehicleBrand {
    pub id: String,
    pub fipe_code: Option<String>,
    pub name: String,
    pub logo_url: Option<String>,
    pub is_active: bool,
}

pub struct VehicleModel {
    pub id: String,
    pub brand_id: String,
    pub fipe_code: Option<String>,
    pub name: String,
    pub category: VehicleCategory,  // STREET, SPORT, TRAIL, SCOOTER, CUSTOM
    pub engine_size: Option<i32>,
}

pub struct VehicleYear {
    pub id: String,
    pub model_id: String,
    pub fipe_code: Option<String>,
    pub year: i32,
    pub year_label: String,  // ex: "2023/2024"
    pub fuel_type: FuelType, // GASOLINE, ETHANOL, FLEX, ELECTRIC
}

pub struct ProductCompatibility {
    pub id: String,
    pub product_id: String,
    pub vehicle_year_id: String,
}
```

#### Customer

```rust
pub struct Customer {
    pub id: String,
    pub name: String,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Address,  // zip, street, number, city, state
    pub is_active: bool,
}

pub struct CustomerVehicle {
    pub id: String,
    pub customer_id: String,
    pub vehicle_year_id: String,
    pub plate: Option<String>,
    pub chassis: Option<String>,
    pub color: Option<String>,
    pub current_km: Option<i32>,
    pub nickname: Option<String>,
    pub is_active: bool,
}
```

#### ServiceOrder

```rust
pub enum ServiceOrderStatus {
    Open,         // Recém criada
    InProgress,   // Mecânico trabalhando
    WaitingParts, // Aguardando peças
    Completed,    // Serviço finalizado
    Delivered,    // Entregue ao cliente
    Canceled,     // Cancelada
}

pub struct ServiceOrder {
    pub id: String,
    pub order_number: i32,           // Auto-incremento
    pub customer_id: String,
    pub customer_vehicle_id: String,
    pub vehicle_year_id: String,
    pub employee_id: String,
    pub vehicle_km: Option<i32>,
    pub symptoms: Option<String>,    // Relatado pelo cliente
    pub diagnosis: Option<String>,   // Diagnóstico do mecânico
    pub status: ServiceOrderStatus,

    // Valores
    pub labor_cost: f64,   // Mão de obra (calculado)
    pub parts_cost: f64,   // Peças (calculado)
    pub discount: f64,
    pub total: f64,        // labor + parts - discount

    // Garantia
    pub warranty_days: i32,
    pub warranty_until: Option<String>,

    // Timestamps
    pub scheduled_date: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,

    // Pagamento
    pub payment_method: Option<String>,
    pub is_paid: bool,
}

pub struct ServiceOrderItem {
    pub id: String,
    pub order_id: String,
    pub product_id: Option<String>,
    pub item_type: ServiceItemType,  // PART ou SERVICE
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount: f64,
    pub total: f64,  // (quantity * unit_price) - discount
    pub warranty_days: Option<i32>,
}

pub struct Service {
    pub id: String,
    pub code: String,              // ex: "TRO-001"
    pub name: String,              // ex: "Troca de Óleo"
    pub default_price: f64,
    pub estimated_time: Option<i32>,  // minutos
    pub default_warranty_days: i32,
    pub is_active: bool,
}
```

### 📡 Tauri Commands

#### Vehicles (17 commands)

```rust
get_vehicle_brands()
get_vehicle_brand_by_id(id)
create_vehicle_brand(name, fipe_code?, logo_url?)

get_vehicle_models(brand_id)
get_vehicle_model_by_id(id)
create_vehicle_model(brand_id, name, category?, engine_size?, fipe_code?)

get_vehicle_years(model_id)
get_vehicle_year_by_id(id)
create_vehicle_year(model_id, year, year_label, fuel_type?, fipe_code?)

search_vehicles(query)
get_complete_vehicle(year_id)

get_product_compatibilities(product_id)
add_product_compatibility(product_id, vehicle_year_id)
remove_product_compatibility(compatibility_id)
save_product_compatibilities(product_id, vehicle_year_ids[])
get_products_by_vehicle(vehicle_year_id)
```

#### Customers (14 commands)

```rust
get_customers()
get_customers_paginated(page?, per_page?, name?, cpf?, phone?)
get_customer_by_id(id)
get_customer_by_cpf(cpf)
search_customers(query)

create_customer(Customer)
update_customer(id, Customer)
deactivate_customer(id)
reactivate_customer(id)

get_customer_vehicles(customer_id)
get_customer_vehicle_by_id(id)
create_customer_vehicle(CustomerVehicle)
update_customer_vehicle(id, CustomerVehicle)
update_vehicle_km(vehicle_id, km)
```

#### Service Orders (22 commands)

```rust
// Ordens
get_open_service_orders()
get_service_orders_paginated(page?, per_page?, filters?)
get_service_order_by_id(id)
get_service_order_by_number(order_number)
get_service_order_details(id)  // Com itens e info completa

create_service_order(CreateServiceOrderInput)
update_service_order(id, UpdateServiceOrderInput)

// Workflow
start_service_order(id)      // OPEN → IN_PROGRESS
complete_service_order(id)   // IN_PROGRESS → COMPLETED
deliver_service_order(id, payment_method)  // COMPLETED → DELIVERED
cancel_service_order(id)     // * → CANCELED

// Itens
get_service_order_items(order_id)
add_service_order_item(order_id, item_type, description, quantity, unit_price, ...)
remove_service_order_item(item_id)

// Serviços Pré-Cadastrados
get_services()
get_service_by_id(id)
get_service_by_code(code)
create_service(code, name, default_price, ...)
update_service(id, ...)
```

---

## ⚛️ Frontend React

### 📁 Estrutura de Componentes

```
src/
├── components/motoparts/
│   ├── VehicleSelector.tsx          (400 linhas)
│   ├── ProductCompatibilityEditor.tsx (350 linhas)
│   ├── CustomerSearch.tsx           (350 linhas)
│   ├── ServiceOrderList.tsx         (320 linhas)
│   └── ServiceOrderDetails.tsx      (480 linhas)
├── hooks/
│   ├── useVehicles.ts              (340 linhas)
│   ├── useCustomers.ts             (310 linhas)
│   └── useServiceOrders.ts         (500 linhas)
└── stores/
    └── useBusinessProfile.ts        (150 linhas)
```

### 🪝 Hooks Principais

#### useVehicles

```typescript
const {
  brands,
  models,
  years,
  selectedBrand,
  selectedModel,
  selectedYear,
  selectBrand,
  selectModel,
  selectYear,
  searchVehicles,
  getCompleteVehicle,
  reset,
} = useVehicles();
```

#### useProductCompatibility

```typescript
const {
  compatibilities,
  isLoading,
  addCompatibility,
  removeCompatibility,
  saveCompatibilities,
  refetch,
} = useProductCompatibility(productId);
```

#### useServiceOrders

```typescript
const {
  openOrders, // Ordens abertas (dashboard)
  getOrdersPaginated, // Com filtros
  getOrderById,
  getOrderDetails, // Com itens
  createOrder,
  updateOrder,
  startOrder,
  completeOrder,
  deliverOrder,
  cancelOrder,
  filters,
  setFilters,
} = useServiceOrders();
```

#### useServiceOrderItems

```typescript
const { items, isLoading, addItem, removeItem, refetch } = useServiceOrderItems(orderId);
```

#### useServices

```typescript
const {
  services, // Serviços pré-cadastrados
  getServiceById,
  getServiceByCode,
  createService,
  updateService,
} = useServices();
```

### 🎨 Componentes UI

#### VehicleSelector

Seleção em cascata com 3 níveis:

```tsx
<VehicleSelector
  value={selectedVehicle}
  onChange={(vehicleYearId) => setSelectedVehicle(vehicleYearId)}
  placeholder="Selecione o veículo"
/>
```

**Features:**

- Auto-loading de modelos ao selecionar marca
- Auto-loading de anos ao selecionar modelo
- Reset em cascata
- Loading states

#### VehicleSearch

Busca por texto com autocomplete:

```tsx
<VehicleSearch
  onSelect={(vehicle) => console.log(vehicle)}
  placeholder="Buscar por marca ou modelo..."
/>
```

#### ProductCompatibilityEditor

Editor completo de compatibilidades:

```tsx
<ProductCompatibilityEditor productId={product.id} onSave={() => toast.success('Salvo!')} />
```

**Features:**

- Lista de compatibilidades atuais
- Adicionar novos veículos
- Remover compatibilidades
- Salvar em lote
- Badges visuais

#### CustomerSearch

Campo de busca com criação rápida:

```tsx
<CustomerSearch onSelect={(customer) => setSelectedCustomer(customer)} allowCreate />
```

#### ServiceOrderList

Lista com filtros e cards:

```tsx
<ServiceOrderList
  onSelectOrder={(id) => navigate(`/os/${id}`)}
  onCreateNew={() => navigate('/os/new')}
/>
```

**Features:**

- Busca por número, cliente, veículo, placa
- Filtro por status
- Cards clicáveis com animação
- Badges de status e pagamento

#### ServiceOrderDetails

Visualização completa de uma OS:

```tsx
<ServiceOrderDetails
  orderId={id}
  onEdit={() => setEditMode(true)}
  onClose={() => navigate('/os')}
/>
```

**Features:**

- Info cliente e veículo
- Sintomas e diagnóstico
- Lista de itens com ações
- Totais calculados
- Workflow buttons (Iniciar, Concluir, Entregar, Cancelar)
- Observações e notas internas

---

## 🔄 Fluxos de Trabalho

### Fluxo: Criação de Ordem de Serviço

```
1. Cliente chega na oficina
   ↓
2. Buscar/criar cliente (CustomerSearch)
   ↓
3. Selecionar veículo do cliente ou cadastrar novo
   ↓
4. Criar OS com sintomas e KM atual
   ↓
5. OS criada com status OPEN e número sequencial
```

### Fluxo: Atendimento da Ordem

```
OPEN (Aguardando início)
  ↓ [start_service_order]
IN_PROGRESS (Mecânico trabalhando)
  ↓ [add_service_order_item] (adicionar peças/serviços)
  ↓ (se falta peça)
WAITING_PARTS (Aguardando peças)
  ↓ (peça chegou, voltar para IN_PROGRESS)
  ↓ [complete_service_order]
COMPLETED (Serviço finalizado, aguardando cliente)
  ↓ [deliver_service_order + payment_method]
DELIVERED (Entregue e pago)
```

### Fluxo: Cálculo de Totais

```
Quando adiciona item:
1. total_item = (quantity × unit_price) - discount
2. Salvar item
3. Recalcular totais da OS:
   - labor_cost = SUM(items WHERE type = SERVICE)
   - parts_cost = SUM(items WHERE type = PART)
   - total = labor_cost + parts_cost - order.discount
4. Atualizar OS
```

### Fluxo: Sistema de Garantia

```
Ao completar OS:
1. completed_at = agora
2. warranty_until = agora + warranty_days
3. Cliente pode acionar garantia até warranty_until
```

---

## 📚 API Reference

### Database Schema

```sql
-- Marcas
vehicle_brands (id, fipe_code, name, logo_url, is_active)

-- Modelos
vehicle_models (id, brand_id, fipe_code, name, category, engine_size)

-- Anos
vehicle_years (id, model_id, fipe_code, year, year_label, fuel_type)

-- Compatibilidade N:M
product_compatibilities (id, product_id, vehicle_year_id)
  UNIQUE(product_id, vehicle_year_id)

-- Clientes
customers (id, name, cpf, phone, email, address...)

-- Veículos do Cliente
customer_vehicles (id, customer_id, vehicle_year_id, plate, color, current_km...)

-- Serviços Pré-Cadastrados
services (id, code, name, default_price, estimated_time, default_warranty_days)

-- Ordens de Serviço
service_orders (id, order_number, customer_id, vehicle_year_id, status, total...)

-- Itens da OS
service_order_items (id, order_id, product_id?, item_type, quantity, unit_price, total...)

-- Sequência de OS
_service_order_sequence (id=1, last_number)
```

---

## 🚀 Próximos Passos

### Phase 5: Garantias (Completed)

- [x] `warranty_claim.rs` model
- [x] `warranty_repository.rs`
- [x] `warranty.rs` commands
- [x] `useWarranties` hook
- [x] `WarrantyList`, `WarrantyDetails`, `WarrantyForm` UI

### Phase 6: Relatórios (Completed)

- [x] Dashboard motopeças (Vendas, OS, Garantias, Estoque)
- [x] Estatísticas de OS (Status e Receita Mão de Obra vs Peças)
- [x] Top produtos vendidos
- [x] Charts com Recharts (Receita Semanal, Status Pizza)

### Phase 7: Polimento (Pending)

- [ ] Testes unitários (Vitest)
- [ ] Testes E2E (Playwright)
- [ ] Performance optimization
- [ ] Documentação completa
- [ ] Tutorial wizard

### Melhorias Futuras

- [ ] `ServiceOrderForm.tsx` - Criação/edição de OS
- [ ] Impressão de OS em impressora térmica
- [ ] Notificações push quando OS estiver pronta
- [ ] Histórico de serviços por veículo
- [ ] Agendamento de revisões
- [ ] Integração com fornecedores de peças
- [ ] Catálogo online de peças

---

## 📊 Estatísticas do Projeto

**Backend Rust:**

- 3 models (vehicle, customer, service_order)
- 3 repositories (~1300 linhas)
- 3 command files (53 commands total)
- 11 tabelas no banco

**Frontend React:**

- 5 componentes principais (~1900 linhas)
- 3 hooks principais (~1150 linhas)
- 1 store (BusinessProfile)

**Total:**

- ~3500 linhas de Rust
- ~3050 linhas de TypeScript
- **~6550 linhas de código**

---

**Desenvolvido com ❤️ para oficinas de motocicletas**
