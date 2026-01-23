# 📱 GIRO Mobile - Visão Geral

> **Versão:** 1.0.0  
> **Status:** Planejamento  
> **Última Atualização:** 8 de Janeiro de 2026

---

## 🎯 O Que É

O **GIRO Mobile** é o aplicativo Android complementar ao GIRO Desktop, focado em operações de **estoque e inventário** dentro do estabelecimento. Funciona via WiFi local, sincronizando em tempo real com o banco de dados do desktop.

### Proposta de Valor

> _"Liberdade para gerenciar estoque de qualquer lugar da loja"_

O app transforma qualquer celular Android em uma ferramenta profissional para:

- Escanear produtos na gôndola
- Fazer inventário ambulante
- Cadastrar produtos rapidamente
- Verificar validades
- Receber alertas em tempo real

---

## 👥 Público-Alvo

### Perfil Primário: Repositor/Estoquista

| Característica       | Descrição                              |
| -------------------- | -------------------------------------- |
| **Função**           | Repor gôndolas, organizar estoque      |
| **Dispositivo**      | Celular Android pessoal ou da loja     |
| **Experiência Tech** | Básica a intermediária                 |
| **Necessidade**      | Verificar estoque sem ir ao computador |

### Perfil Secundário: Proprietário/Gerente

| Característica       | Descrição                       |
| -------------------- | ------------------------------- |
| **Função**           | Supervisionar, fazer inventário |
| **Dispositivo**      | Celular pessoal                 |
| **Experiência Tech** | Intermediária                   |
| **Necessidade**      | Controle rápido, mobilidade     |

---

## 🏗️ Arquitetura

### Comunicação Local (WiFi)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REDE LOCAL DA LOJA                             │
│                         (192.168.x.x / WiFi)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────┐              ┌───────────────────────┐      │
│  │    GIRO Desktop       │   WebSocket  │     GIRO Mobile       │      │
│  │    (Servidor)         │◄────────────►│     (Cliente)         │      │
│  │                       │    :3847     │                       │      │
│  │  ┌─────────────────┐  │              │  ┌─────────────────┐  │      │
│  │  │ WebSocket Server│  │              │  │  React Native   │  │      │
│  │  │                 │  │              │  │      App        │  │      │
│  │  │  • Sync Engine  │  │              │  │                 │  │      │
│  │  │  • Auth Handler │  │              │  │  • Scanner      │  │      │
│  │  │  • Data Bridge  │  │              │  │  • Inventário   │  │      │
│  │  └─────────────────┘  │              │  │  • Validade     │  │      │
│  │           │           │              │  │  • Cadastro     │  │      │
│  │           ▼           │              │  └─────────────────┘  │      │
│  │  ┌─────────────────┐  │              │                       │      │
│  │  │    SQLite DB    │  │              │                       │      │
│  │  │   (Principal)   │  │              │                       │      │
│  │  └─────────────────┘  │              │                       │      │
│  └───────────────────────┘              └───────────────────────┘      │
│                                                                         │
│  ┌───────────────────────┐              ┌───────────────────────┐      │
│  │     GIRO Mobile       │              │     GIRO Mobile       │      │
│  │    (Dispositivo 2)    │              │    (Dispositivo N)    │      │
│  └───────────────────────┘              └───────────────────────┘      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Conexão

```
1. Desktop inicia → WebSocket Server ativo na porta 3847
2. Mobile abre → Busca servidor na rede (mDNS/Broadcast)
3. Mobile conecta → Autentica com PIN do funcionário
4. Operações → Sync bidirecional em tempo real
5. Desconexão → Reconexão automática
```

---

## 🛠️ Stack Tecnológica

### Mobile App

| Tecnologia       | Versão | Justificativa                   |
| ---------------- | ------ | ------------------------------- |
| **React Native** | 0.73+  | Cross-platform, TS, expertise   |
| **Expo**         | 50+    | Build simplificado, OTA updates |
| **TypeScript**   | 5.4+   | Type safety                     |
| **Zustand**      | 4.5+   | State management leve           |
| **React Query**  | 5.0+   | Cache e sync                    |
| **NativeWind**   | 4+     | TailwindCSS no mobile           |
| **expo-camera**  | Latest | Scanner de código de barras     |
| **expo-haptics** | Latest | Feedback tátil                  |

### Comunicação

| Tecnologia    | Uso            | Justificativa                |
| ------------- | -------------- | ---------------------------- |
| **WebSocket** | Sync real-time | Bidirecional, baixa latência |
| **mDNS**      | Descoberta     | Encontrar desktop na rede    |
| **JSON**      | Serialização   | Compatível com Desktop       |

