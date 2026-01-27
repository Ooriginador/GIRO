# 🎯 Sistema de Controle de Acesso por Perfil

> **Documentação do sistema robusto de ocultação de funcionalidades baseado em perfil de negócio e roles de funcionário**

---

## 📋 Visão Geral

O GIRO implementa um sistema multi-camadas de controle de acesso:

1. **Perfil de Negócio** - Define quais features estão disponíveis (GROCERY, MOTOPARTS, ENTERPRISE, GENERAL)
2. **Role do Funcionário** - Define quais ações o funcionário pode executar (ADMIN, MANAGER, CASHIER, etc.)
3. **Combinação** - Algumas funcionalidades requerem tanto a feature habilitada quanto a role apropriada

---

## 🏢 Perfis de Negócio

### Tipos Disponíveis

| Tipo         | Descrição               | Features Exclusivas                             |
| ------------ | ----------------------- | ----------------------------------------------- |
| `GROCERY`    | Mercearias, padarias    | Validade, produtos pesáveis, lotes              |
| `MOTOPARTS`  | Motopeças, oficinas     | O.S., garantias, compatibilidade veicular       |
| `ENTERPRISE` | Almoxarifado industrial | Contratos, frentes, requisições, transferências |
| `GENERAL`    | Varejo genérico         | Todas as features                               |

### Features por Perfil

```typescript
// Exemplo: features do perfil ENTERPRISE
{
  pdv: false,           // Sem PDV - usa requisições
  cashControl: false,   // Sem caixa
  enterprise: true,     // Módulo Enterprise ativo
  contracts: true,      // Gestão de contratos
  workFronts: true,     // Frentes de trabalho
  materialRequests: true, // Requisições
  stockTransfers: true, // Transferências
  multiLocation: true,  // Múltiplos locais
}
```

---

## 👥 Roles de Funcionário

| Role      | Descrição     | Acesso Típico                     |
| --------- | ------------- | --------------------------------- |
| `ADMIN`   | Administrador | Acesso total ao sistema           |
| `MANAGER` | Gerente       | Relatórios, descontos, aprovações |
| `CASHIER` | Caixa         | PDV, abertura/fechamento de caixa |
| `STOCKER` | Estoquista    | Entrada de mercadorias, ajustes   |
| `VIEWER`  | Visualizador  | Apenas consultas e relatórios     |

---

## 🔧 Componentes Disponíveis

### 1. FeatureGate

Renderiza conteúdo apenas se a feature estiver habilitada.

```tsx
import { FeatureGate } from '@/components/shared';

// Básico
<FeatureGate feature="enterprise">
  <EnterpriseModule />
</FeatureGate>

// Com fallback
<FeatureGate
  feature="serviceOrders"
  fallback={<p>Ordens de serviço não disponíveis</p>}
>
  <ServiceOrderList />
</FeatureGate>

// Invertido (mostra se NÃO tiver a feature)
<FeatureGate feature="enterprise" inverted>
  <PDVQuickAccess />
</FeatureGate>
```

### 2. MultiFeatureGate

Renderiza baseado em múltiplas features.

```tsx
import { MultiFeatureGate } from '@/components/shared';

// Todas as features (mode='all')
<MultiFeatureGate features={['enterprise', 'contracts']}>
  <ContractManagement />
</MultiFeatureGate>

// Qualquer feature (mode='any')
<MultiFeatureGate features={['serviceOrders', 'warranties']} mode="any">
  <MotopartsModule />
</MultiFeatureGate>
```

### 3. BusinessTypeGate

Renderiza apenas para tipos específicos de negócio.

```tsx
import { BusinessTypeGate } from '@/components/shared';

<BusinessTypeGate types={['MOTOPARTS', 'GENERAL']}>
  <VehicleCompatibilityWidget />
</BusinessTypeGate>;
```

### 4. FeatureRoute

Protege rotas, redirecionando se não tiver acesso.

```tsx
import { FeatureRoute } from '@/components/shared';

// No App.tsx
<Route
  path="enterprise/*"
  element={
    <FeatureRoute feature="enterprise" redirectTo="/dashboard">
      <Outlet />
    </FeatureRoute>
  }
/>

// Por tipo de negócio
<Route
  path="motoparts/*"
  element={
    <FeatureRoute
      allowedTypes={['MOTOPARTS', 'GENERAL']}
      redirectTo="/dashboard"
    >
      <MotopartsPage />
    </FeatureRoute>
  }
/>
```

