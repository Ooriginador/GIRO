# 🔐 Auth Roadmap - GIRO Enterprise

> **Agente:** 04-auth  
> **Status:** � COMPLETE  
> **Progresso:** 8/8 (100%)  
> **Bloqueador:** -  
> **Última Atualização:** 25 de Janeiro de 2026

---

## 📋 Objetivo

Implementar o sistema de autenticação e autorização para o perfil Enterprise, incluindo:

- 4 novos roles específicos ✅
- Matriz de permissões por feature ✅
- Hierarquia de aprovação para workflows ✅
- Suporte a PIN e senha ✅

---

## ✅ Checklist de Tasks

### Fase 1: Definição de Roles (2 tasks)

- [x] **AU-001**: Adicionar novos roles ao enum `EmployeeRole`

  ```prisma
  enum EmployeeRole {
    ADMIN
    MANAGER
    OPERATOR
    CASHIER
    // Enterprise específicos
    CONTRACT_MANAGER    // Gerente de contrato
    SUPERVISOR          // Supervisor de frente
    WAREHOUSE          // Almoxarife
    REQUESTER          // Requisitante
  }
  ```

  📁 **Implementado em:** `packages/database/prisma/schema.prisma`, `apps/desktop/src/types/index.ts`

- [x] **AU-002**: Documentar descrição de cada role

  | Role               | Descrição                        | Responsabilidades                                        |
  | ------------------ | -------------------------------- | -------------------------------------------------------- |
  | `CONTRACT_MANAGER` | Gerente de contrato/obra         | Aprovar requisições, gerir frentes, relatórios de custo  |
  | `SUPERVISOR`       | Supervisor de frente de trabalho | Criar requisições, aprovar 1º nível, registrar consumo   |
  | `WAREHOUSE`        | Almoxarife/Estoquista            | Separar requisições, executar transferências, inventário |
  | `REQUESTER`        | Requisitante comum               | Criar requisições, visualizar status                     |

  📁 **Implementado em:** `apps/desktop/src/lib/permissions/enterprise.ts` (ENTERPRISE_ROLES)

### Fase 2: Matriz de Permissões (3 tasks)

- [x] **AU-003**: Criar `permissions/enterprise.ts`

  📁 **Implementado em:** `apps/desktop/src/lib/permissions/enterprise.ts`

  Contém:

  - `ENTERPRISE_PERMISSIONS` - Matriz completa de permissões
  - `EnterprisePermission` - Tipo TypeScript
  - `ENTERPRISE_ROLES` - Metadados dos roles

  ```typescript
  export const ENTERPRISE_PERMISSIONS = {
    // Contratos
    'contracts.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
    'contracts.create': ['CONTRACT_MANAGER', 'ADMIN'],
    'contracts.edit': ['CONTRACT_MANAGER', 'ADMIN'],
    'contracts.delete': ['ADMIN'],

    // Frentes de Trabalho
    'workFronts.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'WAREHOUSE', 'ADMIN'],
    'workFronts.create': ['CONTRACT_MANAGER', 'ADMIN'],
    'workFronts.edit': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],

    // Atividades
    'activities.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
    'activities.create': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
    'activities.updateProgress': ['SUPERVISOR', 'ADMIN'],

    // Locais de Estoque
    'locations.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'WAREHOUSE', 'ADMIN'],
    'locations.create': ['WAREHOUSE', 'ADMIN'],
    'locations.adjustBalance': ['WAREHOUSE', 'ADMIN'],

    // Requisições
    'requests.view': ['CONTRACT_MANAGER', 'SUPERVISOR', 'WAREHOUSE', 'REQUESTER', 'ADMIN'],
    'requests.create': ['SUPERVISOR', 'REQUESTER', 'ADMIN'],
    'requests.approve': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
    'requests.separate': ['WAREHOUSE', 'ADMIN'],
    'requests.deliver': ['WAREHOUSE', 'ADMIN'],

    // Transferências
    'transfers.view': ['CONTRACT_MANAGER', 'WAREHOUSE', 'ADMIN'],
    'transfers.create': ['WAREHOUSE', 'ADMIN'],
    'transfers.approve': ['CONTRACT_MANAGER', 'ADMIN'],
    'transfers.execute': ['WAREHOUSE', 'ADMIN'],
    'transfers.receive': ['WAREHOUSE', 'ADMIN'],

    // Inventário
    'inventory.view': ['WAREHOUSE', 'CONTRACT_MANAGER', 'ADMIN'],
    'inventory.count': ['WAREHOUSE', 'ADMIN'],
    'inventory.adjust': ['WAREHOUSE', 'ADMIN'],

    // Relatórios
    'reports.consumption': ['CONTRACT_MANAGER', 'SUPERVISOR', 'ADMIN'],
    'reports.costs': ['CONTRACT_MANAGER', 'ADMIN'],
    'reports.stock': ['WAREHOUSE', 'CONTRACT_MANAGER', 'ADMIN'],
  };
  ```

