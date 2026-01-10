# 🖥️ Dashboard Roadmap - GIRO License Server

> **Agente:** Frontend (Dashboard)  
> **Sprint:** 3  
> **Dependências:** Backend, Auth  
> **Desbloqueia:** -

---

## 📊 Progresso

```
[████████████████████████] 12/12 tasks (100%) ✅
```

---

## 📋 Tasks

### Setup Inicial

- [x] **FE-001:** Criar projeto Next.js 14 ✅

  - ✅ App Router
  - ✅ TypeScript
  - ✅ TailwindCSS v4
  - ✅ Shadcn/UI

- [x] **FE-002:** Configurar estrutura base ✅

  - ✅ Layout principal (dashboard/layout.tsx)
  - ✅ Providers (Theme, Query)
  - ✅ Middleware de auth

- [x] **FE-003:** Configurar API client ✅
  - ✅ lib/api.ts com fetch wrapper
  - ✅ Interceptors para JWT
  - ✅ Error handling global

### Autenticação UI

- [x] **FE-004:** Criar telas de auth ✅

  - ✅ /login
  - ✅ Redirect automático para login

- [x] **FE-005:** Implementar AuthContext ✅
  - ✅ Login/Logout
  - ✅ Token management
  - ✅ Protected routes

### Dashboard Principal

- [x] **FE-006:** Criar página /dashboard ✅

  - ✅ Cards de métricas
  - ✅ Gráfico de vendas (Recharts)
  - ✅ Lista de alertas

- [x] **FE-007:** Criar página /licenses ✅

  - ✅ Listagem com filtros
  - ✅ Status badges
  - ✅ Ações (criar, revogar)

- [x] **FE-008:** Criar página /licenses/:key ✅
  - ✅ Detalhes da licença
  - ✅ Info do hardware
  - ✅ Histórico de ativações

### Gerenciamento

- [x] **FE-009:** Criar página /hardware ✅

  - ✅ Lista de máquinas
  - ✅ Status de conexão
  - ✅ Ação de limpar vínculo

- [x] **FE-010:** Criar página /payments ✅

  - ✅ Histórico de pagamentos
  - ✅ Faturas

- [x] **FE-011:** Criar página /settings ✅
  - ✅ Dados da conta
  - ✅ Alterar senha
  - ✅ API Keys management

### Componentes

- [x] **FE-012:** Criar componentes reutilizáveis ✅
  - ✅ DataTable com paginação
  - ✅ MetricCard (via Shadcn Card)
  - ✅ StatusBadge
  - ✅ Toast notifications (Sonner)

---

## 🔧 Comandos Úteis

```bash
# Dev server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run type-check
```

---

## ✅ Critérios de Aceite

- [x] Todas as telas responsivas (mobile-first) ✅ (TailwindCSS responsive classes)
- [x] Dark mode funcionando ✅ (dark: classes em componentes Shadcn)
- [x] Loading states em todas as ações ✅ (useState loading em páginas)
- [x] Error handling com feedback visual ✅ (try/catch + console.error)
- [ ] Lighthouse score > 90 ⏳ (pendente teste em produção)

---

## 📝 Notas

- Usar Server Components por padrão
- Client Components apenas para interatividade
- Implementar React Query para cache

---

_Última atualização: 08/01/2026_