---

## 🪝 Hooks Disponíveis

### useBusinessProfile

Acesso ao perfil de negócio atual.

```tsx
import { useBusinessProfile } from '@/stores/useBusinessProfile';

const {
  businessType, // 'GROCERY' | 'MOTOPARTS' | etc.
  profile, // Objeto completo do perfil
  features, // Features habilitadas
  labels, // Labels customizados
  isFeatureEnabled, // Função verificadora
  getLabel, // Função para pegar label
} = useBusinessProfile();

// Verificar feature
if (isFeatureEnabled('enterprise')) {
  // Mostrar módulo enterprise
}

// Usar label customizado
<span>{getLabel('product')}</span>; // "Produto" | "Peça" | "Material"
```

### useFeatureCheck

Verificação imperativa de features.

```tsx
import { useFeatureCheck } from '@/components/shared';

const { canUse, canUseAll, canUseAny, isBusinessType } = useFeatureCheck();

// Verificar feature
const showEnterprise = canUse('enterprise');

// Verificar múltiplas
const showMotoparts = canUseAny(['serviceOrders', 'warranties']);

// Verificar tipo
const isMotoparts = isBusinessType('MOTOPARTS');

// Filtrar lista dinamicamente
const menuItems = [
  { label: 'PDV', path: '/pdv' },
  canUse('enterprise') && { label: 'Enterprise', path: '/enterprise' },
  canUse('serviceOrders') && { label: 'O.S.', path: '/service-orders' },
].filter(Boolean);
```

### useProfilePermissions

Hook completo com features + roles.

```tsx
import { useProfilePermissions } from '@/hooks/useProfilePermissions';

const {
  can, // Verificar permissão por chave
  canAll, // Todas as permissões
  canAny, // Qualquer permissão
  hasRole, // Verificar role
  hasFeature, // Verificar feature
  currentEmployee, // Info do funcionário
  currentProfile, // Info do perfil
} = useProfilePermissions();

// Verificar permissão específica
if (can('pdv:apply_discount')) {
  <DiscountButton />;
}

// Verificar role
if (hasRole('ADMIN')) {
  <AdminPanel />;
}

// Verificar combinação
if (can('enterprise:approve_requests')) {
  // Mostra botão de aprovar (requer feature + role)
}
```

---

## 📁 Configuração da Sidebar

A Sidebar usa configuração centralizada em `NAV_GROUPS`:

```tsx
// Em Sidebar.tsx
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'enterprise',
    label: 'Enterprise', // Label do grupo (opcional)
    visibility: { feature: 'enterprise' }, // Regra de visibilidade do grupo
    items: [
      {
        icon: HardHat,
        label: 'Dashboard',
        href: '/enterprise',
        visibility: { feature: 'enterprise' }, // Regra do item
      },
      {
        icon: Building2,
        label: 'Contratos',
        href: '/enterprise/contracts',
        visibility: {
          feature: 'contracts',
          // Ou múltiplas features:
          // features: ['contracts', 'enterprise'],
          // featureMode: 'all', // ou 'any'
          // Ou por tipo:
          // allowedTypes: ['ENTERPRISE'],
        },
      },
    ],
  },
];
```

---

## 🛡️ Permissões Pré-definidas

O arquivo `useProfilePermissions.ts` contém `SYSTEM_PERMISSIONS`:

```typescript
// PDV
'pdv:access'; // Acessar PDV
'pdv:apply_discount'; // Aplicar desconto (ADMIN, MANAGER)
'pdv:cancel_sale'; // Cancelar vendas (ADMIN, MANAGER)

// Caixa
'cash:access'; // Acessar caixa
'cash:open'; // Abrir caixa
'cash:close'; // Fechar caixa
'cash:withdrawal'; // Sangria (ADMIN, MANAGER)
'cash:reinforce'; // Reforço (ADMIN, MANAGER)

// Estoque
'stock:access'; // Acessar estoque
'stock:adjust'; // Ajustar (ADMIN, MANAGER, STOCKER)
'stock:transfer'; // Transferir (feature + role)

// Produtos
'products:access'; // Visualizar
'products:create'; // Cadastrar
'products:edit'; // Editar
'products:delete'; // Excluir (ADMIN)
'products:change_price'; // Alterar preços (ADMIN, MANAGER)

// Enterprise
'enterprise:access'; // Acessar módulo
'enterprise:contracts'; // Gerenciar contratos
'enterprise:requests'; // Fazer requisições
'enterprise:approve_requests'; // Aprovar (ADMIN, MANAGER)
'enterprise:transfers'; // Fazer transferências

// E mais...
```