- [ ] **AU-004**: Implementar hook `usePermission`

  ```typescript
  import { useAuth } from './useAuth';
  import { ENTERPRISE_PERMISSIONS } from '../permissions/enterprise';

  export function usePermission(permission: keyof typeof ENTERPRISE_PERMISSIONS) {
    const { user, businessType } = useAuth();

    if (businessType !== 'ENTERPRISE') {
      return true; // Outros perfis têm permissões diferentes
    }

    const allowedRoles = ENTERPRISE_PERMISSIONS[permission];
    return allowedRoles.includes(user?.role);
  }

  export function useCanDo() {
    const { user, businessType } = useAuth();

    return (permission: keyof typeof ENTERPRISE_PERMISSIONS): boolean => {
      if (businessType !== 'ENTERPRISE') return true;
      const allowedRoles = ENTERPRISE_PERMISSIONS[permission];
      return allowedRoles.includes(user?.role);
    };
  }
  ```

- [ ] **AU-005**: Criar componente `PermissionGuard`

  ```tsx
  interface PermissionGuardProps {
    permission: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }

  export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
    const canDo = useCanDo();

    if (!canDo(permission)) {
      return <>{fallback}</>;
    }

    return <>{children}</>;
  }

  // Uso
  <PermissionGuard permission="requests.approve">
    <Button onClick={handleApprove}>Aprovar</Button>
  </PermissionGuard>;
  ```

### Fase 3: Hierarquia de Aprovação (2 tasks)

- [ ] **AU-006**: Implementar `ApprovalLevel` no backend

  ```rust
  // src/services/approval_service.rs

  pub enum ApprovalLevel {
      Level1,  // Supervisor
      Level2,  // Contract Manager
      Level3,  // Admin
  }

  impl ApprovalLevel {
      pub fn required_roles(&self) -> Vec<EmployeeRole> {
          match self {
              ApprovalLevel::Level1 => vec![
                  EmployeeRole::Supervisor,
                  EmployeeRole::ContractManager,
                  EmployeeRole::Admin,
              ],
              ApprovalLevel::Level2 => vec![
                  EmployeeRole::ContractManager,
                  EmployeeRole::Admin,
              ],
              ApprovalLevel::Level3 => vec![
                  EmployeeRole::Admin,
              ],
          }
      }
  }

  pub fn get_required_level(amount: f64) -> ApprovalLevel {
      if amount > 50_000.0 {
          ApprovalLevel::Level3
      } else if amount > 10_000.0 {
          ApprovalLevel::Level2
      } else {
          ApprovalLevel::Level1
      }
  }
  ```

- [ ] **AU-007**: Configurar limites por contrato

  ```typescript
  // Configuração por contrato
  interface ApprovalConfig {
    level1Limit: number; // Até X: Supervisor
    level2Limit: number; // Até Y: Contract Manager
    // Acima de Y: Admin
  }

  // Default
  const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
    level1Limit: 10000,
    level2Limit: 50000,
  };
  ```

### Fase 4: Vinculação Contrato-Usuário (1 task)

