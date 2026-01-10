# 🏍️ Roadmap - Expansão para Motopeças/Mecânicas

> **Versão:** 1.0.0  
> **Status:** Planejamento  
> **Criado:** 9 de Janeiro de 2026  
> **Prioridade:** Feature de Expansão (Multi-Segmento)

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Análise de Mercado](#análise-de-mercado)
3. [O Que Reaproveitar vs Criar](#o-que-reaproveitar-vs-criar)
4. [Sistema de Perfis de Negócio](#sistema-de-perfis-de-negócio)
5. [Bancos de Dados de Motos/Peças Disponíveis](#bancos-de-dados-de-motospeças-disponíveis)
6. [Entidades Específicas para Motopeças](#entidades-específicas-para-motopeças)
7. [Features Específicas](#features-específicas)
8. [Schema do Banco de Dados](#schema-do-banco-de-dados)
9. [Fases de Implementação](#fases-de-implementação)
10. [Estimativa de Esforço](#estimativa-de-esforço)

---

## 🎯 Visão Geral

### O Conceito

Transformar o **GIRO** em um sistema **multi-segmento** onde o mesmo core pode atender diferentes tipos de negócios através de **perfis configuráveis**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GIRO - SISTEMA BASE                          │
│                                                                      │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │  PERFIL:    │   │  PERFIL:    │   │  PERFIL:    │   ...        │
│   │  MERCEARIA  │   │  MOTOPEÇAS  │   │  PET SHOP   │              │
│   └─────────────┘   └─────────────┘   └─────────────┘              │
│                                                                      │
│   Core Compartilhado:                                               │
│   • PDV (Vendas)           • Relatórios                            │
│   • Estoque                 • Backup                                │
│   • Funcionários            • Configurações                         │
│   • Caixa                   • Impressão                            │
│                                                                      │
│   Features Específicas por Perfil:                                  │
│   • Motopeças: Veículos, Compatibilidade, Ordens de Serviço        │
│   • Mercearia: Validade, FIFO, Balança                             │
│   • Pet Shop: Pets, Serviços, Agendamento                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Por Que Motopeças?

| Métrica                           | Valor                    |
| --------------------------------- | ------------------------ |
| **Número de motopeças no Brasil** | ~50.000 estabelecimentos |
| **Frota de motos no Brasil**      | ~30 milhões de veículos  |
| **Crescimento anual do setor**    | 8-10%                    |
| **Ticket médio por venda**        | R$ 80-300                |
| **Margem média**                  | 30-50%                   |

---

## 📊 Análise de Mercado

### Perfil do Cliente Motopeças

| Característica          | Descrição                                         |
| ----------------------- | ------------------------------------------------- |
| **Tipo de Negócio**     | Loja de peças, oficina mecânica, loja + oficina   |
| **Faturamento**         | R$ 15.000 a R$ 200.000/mês                        |
| **Funcionários**        | 1 a 10 colaboradores                              |
| **Dor Principal**       | Encontrar peças compatíveis, histórico do cliente |
| **Diferencial Buscado** | Busca por moto/modelo, ordens de serviço          |

### Fluxo de Trabalho Típico

```
Cliente chega → Informa a moto → Busca peça compatível → Venda/OS
      │              │                    │                  │
      ▼              ▼                    ▼                  ▼
   Cadastro      CG 160 Titan         Filtro de óleo      Cupom +
   do Cliente      2020               compatível          Garantia
```

### Concorrentes Específicos

| Sistema        | Modelo  | Preço          | Pontos Fracos       |
| -------------- | ------- | -------------- | ------------------- |
| **SysMoto**    | Desktop | R$ 200-500/mês | Interface antiga    |
| **OficinaWeb** | SaaS    | R$ 150-400/mês | Depende de internet |
| **AutoGestor** | Desktop | R$ 300-800/mês | Complexo, caro      |
| **Planilhas**  | Excel   | Gratuito       | Sem controle real   |

---

## 🔄 O Que Reaproveitar vs Criar

### ✅ Reaproveitar 100% (Core)

| Módulo           | Justificativa                |
| ---------------- | ---------------------------- |
| **PDV**          | Mesma lógica de vendas       |
| **Estoque**      | Entrada/saída igual          |
| **Caixa**        | Abertura/fechamento idêntico |
| **Funcionários** | Mesmo gerenciamento          |
| **Relatórios**   | Base igual + específicos     |
| **Backup**       | Mesmo mecanismo              |
| **Impressora**   | Mesmo hardware               |
| **Alertas**      | Mesma estrutura              |

### ⚙️ Adaptar (Pequenas Mudanças)

| Módulo            | Adaptação                                      |
| ----------------- | ---------------------------------------------- |
| **Produtos**      | Adicionar campos de veículo compatível         |
| **Categorias**    | Categorias específicas (Motor, Suspensão, etc) |
| **Fornecedores**  | Adicionar distribuidoras de peças              |
| **Configurações** | Novo perfil de negócio                         |

### 🆕 Criar do Zero

| Módulo                    | Descrição                                 |
| ------------------------- | ----------------------------------------- |
| **Veículos (Motos)**      | Banco de marcas/modelos/anos              |
| **Compatibilidade**       | Peça ↔ Veículo(s)                         |
| **Clientes + Veículos**   | Cliente com suas motos cadastradas        |
| **Ordens de Serviço**     | Mecânica: diagnóstico, peças, mão de obra |
| **Garantias**             | Controle de garantia de peças/serviços    |
| **Histórico por Veículo** | Tudo que foi feito na moto X              |

---

## 👤 Sistema de Perfis de Negócio

### Seleção no Primeiro Uso (Wizard)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BEM-VINDO AO GIRO!                               │
│                                                                      │
│          Qual é o tipo do seu negócio?                              │
│                                                                      │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│   │  🛒            │   │  🏍️            │   │  🐕            │  │
│   │                 │   │                 │   │                 │  │
│   │   MERCEARIA    │   │   MOTOPEÇAS    │   │   PET SHOP     │  │
│   │   Mercadinho    │   │   Autopeças    │   │   (Em Breve)   │  │
│   │   Padaria       │   │   Oficina      │   │                 │  │
│   │                 │   │                 │   │                 │  │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘  │
│                                                                      │
│   ℹ️ Você poderá alterar configurações depois nas preferências      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Configuração do Perfil

```typescript
// types/business-profile.ts

export type BusinessType =
  | 'GROCERY' // Mercearia, mercadinho, padaria
  | 'MOTOPARTS' // Motopeças, autopeças, oficina
  | 'PETSHOP' // Pet shop (futuro)
  | 'GENERAL'; // Genérico

export interface BusinessProfile {
  type: BusinessType;

  // Features habilitadas
  features: {
    // Core (sempre true)
    pdv: true;
    inventory: true;
    employees: true;
    cashControl: true;
    reports: true;

    // Específicas por tipo
    expirationControl: boolean; // Mercearia
    weightedProducts: boolean; // Mercearia (balança)
    vehicleCompatibility: boolean; // Motopeças
    serviceOrders: boolean; // Motopeças/Oficina
    warranties: boolean; // Motopeças
    customerVehicles: boolean; // Motopeças
    petRegistry: boolean; // Pet Shop
    grooming: boolean; // Pet Shop
  };

  // Categorias padrão
  defaultCategories: string[];

  // Labels customizados
  labels: {
    product: string; // "Produto" | "Peça" | "Item"
    customer: string; // "Cliente" | "Tutor"
    sale: string; // "Venda" | "Atendimento"
  };
}

// Perfis pré-definidos
export const BUSINESS_PROFILES: Record<BusinessType, BusinessProfile> = {
  GROCERY: {
    type: 'GROCERY',
    features: {
      pdv: true,
      inventory: true,
      employees: true,
      cashControl: true,
      reports: true,
      expirationControl: true,
      weightedProducts: true,
      vehicleCompatibility: false,
      serviceOrders: false,
      warranties: false,
      customerVehicles: false,
      petRegistry: false,
      grooming: false,
    },
    defaultCategories: ['Bebidas', 'Laticínios', 'Carnes', 'Hortifrúti', 'Padaria'],
    labels: {
      product: 'Produto',
      customer: 'Cliente',
      sale: 'Venda',
    },
  },
  MOTOPARTS: {
    type: 'MOTOPARTS',
    features: {
      pdv: true,
      inventory: true,
      employees: true,
      cashControl: true,
      reports: true,
      expirationControl: false,
      weightedProducts: false,
      vehicleCompatibility: true,
      serviceOrders: true,
      warranties: true,
      customerVehicles: true,
      petRegistry: false,
      grooming: false,
    },
    defaultCategories: ['Motor', 'Suspensão', 'Freios', 'Elétrica', 'Transmissão', 'Carenagem'],
    labels: {
      product: 'Peça',
      customer: 'Cliente',
      sale: 'Venda',
    },
  },
  // ... outros perfis
};
```

### Componente de Visibilidade Condicional

```tsx
// components/FeatureGate.tsx

import { useBusinessProfile } from '@/hooks/useBusinessProfile';

interface FeatureGateProps {
  feature: keyof BusinessProfile['features'];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { profile } = useBusinessProfile();

  if (!profile.features[feature]) {
    return fallback;
  }

  return children;
}

// Uso:
<FeatureGate feature="vehicleCompatibility">
  <VehicleSelector />
</FeatureGate>

<FeatureGate feature="expirationControl">
  <ExpirationAlerts />
</FeatureGate>
```

---

## 🗃️ Bancos de Dados de Motos/Peças Disponíveis

### APIs Gratuitas Disponíveis

#### 1. **API FIPE (Recomendada para Base de Veículos)**

```
URL: https://parallelum.com.br/fipe/api/v1/motos
Dados: Marcas, Modelos, Anos, Preços
Limite: 500 req/dia (grátis) ou 1000 com token
Cobertura: Todas as motos vendidas no Brasil
```

**Endpoints úteis:**

```bash
# Listar todas as marcas de motos
GET /fipe/api/v1/motos/marcas

# Listar modelos de uma marca (ex: Honda = 21)
GET /fipe/api/v1/motos/marcas/21/modelos

# Listar anos de um modelo
GET /fipe/api/v1/motos/marcas/21/modelos/5223/anos

# Obter valor FIPE
GET /fipe/api/v1/motos/marcas/21/modelos/5223/anos/2020-1
```

**Exemplo de resposta:**

```json
{
  "TipoVeiculo": 2,
  "Valor": "R$ 14.832,00",
  "Marca": "Honda",
  "Modelo": "CG 160 TITAN",
  "AnoModelo": 2020,
  "Combustivel": "Gasolina",
  "CodigoFipe": "811052-0",
  "MesReferencia": "janeiro de 2026"
}
```

#### 2. **Brasil API - FIPE (Alternativa)**

```
URL: https://brasilapi.com.br/api/fipe/marcas/v1/motos
Sem limite de requisições
Mesmos dados da FIPE
```

### Dados de Peças - Opções

#### ❌ **Não existe API pública de peças**

Infelizmente, não existe um banco de dados público e gratuito de peças de motos com compatibilidade. As opções são:

| Fonte                             | Acesso                  | Custo                |
| --------------------------------- | ----------------------- | -------------------- |
| **Catálogos OEM** (Honda, Yamaha) | Sites oficiais          | Gratuito, mas manual |
| **CMSNL**                         | 4.6M peças, API privada | Comercial            |
| **Partzilla**                     | API privada             | Comercial            |
| **Bike Parts Honda**              | Scraping possível       | Grátis, mas lento    |

### 💡 Estratégia Recomendada

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ESTRATÉGIA DE DADOS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. VEÍCULOS (Motos) → Importar da API FIPE                        │
│     • Marcas: Honda, Yamaha, Suzuki, Kawasaki, etc                 │
│     • Modelos: CG 160 Titan, Factor 150, Biz 125...                │
│     • Anos: 2000-2026                                              │
│     • Importação única + sync periódico                            │
│                                                                      │
│  2. PEÇAS → Cadastro manual pelo lojista                           │
│     • O lojista cadastra as peças que vende                        │
│     • Vincula manualmente a compatibilidade                         │
│     • Sistema aprende com o tempo                                   │
│                                                                      │
│  3. SUGESTÕES INTELIGENTES (Futuro)                                │
│     • Com base em vendas anteriores                                 │
│     • "Clientes que compraram X também compraram Y"                 │
│     • Machine Learning para sugerir compatibilidades               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Seed Inicial de Veículos

```typescript
// scripts/import-fipe-motorcycles.ts

import axios from 'axios';

const FIPE_API = 'https://parallelum.com.br/fipe/api/v1';

async function importMotorcycles() {
  // 1. Buscar todas as marcas
  const { data: brands } = await axios.get(`${FIPE_API}/motos/marcas`);

  for (const brand of brands) {
    console.log(`Importando ${brand.nome}...`);

    // 2. Buscar modelos da marca
    const { data: models } = await axios.get(`${FIPE_API}/motos/marcas/${brand.codigo}/modelos`);

    for (const model of models.modelos) {
      // 3. Buscar anos do modelo
      const { data: years } = await axios.get(
        `${FIPE_API}/motos/marcas/${brand.codigo}/modelos/${model.codigo}/anos`
      );

      // 4. Salvar no banco
      await saveVehicle({
        brandCode: brand.codigo,
        brandName: brand.nome,
        modelCode: model.codigo,
        modelName: model.nome,
        years: years.map((y) => ({
          code: y.codigo,
          name: y.nome,
        })),
      });
    }

    // Rate limiting
    await sleep(100);
  }
}
```

---

## 📦 Entidades Específicas para Motopeças

### Diagrama de Relacionamento

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                     ENTIDADES ESPECÍFICAS MOTOPEÇAS                            │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  VEHICLE_BRAND   │       │  VEHICLE_MODEL   │       │  VEHICLE_YEAR    │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id          PK   │◄──────│ brandId     FK   │◄──────│ modelId     FK   │
│ fipeCode         │   1:N │ id          PK   │   1:N │ id          PK   │
│ name             │       │ fipeCode         │       │ year             │
│ logo             │       │ name             │       │ fuelType         │
│ isActive         │       │ category         │       │ fipeCode         │
│ createdAt        │       │ engineSize       │       │ createdAt        │
└──────────────────┘       │ isActive         │       └──────────────────┘
                           │ createdAt        │
                           └──────────────────┘
                                   │
                                   │ N:M (via ProductCompatibility)
                                   ▼
┌──────────────────┐       ┌──────────────────────────┐       ┌──────────────────┐
│     PRODUCT      │◄──────│  PRODUCT_COMPATIBILITY   │───────│  VEHICLE_YEAR    │
│  (existente)     │   1:N │                          │   N:1 │                  │
├──────────────────┤       ├──────────────────────────┤       └──────────────────┘
│ id          PK   │       │ id             PK        │
│ ...              │       │ productId      FK        │
│ oemCode          │       │ vehicleYearId  FK        │       ┌──────────────────┐
│ aftermarketCode  │       │ isVerified     bool      │       │    CUSTOMER      │
│ application      │       │ notes          text      │       │   (existente)    │
└──────────────────┘       │ createdAt                │       ├──────────────────┤
                           └──────────────────────────┘       │ id          PK   │
                                                              │ ...              │
                                                              └──────────────────┘
                                                                      │
                                                                      │ 1:N
                                                                      ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────────────┐
│  SERVICE_ORDER   │───────│  SERVICE_ITEM   │       │    CUSTOMER_VEHICLE      │
├──────────────────┤   1:N ├──────────────────┤       ├──────────────────────────┤
│ id          PK   │       │ id          PK   │       │ id             PK        │
│ customerId  FK   │       │ orderId     FK   │       │ customerId     FK        │
│ vehicleId   FK   │       │ type (PART/SVC)  │       │ vehicleYearId  FK        │
│ status           │       │ productId   FK   │       │ plate          string    │
│ symptoms         │       │ description      │       │ chassis        string    │
│ diagnosis        │       │ quantity         │       │ color          string    │
│ laborCost        │       │ unitPrice        │       │ currentKm      int       │
│ totalParts       │       │ discount         │       │ nickname       string    │
│ totalValue       │       │ total            │       │ notes          text      │
│ warrantyDays     │       │ warrantyDays     │       │ createdAt                │
│ scheduledDate    │       │ createdAt        │       └──────────────────────────┘
│ completedDate    │       └──────────────────┘
│ employeeId  FK   │
│ createdAt        │       ┌──────────────────┐
│ updatedAt        │       │  WARRANTY_CLAIM  │
└──────────────────┘       ├──────────────────┤
                           │ id          PK   │
                           │ saleItemId  FK   │  (ou serviceItemId)
                           │ orderId     FK   │
                           │ reason           │
                           │ status           │
                           │ resolution       │
                           │ createdAt        │
                           └──────────────────┘
```

---

## 🛠️ Features Específicas

### 1. Busca por Veículo no PDV

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BUSCA DE PEÇAS POR VEÍCULO                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Marca:  [Honda        ▼]                                          │
│  Modelo: [CG 160 Titan ▼]                                          │
│  Ano:    [2020         ▼]                                          │
│                                                                      │
│  [🔍 Buscar Peças Compatíveis]                                     │
│                                                                      │
│  ───────────────────────────────────────────────────────────────   │
│                                                                      │
│  Resultados para CG 160 Titan 2020:                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔧 Filtro de Óleo Fram PH6017A                              │   │
│  │    Código: FIL-001 | Estoque: 15 | R$ 28,90                 │   │
│  │    [+ Adicionar]                                            │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 🔧 Pastilha de Freio Dianteira Cobreq                       │   │
│  │    Código: PAS-042 | Estoque: 8 | R$ 45,00                  │   │
│  │    [+ Adicionar]                                            │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 🔧 Kit Relação Transmissão Vaz                              │   │
│  │    Código: KIT-015 | Estoque: 3 | R$ 189,00                 │   │
│  │    [+ Adicionar]                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Cadastro de Peça com Compatibilidade

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CADASTRO DE PEÇA                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ── Dados Básicos ──                                               │
│                                                                      │
│  Nome:           [Filtro de Óleo                           ]       │
│  Código Interno: [FIL-001] (auto)                                  │
│  Código de Barras: [7891234567890                          ]       │
│  Código OEM:     [15410-MKC-A01                            ]       │
│  Marca da Peça:  [Fram                                     ]       │
│  Categoria:      [Lubrificação       ▼]                            │
│                                                                      │
│  ── Preços e Estoque ──                                            │
│                                                                      │
│  Custo: R$ [15,00]   Venda: R$ [28,90]   Margem: 92%               │
│  Estoque Mínimo: [5]  Estoque Atual: [15]                          │
│                                                                      │
│  ── Veículos Compatíveis ──                                        │
│                                                                      │
│  [+ Adicionar Veículo]                                             │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ✓ Honda CG 160 Titan (2016-2024)                   [🗑️]      │ │
│  │ ✓ Honda CG 160 Fan (2016-2024)                     [🗑️]      │ │
│  │ ✓ Honda CG 160 Start (2016-2024)                   [🗑️]      │ │
│  │ ✓ Honda XRE 190 (2016-2024)                        [🗑️]      │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  💡 Dica: Ao adicionar um veículo, você pode selecionar            │
│     vários anos de uma vez (ex: 2016 até 2024)                     │
│                                                                      │
│                        [Cancelar]  [Salvar Peça]                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Ordem de Serviço (Mecânica)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NOVA ORDEM DE SERVIÇO                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  OS #: 2026-0042                    Status: [🟡 Em Andamento ▼]     │
│                                                                     │
│  ── Cliente e Veículo ──                                            │
│                                                                     │
│  Cliente: [João Silva          ] [🔍] [+ Novo]                      │
│  Telefone: (11) 99999-8888                                          │
│                                                                     │
│  Veículo do Cliente:                                                │
│  [Honda CG 160 Titan 2020 - Preta - ABC-1234           ▼]           │
│  KM Atual: [45.230]                                                 │
│                                                                     │
│  ── Sintomas / Reclamação ──                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Cliente relata que a moto está falhando em baixa            │    │
│  │ rotação e consumindo mais combustível que o normal.         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ── Diagnóstico / Serviços ──                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Verificado vela de ignição desgastada e filtro de ar        │    │
│  │ sujo. Recomendada troca de ambos + limpeza do carburador.   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ── Itens da OS ──                                                  │
│                                                                     │
│  [+ Adicionar Peça]  [+ Adicionar Serviço]                          │
│                                                                     │
│  │ Tipo   │ Descrição               │ Qtd │ Unit    │ Total   │     │
│  ├────────┼─────────────────────────┼─────┼─────────┼─────────┤     │
│  │ 🔧 Peça│ Vela de Ignição NGK    │  1  │ R$35,00 │ R$35,00 │      │
│  │ 🔧 Peça│ Filtro de Ar           │  1  │ R$42,00 │ R$42,00 │      │
│  │ 🛠️ Serv│ Mão de obra troca vela │  1  │ R$25,00 │ R$25,00 │      │
│  │ 🛠️ Serv│ Limpeza carburador     │  1  │ R$80,00 │ R$80,00 │      │
│  ├────────┴─────────────────────────┴─────┴─────────┼─────────┤     │
│  │                              Total Peças:        │ R$77,00 │     │
│  │                              Total Serviços:     │R$105,00 │     │
│  │                              Desconto:           │  R$0,00 │     │
│  │                              ═══════════════════════════════     │
│  │                              TOTAL:              │R$182,00 │     │
│  └──────────────────────────────────────────────────┴─────────┘     │
│                                                                     │
│  Garantia: [30] dias    Previsão Entrega: [10/01/2026]              │
│                                                                     │
│        [Imprimir OS]  [Cancelar]  [Salvar]  [Finalizar + Cobrar]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Histórico do Veículo do Cliente

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HISTÓRICO DO VEÍCULO                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🏍️ Honda CG 160 Titan 2020 - Preta                                │
│  Placa: ABC-1234 | Chassi: 9C2JC4120LR...                          │
│  Proprietário: João Silva | KM Atual: 45.230                       │
│                                                                      │
│  ── Timeline ──                                                     │
│                                                                      │
│  📅 09/01/2026 - OS #2026-0042 (R$ 182,00) ✅ Concluída            │
│     └─ Troca de vela + filtro ar + limpeza carburador              │
│        KM: 45.230                                                   │
│                                                                      │
│  📅 15/10/2025 - OS #2025-0189 (R$ 320,00) ✅ Concluída            │
│     └─ Troca de óleo + filtro + pastilhas freio                    │
│        KM: 42.100                                                   │
│                                                                      │
│  📅 20/06/2025 - Venda #12847 (R$ 189,00)                          │
│     └─ Kit relação transmissão                                     │
│        KM: 38.500                                                   │
│                                                                      │
│  📅 10/03/2025 - OS #2025-0067 (R$ 450,00) ✅ Concluída            │
│     └─ Revisão completa + troca de pneu traseiro                   │
│        KM: 35.000                                                   │
│                                                                      │
│  ── Próximas Manutenções Sugeridas ──                              │
│                                                                      │
│  ⚠️ Troca de óleo: próxima em ~5.000 km (50.230 km)                │
│  ⚠️ Correia dentada: verificar em 60.000 km                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💾 Schema do Banco de Dados

### Novas Tabelas para Motopeças

```prisma
// prisma/schema.prisma - Adições para Motopeças

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE PERFIL DO NEGÓCIO
// ════════════════════════════════════════════════════════════════════════════

model BusinessConfig {
  id            String       @id @default(cuid())

  // Tipo do negócio
  businessType  BusinessType @default(GENERAL)

  // Features habilitadas (JSON)
  features      String       // JSON com features ativas

  // Labels customizados (JSON)
  labels        String       // JSON com labels

  // Metadata
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

enum BusinessType {
  GROCERY     // Mercearia
  MOTOPARTS   // Motopeças
  PETSHOP     // Pet Shop
  GENERAL     // Genérico
}

// ════════════════════════════════════════════════════════════════════════════
// MARCAS DE VEÍCULOS
// ════════════════════════════════════════════════════════════════════════════

model VehicleBrand {
  id          String   @id @default(cuid())

  // Identificação
  fipeCode    String   @unique   // Código da FIPE (ex: "21" para Honda)
  name        String             // Nome da marca

  // Visual
  logoUrl     String?            // URL do logo

  // Status
  isActive    Boolean  @default(true)

  // Relacionamentos
  models      VehicleModel[]

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
  @@index([fipeCode])
}

// ════════════════════════════════════════════════════════════════════════════
// MODELOS DE VEÍCULOS
// ════════════════════════════════════════════════════════════════════════════

model VehicleModel {
  id          String   @id @default(cuid())

  // Marca
  brandId     String
  brand       VehicleBrand @relation(fields: [brandId], references: [id])

  // Identificação
  fipeCode    String   @unique   // Código da FIPE (ex: "5223")
  name        String             // Nome do modelo (ex: "CG 160 TITAN")

  // Classificação
  category    VehicleCategory @default(STREET)
  engineSize  Int?             // Cilindrada em cc (ex: 160)

  // Status
  isActive    Boolean  @default(true)

  // Relacionamentos
  years       VehicleYear[]

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([brandId])
  @@index([name])
  @@index([category])
}

enum VehicleCategory {
  STREET      // Rua (CG, Factor, Fazer)
  SPORT       // Esportiva (CBR, Ninja)
  TRAIL       // Trail (XRE, Lander)
  OFFROAD     // Off-road (CRF, XTZ)
  SCOOTER     // Scooter (PCX, Biz, Nmax)
  CUSTOM      // Custom (Shadow, Boulevard)
  TOURING     // Touring (Goldwing)
  ADVENTURE   // Adventure (Africa Twin)
  UTILITY     // Utilitária (Cargo)
}

// ════════════════════════════════════════════════════════════════════════════
// ANO/VERSÃO DO VEÍCULO
// ════════════════════════════════════════════════════════════════════════════

model VehicleYear {
  id          String   @id @default(cuid())

  // Modelo
  modelId     String
  model       VehicleModel @relation(fields: [modelId], references: [id])

  // Ano
  year        Int            // Ano do modelo (ex: 2020)
  yearLabel   String         // Label (ex: "2020 Gasolina")
  fipeCode    String         // Código FIPE do ano (ex: "2020-1")

  // Combustível
  fuelType    FuelType @default(GASOLINE)

  // Relacionamentos
  compatibilities ProductCompatibility[]
  customerVehicles CustomerVehicle[]
  serviceOrders    ServiceOrder[]

  // Metadata
  createdAt   DateTime @default(now())

  @@unique([modelId, year, fuelType])
  @@index([modelId])
  @@index([year])
}

enum FuelType {
  GASOLINE  // Gasolina
  FLEX      // Flex
  ELECTRIC  // Elétrica
  DIESEL    // Diesel (para utilitárias)
}

// ════════════════════════════════════════════════════════════════════════════
// COMPATIBILIDADE PEÇA ↔ VEÍCULO
// ════════════════════════════════════════════════════════════════════════════

model ProductCompatibility {
  id             String   @id @default(cuid())

  // Produto (Peça)
  productId      String
  // product        Product  @relation(fields: [productId], references: [id])

  // Veículo (Ano específico)
  vehicleYearId  String
  vehicleYear    VehicleYear @relation(fields: [vehicleYearId], references: [id])

  // Verificação
  isVerified     Boolean  @default(false)   // Confirmado pelo lojista
  verifiedById   String?                    // Quem verificou

  // Notas
  notes          String?                    // Ex: "Requer adaptação"

  // Posição (para peças laterais)
  position       PartPosition?              // FRONT, REAR, LEFT, RIGHT

  // Metadata
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([productId, vehicleYearId])
  @@index([productId])
  @@index([vehicleYearId])
}

enum PartPosition {
  FRONT     // Dianteiro
  REAR      // Traseiro
  LEFT      // Esquerdo
  RIGHT     // Direito
  BOTH      // Ambos os lados
}

// ════════════════════════════════════════════════════════════════════════════
// VEÍCULOS DO CLIENTE
// ════════════════════════════════════════════════════════════════════════════

model CustomerVehicle {
  id             String   @id @default(cuid())

  // Cliente
  customerId     String
  // customer       Customer @relation(fields: [customerId], references: [id])

  // Veículo
  vehicleYearId  String
  vehicleYear    VehicleYear @relation(fields: [vehicleYearId], references: [id])

  // Identificação
  plate          String?     // Placa (ABC-1234)
  chassis        String?     // Chassi (últimos 8 dígitos)
  renavam        String?

  // Características
  color          String?     // Cor
  currentKm      Int?        // Quilometragem atual

  // Apelido
  nickname       String?     // Ex: "Moto do trabalho"

  // Status
  isActive       Boolean  @default(true)

  // Observações
  notes          String?

  // Relacionamentos
  serviceOrders  ServiceOrder[]

  // Metadata
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([customerId])
  @@index([plate])
}

// ════════════════════════════════════════════════════════════════════════════
// ORDENS DE SERVIÇO
// ════════════════════════════════════════════════════════════════════════════

model ServiceOrder {
  id              String   @id @default(cuid())

  // Número sequencial
  orderNumber     Int

  // Cliente e Veículo
  customerId      String
  // customer        Customer @relation(fields: [customerId], references: [id])

  customerVehicleId String
  customerVehicle   CustomerVehicle @relation(fields: [customerVehicleId], references: [id])

  // Veículo (referência direta para facilitar queries)
  vehicleYearId   String
  vehicleYear     VehicleYear @relation(fields: [vehicleYearId], references: [id])

  // KM no momento da OS
  vehicleKm       Int?

  // Diagnóstico
  symptoms        String?     // Sintomas/reclamação do cliente
  diagnosis       String?     // Diagnóstico do mecânico

  // Status
  status          ServiceOrderStatus @default(OPEN)

  // Funcionário responsável
  employeeId      String
  // employee        Employee @relation(fields: [employeeId], references: [id])

  // Valores
  laborCost       Float    @default(0)   // Total mão de obra
  partsCost       Float    @default(0)   // Total peças
  discount        Float    @default(0)   // Desconto
  total           Float    @default(0)   // Total final

  // Garantia
  warrantyDays    Int      @default(30)  // Dias de garantia
  warrantyUntil   DateTime?             // Data limite da garantia

  // Datas
  scheduledDate   DateTime?             // Data agendada
  startedAt       DateTime?             // Início do serviço
  completedAt     DateTime?             // Conclusão

  // Pagamento
  paymentMethod   String?
  isPaid          Boolean  @default(false)

  // Observações
  notes           String?
  internalNotes   String?  // Notas internas (não aparece pro cliente)

  // Itens
  items           ServiceOrderItem[]

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([customerId])
  @@index([customerVehicleId])
  @@index([status])
  @@index([createdAt])
  @@index([orderNumber])
}

enum ServiceOrderStatus {
  OPEN         // Aberta (aguardando)
  IN_PROGRESS  // Em andamento
  WAITING_PARTS // Aguardando peças
  COMPLETED    // Serviço concluído
  DELIVERED    // Entregue ao cliente
  CANCELED     // Cancelada
}

// ════════════════════════════════════════════════════════════════════════════
// ITENS DA ORDEM DE SERVIÇO
// ════════════════════════════════════════════════════════════════════════════

model ServiceOrderItem {
  id              String   @id @default(cuid())

  // Ordem de Serviço
  orderId         String
  order           ServiceOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Tipo do item
  itemType        ServiceItemType

  // Produto (se for peça)
  productId       String?
  // product         Product? @relation(fields: [productId], references: [id])

  // Descrição (para serviços ou peças sem cadastro)
  description     String

  // Valores
  quantity        Float
  unitPrice       Float
  discount        Float    @default(0)
  total           Float

  // Garantia específica do item
  warrantyDays    Int?

  // Metadata
  createdAt       DateTime @default(now())

  @@index([orderId])
  @@index([productId])
}

enum ServiceItemType {
  PART      // Peça
  SERVICE   // Serviço/Mão de obra
}

// ════════════════════════════════════════════════════════════════════════════
// SERVIÇOS PRÉ-CADASTRADOS
// ════════════════════════════════════════════════════════════════════════════

model Service {
  id          String   @id @default(cuid())

  // Identificação
  code        String   @unique   // Código do serviço (SVC-001)
  name        String             // Nome (ex: "Troca de óleo")
  description String?

  // Categoria
  categoryId  String?
  // category    Category? @relation(fields: [categoryId], references: [id])

  // Preço padrão
  defaultPrice Float

  // Tempo estimado (minutos)
  estimatedTime Int?

  // Garantia padrão (dias)
  defaultWarrantyDays Int @default(30)

  // Status
  isActive    Boolean  @default(true)

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
}

// ════════════════════════════════════════════════════════════════════════════
// RECLAMAÇÕES DE GARANTIA
// ════════════════════════════════════════════════════════════════════════════

model WarrantyClaim {
  id              String   @id @default(cuid())

  // Origem (pode ser de venda ou OS)
  sourceType      WarrantySourceType
  saleItemId      String?   // Se for de uma venda
  orderItemId     String?   // Se for de uma OS

  // Cliente
  customerId      String
  // customer        Customer @relation(fields: [customerId], references: [id])

  // Produto/Serviço
  productId       String?
  description     String    // Descrição do item

  // Reclamação
  reason          String    // Motivo da reclamação

  // Status
  status          WarrantyClaimStatus @default(OPEN)

  // Resolução
  resolution      String?   // Como foi resolvido
  resolvedById    String?   // Quem resolveu
  resolvedAt      DateTime?

  // Custos
  refundAmount    Float?
  replacementCost Float?

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([customerId])
  @@index([status])
}

enum WarrantySourceType {
  SALE           // Venda direta
  SERVICE_ORDER  // Ordem de serviço
}

enum WarrantyClaimStatus {
  OPEN           // Aberta
  IN_ANALYSIS    // Em análise
  APPROVED       // Aprovada
  DENIED         // Negada
  RESOLVED       // Resolvida
}
```

### Alterações em Tabelas Existentes

```prisma
// Adicionar ao modelo Product existente

model Product {
  // ... campos existentes ...

  // Novos campos para Motopeças
  oemCode           String?    // Código original do fabricante
  aftermarketCode   String?    // Código paralelo/aftermarket
  application       String?    // Aplicação textual (ex: "CG/Titan/Fan 2016-2024")

  // Relacionamentos novos
  compatibilities   ProductCompatibility[]
  serviceOrderItems ServiceOrderItem[]
}

// Adicionar ao modelo Customer existente (ou criar se não existir)

model Customer {
  id          String   @id @default(cuid())

  // Identificação
  name        String
  cpf         String?  @unique

  // Contato
  phone       String?
  phone2      String?
  email       String?

  // Endereço
  zipCode     String?
  street      String?
  number      String?
  complement  String?
  neighborhood String?
  city        String?
  state       String?

  // Status
  isActive    Boolean  @default(true)

  // Notas
  notes       String?

  // Relacionamentos
  vehicles       CustomerVehicle[]
  serviceOrders  ServiceOrder[]
  warrantyClaims WarrantyClaim[]

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
  @@index([cpf])
  @@index([phone])
}
```

---

## 📅 Fases de Implementação

### Fase 0: Preparação (1 semana)

| Task | Descrição                                         |
| ---- | ------------------------------------------------- |
| 0.1  | Criar sistema de perfis de negócio                |
| 0.2  | Implementar `FeatureGate` component               |
| 0.3  | Criar wizard de seleção de perfil no primeiro uso |
| 0.4  | Configurar toggle de features no settings         |

### Fase 1: Base de Veículos (2 semanas)

| Task | Descrição                                    |
| ---- | -------------------------------------------- |
| 1.1  | Criar migrations para tabelas de veículos    |
| 1.2  | Implementar script de importação da API FIPE |
| 1.3  | Criar tela de visualização de veículos       |
| 1.4  | Implementar busca/filtro de veículos         |
| 1.5  | Seed inicial com principais marcas/modelos   |

**Entregáveis:**

- [ ] ~100 marcas de motos importadas
- [ ] ~5.000 modelos importados
- [ ] ~50.000 combinações ano/modelo

### Fase 2: Compatibilidade de Peças (2 semanas)

| Task | Descrição                                            |
| ---- | ---------------------------------------------------- |
| 2.1  | Adicionar campos de motopeças no cadastro de produto |
| 2.2  | Criar interface de vinculação peça ↔ veículo         |
| 2.3  | Implementar seleção múltipla de anos                 |
| 2.4  | Criar busca de peças por veículo no PDV              |
| 2.5  | Implementar sugestões de compatibilidade             |

**Entregáveis:**

- [ ] Cadastro de peça com compatibilidade
- [ ] Busca por veículo no PDV
- [ ] Filtro de peças compatíveis

### Fase 3: Clientes e Veículos (1 semana)

| Task | Descrição                                   |
| ---- | ------------------------------------------- |
| 3.1  | Criar/expandir modelo de Customer           |
| 3.2  | Implementar cadastro de veículos do cliente |
| 3.3  | Criar tela de histórico do veículo          |
| 3.4  | Vincular vendas ao veículo do cliente       |

### Fase 4: Ordens de Serviço (3 semanas)

| Task | Descrição                              |
| ---- | -------------------------------------- |
| 4.1  | Criar migrations para OS               |
| 4.2  | Implementar CRUD de ordens de serviço  |
| 4.3  | Criar fluxo de status da OS            |
| 4.4  | Implementar adição de peças e serviços |
| 4.5  | Integrar baixa de estoque automática   |
| 4.6  | Criar impressão de OS                  |
| 4.7  | Implementar finalização + cobrança     |

**Entregáveis:**

- [ ] Criação de OS
- [ ] Adição de itens (peças/serviços)
- [ ] Fluxo de status
- [ ] Impressão de OS
- [ ] Integração com caixa

### Fase 5: Garantias (1 semana)

| Task | Descrição                          |
| ---- | ---------------------------------- |
| 5.1  | Criar modelo de garantias          |
| 5.2  | Implementar abertura de reclamação |
| 5.3  | Criar fluxo de análise/resolução   |
| 5.4  | Alertas de garantia vencendo       |

### Fase 6: Relatórios Específicos (1 semana)

| Task | Descrição                               |
| ---- | --------------------------------------- |
| 6.1  | Relatório de vendas por veículo/modelo  |
| 6.2  | Relatório de ordens de serviço          |
| 6.3  | Relatório de garantias                  |
| 6.4  | Ranking de peças mais vendidas por moto |
| 6.5  | Histórico de clientes/veículos          |

### Fase 7: Polimento e Testes (2 semanas)

| Task | Descrição                           |
| ---- | ----------------------------------- |
| 7.1  | Testes E2E do fluxo motopeças       |
| 7.2  | Otimização de performance           |
| 7.3  | Ajustes de UX baseados em feedback  |
| 7.4  | Documentação para usuário final     |
| 7.5  | Feature flag para liberação gradual |

---

## ⏱️ Estimativa de Esforço

### Resumo por Fase

| Fase                   | Duração   | Complexidade |
| ---------------------- | --------- | ------------ |
| 0. Preparação (Perfis) | 1 semana  | Média        |
| 1. Base de Veículos    | 2 semanas | Média        |
| 2. Compatibilidade     | 2 semanas | Alta         |
| 3. Clientes/Veículos   | 1 semana  | Baixa        |
| 4. Ordens de Serviço   | 3 semanas | Alta         |
| 5. Garantias           | 1 semana  | Média        |
| 6. Relatórios          | 1 semana  | Média        |
| 7. Polimento           | 2 semanas | Média        |

### Total

```
┌────────────────────────────────────────────────────────────┐
│                 ESTIMATIVA TOTAL                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Tempo total:       13 semanas (~3 meses)                 │
│                                                            │
│  Desenvolvedor(es): 1-2 desenvolvedores full-stack        │
│                                                            │
│  Novas telas:       ~15 telas/modais                      │
│                                                            │
│  Novas tabelas:     ~12 tabelas no banco                  │
│                                                            │
│  Componentes novos: ~25 componentes React                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 Resumo Executivo

### O Que Será Entregue

1. **Sistema de Perfis** - Mesma base, comportamentos diferentes
2. **Banco de Motos** - 100+ marcas, 5000+ modelos via FIPE
3. **Compatibilidade** - Peça ↔ Veículo(s) N:M
4. **Clientes com Motos** - Histórico completo por veículo
5. **Ordens de Serviço** - Mecânica completa
6. **Garantias** - Controle de reclamações
7. **Relatórios** - Específicos para motopeças

### Benefícios

| Para o Produto          | Para o Cliente        |
| ----------------------- | --------------------- |
| Ampliação de mercado    | Busca por moto/modelo |
| Novo segmento           | Histórico do veículo  |
| Diferencial competitivo | Ordens de serviço     |
| Upsell/Cross-sell       | Controle de garantia  |

### Próximos Passos

1. ✅ Aprovar roadmap
2. ⏳ Criar Fase 0 (perfis de negócio)
3. ⏳ Importar base FIPE
4. ⏳ Desenvolver features específicas

---

> **Nota:** Esta expansão transforma o GIRO em uma plataforma **multi-segmento**, abrindo portas para outros verticais no futuro (Pet Shop, Autopeças, Material de Construção, etc).