---

## 📦 Funcionalidades Core

### 1. 📷 Scanner de Código de Barras

| Feature            | Descrição              | Prioridade |
| ------------------ | ---------------------- | ---------- |
| Scan contínuo      | Camera sempre pronta   | P0         |
| Feedback haptico   | Vibrar ao detectar     | P0         |
| Som de confirmação | Beep ao escanear       | P0         |
| Multi-formato      | EAN-13, EAN-8, Code128 | P0         |
| Lanterna integrada | Para locais escuros    | P1         |
| Histórico de scans | Últimos 20             | P1         |

**Fluxo do Scanner:**

```
Scan → Buscar no Desktop → Exibir Produto → Ação Rápida
                               │
                               ├─ Ver estoque
                               ├─ Ajustar quantidade
                               ├─ Ver validade
                               └─ Cadastrar (se não existe)
```

### 2. 📦 Consulta de Estoque

| Feature                 | Descrição              | Prioridade |
| ----------------------- | ---------------------- | ---------- |
| Busca por nome          | Fuzzy search           | P0         |
| Busca por código        | Exato                  | P0         |
| Ver quantidade          | Atual vs mínimo        | P0         |
| Ver localização         | Corredor, prateleira   | P2         |
| Ver última movimentação | Data e tipo            | P1         |
| Status visual           | Verde/Amarelo/Vermelho | P0         |

### 3. 📋 Inventário Ambulante

| Feature              | Descrição                | Prioridade |
| -------------------- | ------------------------ | ---------- |
| Iniciar inventário   | Por categoria ou total   | P0         |
| Contar produto       | Scan + digitar qtd       | P0         |
| Diferença automática | Sistema vs contado       | P0         |
| Salvar parcial       | Continuar depois         | P1         |
| Finalizar            | Gerar ajustes no Desktop | P0         |
| Histórico            | Últimos inventários      | P1         |

**Fluxo do Inventário:**

```
Iniciar → Escanear → Digitar Quantidade → Próximo
              ↓
    Produto: Arroz 5kg
    Sistema: 15 unidades
    Contagem: [___]
              ↓
         Diferença: -3
         (Vai gerar ajuste no desktop)
```

### 4. 📅 Controle de Validade

| Feature                | Descrição               | Prioridade |
| ---------------------- | ----------------------- | ---------- |
| Lista de vencimentos   | Próximos 7/15/30 dias   | P0         |
| Scan para verificar    | Ver validade do produto | P0         |
| Marcar como verificado | Checklist de gôndola    | P1         |
| Alertas push           | Produtos críticos       | P2         |
| Ação rápida            | Baixar, promocionar     | P1         |

### 5. ➕ Cadastro Rápido

| Feature              | Descrição              | Prioridade |
| -------------------- | ---------------------- | ---------- |
| Scan de produto novo | Código não cadastrado  | P0         |
| Formulário mínimo    | Nome, preço, categoria | P0         |
| Foto do produto      | Camera integrada       | P2         |
| Sugestão de dados    | Via base GTIN          | P2         |
| Enviar para Desktop  | Sync imediato          | P0         |

### 6. 🔔 Alertas e Notificações

| Feature            | Descrição            | Prioridade |
| ------------------ | -------------------- | ---------- |
| Receber alertas    | Do Desktop via WS    | P1         |
| Estoque baixo      | Push notification    | P1         |
| Vencimento crítico | Push notification    | P1         |
| Venda realizada    | Notificação discreta | P2         |

---

## 🔐 Autenticação

### Fluxo de Login

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Mobile    │         │  WebSocket  │         │   Desktop   │
│    App      │         │   Server    │         │    GIRO     │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Descobrir Server  │                       │
       │ ─────────────────────►│                       │
       │                       │                       │
       │  2. Conectar WS       │                       │
       │ ─────────────────────►│                       │
       │                       │                       │
       │  3. Enviar PIN        │                       │
       │ ─────────────────────►│  4. Validar PIN      │
       │                       │ ─────────────────────►│
       │                       │                       │
       │                       │  5. Funcionário OK   │
       │                       │◄─────────────────────│
       │  6. Sessão Ativa      │                       │
       │◄─────────────────────│                       │
       │                       │                       │