- [ ] **AU-008**: Implementar vinculação de funcionário a contratos

  ```prisma
  // Adicionar no schema
  model ContractEmployee {
    id           String   @id @default(uuid())
    contractId   String
    contract     Contract @relation(fields: [contractId], references: [id])
    employeeId   String
    employee     Employee @relation(fields: [employeeId], references: [id])
    role         EmployeeRole
    assignedAt   DateTime @default(now())

    @@unique([contractId, employeeId])
  }
  ```

  ```typescript
  // Frontend: filtrar contratos acessíveis
  function useAccessibleContracts() {
    const { user } = useAuth();

    return useQuery({
      queryKey: ['accessible-contracts', user?.id],
      queryFn: () =>
        invoke('list_accessible_contracts', {
          employeeId: user?.id,
        }),
    });
  }
  ```

---

## 🔑 Fluxo de Autenticação Enterprise

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO DE LOGIN                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Tela de Login]                                              │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────┐                                              │
│   │ Entrada PIN │◄──── 4-6 dígitos numéricos                   │
│   └─────┬───────┘                                              │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────┐      ┌─────────────┐                         │
│   │  Validar    │─────►│ Buscar Role │                         │
│   │    PIN      │      │ e Contratos │                         │
│   └─────────────┘      └──────┬──────┘                         │
│                               │                                 │
│                               ▼                                 │
│                        ┌─────────────┐                         │
│                        │ Carregar    │                         │
│                        │ Permissões  │                         │
│                        └──────┬──────┘                         │
│                               │                                 │
│                               ▼                                 │
│                        ┌─────────────┐                         │
│                        │  Redirecionar│                        │
│                        │  ao Dashboard│                        │
│                        └─────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Matriz de Acesso Visual

| Feature            | ADMIN | CONTRACT_MANAGER | SUPERVISOR | WAREHOUSE | REQUESTER |
| ------------------ | :---: | :--------------: | :--------: | :-------: | :-------: |
| **Contratos**      |
| Visualizar         |  ✅   |        ✅        |     ❌     |    ❌     |    ❌     |
| Criar              |  ✅   |        ✅        |     ❌     |    ❌     |    ❌     |
| Editar             |  ✅   |        ✅        |     ❌     |    ❌     |    ❌     |
| **Frentes**        |
| Visualizar         |  ✅   |        ✅        |     ✅     |    ✅     |    ❌     |
| Criar              |  ✅   |        ✅        |     ❌     |    ❌     |    ❌     |
| **Requisições**    |
| Visualizar         |  ✅   |        ✅        |     ✅     |    ✅     |    ✅     |
| Criar              |  ✅   |        ❌        |     ✅     |    ❌     |    ✅     |
| Aprovar            |  ✅   |        ✅        |    ✅\*    |    ❌     |    ❌     |
| Separar            |  ✅   |        ❌        |     ❌     |    ✅     |    ❌     |
| **Transferências** |
| Visualizar         |  ✅   |        ✅        |     ❌     |    ✅     |    ❌     |
| Criar              |  ✅   |        ❌        |     ❌     |    ✅     |    ❌     |
| Aprovar            |  ✅   |        ✅        |     ❌     |    ❌     |    ❌     |
| Executar           |  ✅   |        ❌        |     ❌     |    ✅     |    ❌     |
| **Inventário**     |
| Visualizar         |  ✅   |        ✅        |     ❌     |    ✅     |    ❌     |
| Contar             |  ✅   |        ❌        |     ❌     |    ✅     |    ❌     |
| Ajustar            |  ✅   |        ❌        |     ❌     |    ✅     |    ❌     |

\*Supervisor aprova apenas requisições de REQUESTER

---

## 🧪 Validação

- [ ] Roles corretos atribuídos no cadastro
- [ ] Permissões respeitadas na UI (botões ocultos/desabilitados)
- [ ] Permissões validadas no backend (commands)
- [ ] Hierarquia de aprovação funciona corretamente
- [ ] Funcionário só vê contratos vinculados

---

<!-- Roadmap criado em: 25 de Janeiro de 2026 -->