---

## 📝 Exemplos de Uso

### Botão condicional no PDV

```tsx
function PDVDiscountButton() {
  const { can } = useProfilePermissions();

  if (!can('pdv:apply_discount')) {
    return null;
  }

  return <Button onClick={openDiscountModal}>Aplicar Desconto</Button>;
}
```

### Formulário com campos condicionais

```tsx
function ProductForm() {
  const { isFeatureEnabled } = useBusinessProfile();

  return (
    <form>
      <Input name="name" label="Nome" />
      <Input name="price" label="Preço" />

      {/* Campo de validade só para mercearias */}
      {isFeatureEnabled('expirationControl') && (
        <DatePicker name="expirationDate" label="Data de Validade" />
      )}

      {/* Campo de veículo só para motopeças */}
      {isFeatureEnabled('vehicleCompatibility') && (
        <VehicleSelector name="vehicles" label="Veículos Compatíveis" />
      )}
    </form>
  );
}
```

### Página com seções condicionais

```tsx
function DashboardPage() {
  const { currentProfile } = useProfilePermissions();

  return (
    <div>
      <h1>Dashboard</h1>

      {/* KPIs de vendas só se tiver PDV */}
      <FeatureGate feature="pdv">
        <SalesKPIs />
      </FeatureGate>

      {/* KPIs de requisições só para Enterprise */}
      <FeatureGate feature="enterprise">
        <RequestsKPIs />
      </FeatureGate>

      {/* Widget de garantias para Motopeças */}
      <FeatureGate feature="warranties">
        <ExpiringWarrantiesWidget />
      </FeatureGate>
    </div>
  );
}
```

---

## 🔄 Fluxo de Verificação

```
┌─────────────────────────────────────────────────────────────┐
│                     VERIFICAÇÃO DE ACESSO                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Rota Acessada                                           │
│     │                                                        │
│     ▼                                                        │
│  2. FeatureRoute verifica feature/tipo                      │
│     │                                                        │
│     ├─ Não tem acesso → Redireciona para /dashboard         │
│     │                                                        │
│     ▼                                                        │
│  3. Página carrega                                           │
│     │                                                        │
│     ▼                                                        │
│  4. FeatureGate/useProfilePermissions filtra conteúdo       │
│     │                                                        │
│     ├─ Componentes mostram/escondem baseado em permissão    │
│     │                                                        │
│     ▼                                                        │
│  5. Ações verificam role do funcionário                     │
│     │                                                        │
│     ├─ can('pdv:apply_discount') verifica feature + role    │
│     │                                                        │
│     ▼                                                        │
│  6. Execução permitida ou negada                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Arquivos Relacionados

| Arquivo                             | Descrição                             |
| ----------------------------------- | ------------------------------------- |
| `types/business-profile.ts`         | Tipos e perfis pré-definidos          |
| `stores/useBusinessProfile.ts`      | Store Zustand do perfil               |
| `components/shared/FeatureGate.tsx` | Componentes de gate e FeatureRoute    |
| `hooks/useProfilePermissions.ts`    | Hook de permissões completo           |
| `components/layout/Sidebar.tsx`     | Sidebar com configuração centralizada |
| `App.tsx`                           | Rotas protegidas por FeatureRoute     |

---

## ✅ Checklist de Implementação

Ao adicionar nova funcionalidade:

- [ ] Definir se precisa de feature específica
- [ ] Definir se precisa de role específica
- [ ] Adicionar entrada em `SYSTEM_PERMISSIONS` se for ação importante
- [ ] Usar `FeatureGate` para UI condicional
- [ ] Usar `FeatureRoute` se for rota nova
- [ ] Adicionar item na Sidebar com `visibility` apropriado
- [ ] Testar com diferentes perfis e roles

---

_Documentação atualizada em 27/01/2026_