```

### Níveis de Acesso

| Role        | Permissões no Mobile  |
| ----------- | --------------------- |
| **ADMIN**   | Tudo                  |
| **MANAGER** | Tudo menos config     |
| **CASHIER** | Consulta + Inventário |
| **VIEWER**  | Apenas consulta       |

---

## 🎨 Design do App

### Telas Principais

```
┌─────────────────────────────────────────┐
│                 GIRO                    │
│              📱 Mobile                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  📷     │  │  📦     │  │  📋     │ │
│  │Scanner  │  │Estoque  │  │Inventário│ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  📅     │  │  ➕     │  │  ⚙️     │ │
│  │Validade │  │Cadastro │  │Config   │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🔴 3 alertas não lidos             ││
│  └─────────────────────────────────────┘│
│                                         │
│  Status: 🟢 Conectado ao GIRO Desktop  │
└─────────────────────────────────────────┘
```

### Princípios de UX

| Princípio           | Aplicação                                   |
| ------------------- | ------------------------------------------- |
| **Thumb Zone**      | Ações principais no alcance do polegar      |
| **One-Hand Use**    | Operável com uma mão (outra segura produto) |
| **Visual Feedback** | Cores, ícones, animações claras             |
| **Offline-First**   | Queue de operações se desconectar           |
| **Fast Launch**     | < 2 segundos para tela principal            |

---

## 📁 Estrutura do Projeto

```
giro-mobile/
├── docs/                    # Documentação
│   ├── 00-OVERVIEW.md
│   ├── 01-ARQUITETURA.md
│   └── 02-FEATURES.md
├── src/
│   ├── app/                 # Expo Router
│   │   ├── (tabs)/
│   │   │   ├── scanner.tsx
│   │   │   ├── stock.tsx
│   │   │   ├── inventory.tsx
│   │   │   ├── expiration.tsx
│   │   │   └── settings.tsx
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── ui/              # Componentes base
│   │   ├── scanner/         # Scanner específicos
│   │   ├── product/         # Cards de produto
│   │   └── inventory/       # Inventário
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useScanner.ts
│   │   └── useInventory.ts
│   ├── stores/
│   │   ├── auth-store.ts
│   │   ├── connection-store.ts
│   │   └── inventory-store.ts
│   ├── lib/
│   │   ├── websocket.ts
│   │   ├── discovery.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── app.json                 # Expo config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📡 Protocolo de Comunicação

### Mensagens WebSocket

```typescript
// Client → Server
interface MobileRequest {
  type: 'auth' | 'query' | 'mutation' | 'sync';
  id: string; // UUID para correlação
  payload: {
    action: string;
    data: any;
  };
}

// Server → Client
interface DesktopResponse {
  type: 'response' | 'event' | 'error';
  id: string;
  payload: any;
}
```

### Ações Disponíveis

| Ação               | Direção | Descrição            |
| ------------------ | ------- | -------------------- |
| `auth.login`       | M→D     | Autenticar com PIN   |
| `product.search`   | M→D     | Buscar produtos      |
| `product.get`      | M→D     | Detalhes do produto  |
| `product.create`   | M→D     | Cadastrar novo       |
| `stock.adjust`     | M→D     | Ajustar quantidade   |
| `inventory.start`  | M→D     | Iniciar inventário   |
| `inventory.count`  | M→D     | Registrar contagem   |
| `inventory.finish` | M→D     | Finalizar inventário |
| `alert.new`        | D→M     | Novo alerta          |
| `sale.completed`   | D→M     | Venda realizada      |

---

## 📅 Roadmap

### Sprint 1: Setup + Scanner (2 semanas)

- [ ] Setup Expo + TypeScript
- [ ] Tela de conexão (descoberta)
- [ ] Login por PIN
- [ ] Scanner básico
- [ ] Consulta de produto

### Sprint 2: Estoque (2 semanas)

- [ ] Listagem de produtos
- [ ] Busca
- [ ] Detalhes do produto
- [ ] Ajuste de quantidade

### Sprint 3: Inventário (2 semanas)

- [ ] Iniciar inventário
- [ ] Contagem
- [ ] Diferenças
- [ ] Finalização

### Sprint 4: Validade + Alertas (2 semanas)

- [ ] Lista de vencimentos
- [ ] Notificações push
- [ ] Cadastro rápido
- [ ] Polish e performance

---

## 📊 Requisitos Mínimos

### Dispositivo

| Requisito         | Mínimo               |
| ----------------- | -------------------- |
| **Android**       | 8.0+ (API 26)        |
| **RAM**           | 2GB                  |
| **Armazenamento** | 100MB                |
| **Camera**        | Autofoco obrigatório |
| **WiFi**          | 2.4GHz ou 5GHz       |

### Rede

| Requisito      | Descrição                      |
| -------------- | ------------------------------ |
| **Mesmo WiFi** | Mobile e Desktop na mesma rede |
| **Porta 3847** | Aberta no firewall do Windows  |
| **Latência**   | < 100ms (rede local)           |

---

_Este documento define o escopo do aplicativo mobile GIRO._
