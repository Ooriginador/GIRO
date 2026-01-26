# GIRO — Overview Refinado

> **Versão:** 2.0.0  
> **Status:** Aprovado  
> **Última Atualização:** 25 de Janeiro de 2026

Objetivo: consolidar e polir a visão arquitetural do ecossistema GIRO, aprofundar as camadas técnicas, aumentar a acessibilidade e definir a matriz de integrações para implementação e auditoria.

---

## 🌐 Ecossistema GIRO

O GIRO evoluiu de um único produto para um **ecossistema de aplicações** servindo diferentes segmentos de mercado, compartilhando código e infraestrutura comum.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ECOSSISTEMA GIRO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │   GIRO Desktop  │    │ GIRO Enterprise │    │   GIRO Mobile   │        │
│   │     (Varejo)    │    │  (Almoxarifado) │    │   (Inventário)  │        │
│   │                 │    │                 │    │                 │        │
│   │ • Mercearias    │    │ • Construtoras  │    │ • Scanner PWA   │        │
│   │ • Motopeças     │    │ • Indústrias    │    │ • Contagem      │        │
│   │ • Varejo Geral  │    │ • EPC/Obras     │    │ • Sync Local    │        │
│   │                 │    │                 │    │                 │        │
│   │ R$ 99,90/caixa  │    │ R$ 199,90/user  │    │   Incluído      │        │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│            │                      │                      │                 │
│            └──────────────────────┼──────────────────────┘                 │
│                                   │                                        │
│                                   ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │                     PACKAGES COMPARTILHADOS                        │   │
│   │                                                                    │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│   │  │ database │  │    ui    │  │   core   │  │  config  │          │   │
│   │  │ (Prisma) │  │(Shadcn)  │  │ (Hooks)  │  │ (Types)  │          │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │   │
│   │                                                                    │   │
│   └───────────────────────────────────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │                      INFRAESTRUTURA CLOUD                          │   │
│   │                                                                    │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│   │  │   License    │  │  Dashboard   │  │   Website    │            │   │
│   │  │    Server    │  │   (Owner)    │  │  (Landing)   │            │   │
│   │  └──────────────┘  └──────────────┘  └──────────────┘            │   │
│   │                                                                    │   │
│   └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Produtos do Ecossistema

| Produto             | Segmento     | Descrição                            | Status             |
| ------------------- | ------------ | ------------------------------------ | ------------------ |
| **GIRO Desktop**    | Varejo       | PDV, estoque, validade, funcionários | ✅ Produção        |
| **GIRO Enterprise** | Industrial   | Almoxarifado, contratos, requisições | 🔄 Desenvolvimento |
| **GIRO Mobile**     | Complementar | Scanner PWA, inventário offline      | ✅ Produção        |
| **License Server**  | Infra        | Licenciamento, métricas              | ✅ Produção        |
| **Dashboard**       | Admin        | Painel do proprietário               | ✅ Produção        |

---

**Resumo Técnico**

- **Escopo:** Monorepo com múltiplas apps Tauri (React + Rust), offline-first, sincronização segura com serviços cloud.
- **Arquitetura:** Packages compartilhados + Apps especializadas por segmento.
- **Foco deste documento:** aprofundar camadas internas (presentation, application, backend, data, hardware), acessibilidade (WCAG) e integração completa (IPC, WebSocket, Backup, Licenciamento).

**Relação com outros documentos**

- Arquitetura detalhada: [01-ARQUITETURA.md](01-ARQUITETURA.md)
- Schema do banco: [02-DATABASE-SCHEMA.md](02-DATABASE-SCHEMA.md)
- Features e requisitos: [03-FEATURES-CORE.md](03-FEATURES-CORE.md)
- Modelo de negócio: [04-BUSINESS-MODEL.md](04-BUSINESS-MODEL.md)
- **Módulo Enterprise: [05-ENTERPRISE-MODULE.md](05-ENTERPRISE-MODULE.md)** ← NOVO

---

## 🔧 Visão High-Level (resumida)

- **Frontend (Renderer):** React + TypeScript + Tailwind (UI acessível).
- **Bridge:** Tauri IPC (commands/events) — limite superfície pública, validar tipos.
- **Backend:** Rust (serviços, repositórios, drivers de hardware).
- **DB local:** SQLite (migrations via Prisma, queries runtime com SQLx).
- **Integrações:** Google Drive backup, License Server (ativação/sync), Mobile Scanner (WebSocket local), Impressora/Balança (Serial/USB/HID).

### Diferenças por Produto

| Aspecto               | GIRO Desktop                 | GIRO Enterprise                |
| --------------------- | ---------------------------- | ------------------------------ |
| **Foco**              | PDV, vendas rápidas          | Requisições, controle de custo |
| **Caixa**             | ✅ Central                   | ❌ Não aplicável               |
| **Contratos**         | ❌ N/A                       | ✅ Gestão completa             |
| **Multi-localização** | ❌ Local único               | ✅ Central + Obras             |
| **Hardware**          | Impressora, balança, scanner | Scanner, impressora            |
| **Workflow**          | Venda direta                 | Aprovação hierárquica          |

---

**Refinamento por Camada**

**Presentation Layer**

- Arquitetura: dividir em `Shell` (layout, nav) + `PDV` + `Produtos` + `Estoque` + `Config`.
- Pattern: Server Components (onde aplicável) + Client Components isolados (`use client`) para interações.
- Acessibilidade: seguir WCAG 2.1 AA — checklist mínimo:
  - Todos os controles com roles e labels acessíveis (ARIA).
  - Keyboard-first: navegação por tab, atalhos configuráveis (F1-F12), e foco visível.
  - Suporte a tamanhos de fonte escaláveis e tema de alto contraste.
  - Testes automáticos com axe-core e Storybook + a11y.
- Performance: virtualized lists (PDV, produtos), debounce em buscas, evitar re-renders caros.

**Application Layer (Renderer ↔ Bridge)**

- IPC surface: definir um contrato tipado (Rust <> TypeScript) usando JSON schema / Zod gerado.
- Commands: idempotentes e com timeouts; Responses: envelope { ok, error, code }.
- State: TanStack Query para dados remotos/sincronizados, Zustand para UI ephemeral.
- Errors: mapeamento centralizado com user-friendly messages e logs estruturados (Sentry opcional, local logs rotativos).

**Bridge / Tauri Layer**

- Encapsular todos os invocables em módulos `commands/*` com validação de entrada (Serde) e documentação.
- Segurança: não expor APIs de FS sem autorização; whitelisting por comando.
- Telemetria mínima (opcional): contadores agregados para dashboard (respeitar privacidade).

**Backend Layer (Rust Services)**

- Estrutura recomendada:
  - `services/` (domínio: vendas, estoque, vendas-print)
  - `repositories/` (acesso a SQLx + transações)
  - `drivers/` (impressora, balança, leitor barcode)
  - `integrations/` (drive backup, license client, websocket gateway)
  - `app.rs` (glue + orchestrator)
- Transações: todas as operações que alteram estoque e venda devem usar transação ACID única no SQLite via SQLx (BEGIN/COMMIT/ROLLBACK).
- Concurrency: reduzir escopo da transação; usar retry/backoff para contendas de DB.

**Data Layer**

- Prisma: manter schema como source-of-truth e gerar migrations; usar `prisma format` e revisão em PR.
- SQLx: queries críticas (vendas, estoque) em arquivos `.sql` com macros para verificação em compile-time.
- Backups: estratégia local + criptografia antes de upload para Google Drive; manter rolling backups (7 dias) e checksum.

**Hardware Layer**

- Driver abstraction: interface unificada `HardwarePort` com implementações `SerialPortDriver`, `UsbHidDriver`, `NetworkPrinterDriver`.
- Test harness: simulador de hardware para CI (mock serial inputs, fake printer outputs).
- Safety: timeouts, reconexões, saneamentos de input (tare, sinais não-UTF8), fallback manual.

**Integrações e Contratos**

- License Server: contrato minimalista HTTPs — endpoints: `/activate`, `/validate`, `/transfer`, `/metrics`.
  - Ativação inicial: online required; validação periódica: 24h (grace 7d).
- Mobile Scanner: WebSocket local (wss? no — ws em rede local) — autenticar por token temporário exibido via QR.
  - Mensagens: JSON { type: 'scan', barcode, ts, deviceId }.
- Backup: job assíncrono que gera `db_backup_{ts}.sqlite.enc` and uploads signed manifest.

**Acessibilidade & Internacionalização**

- i18n: extração de strings via i18next/formatjs; suporte inicial PT-BR + EN.
- Accessibility tokens: garantir leitura de campos sensíveis (CPFs) por padrão apenas no modo admin e com máscara.
- Keyboard shortcuts: configurável por usuário e exportável/importável.

**Segurança, Privacidade e Compliance**

- Minimizar PII sincronizado; enviar apenas métricas agregadas para dashboard.
- Criptografia: backups com AES-256 e assinatura HMAC-SHA256 do manifest.
- Secrets: nunca commitar chaves; usar env vars locais e vault durante CI/CD.

**Testes, QA e Observabilidade**

- Test matrix:
  - Unit: services + drivers (Rust) e components (React).
  - Integration: DB transactions, IPC contracts, hardware mocks.
  - E2E: fluxo PDV completo (Playwright / desktop runner), incl. impressão mock.
  - Accessibility: axe-core CI step and Storybook a11y.
- CI: lint, typecheck, build (Tauri dev bundle), run unit tests, axe checks, run prisma migrate status.

**Plano de Refinamento e Implementação (Fases)**

1. Discovery & Contratos (1 week)
   - Gerar OpenAPI minimal para License Server.
   - Definir IPC schema (Zod/Serde) e exemplos.
2. Core Backend Hardening (2 weeks)
   - Implementar drivers e abstrações, transações ACID, hardware simulator.
3. Frontend A11y & Performance (2 weeks)
   - Storybook + a11y tests, virtualized lists, keyboard navigation.
4. Integrations & Backup (1 week)
   - Backup encryption, Google Drive uploader, License flow tests.
5. QA, E2E, Release (1 week)
   - Run full e2e, accessibility sweep, sign-off.

**Checklist para Auditoria Técnica (mínimo)**

- [ ] IPC schemas tipados e versionados
- [ ] Queries críticas verificadas pelo SQLx
- [ ] Transações atomicas para vendas/estoque
- [ ] Backups criptografados e validados
- [ ] Simulador de hardware para CI
- [ ] Storybook com testes a11y automatizados
- [ ] Política de privacidade documentada para sync

**Próximos passos imediatos (posso executar agora)**

- Gerar um primeiro rascunho de OpenAPI para o License Server.
- Criar o contrato tipado IPC (Zod + Serde) e exemplo de código em `renderer` e `rust`.

Quer que eu comece por gerar o OpenAPI do License Server ou pelo contrato IPC tipado?

# 📋 Mercearias - Visão Geral do Produto

> **Versão:** 1.0.0  
> **Status:** Planejamento  
> **Última Atualização:** 7 de Janeiro de 2026

---

## 🎯 O Que É

**Mercearias** é um sistema profissional completo de gestão para pequenos e médios estabelecimentos comerciais do varejo alimentício brasileiro. Desenvolvido como uma aplicação desktop nativa para Windows, oferece controle total de operações de PDV (Ponto de Venda), gestão de estoque, controle de validade, gestão de funcionários e relatórios gerenciais.

### Proposta de Valor

> _"Gestão profissional ao alcance do pequeno comerciante brasileiro"_

O sistema combina a robustez de soluções enterprise com a simplicidade necessária para operadores de caixa e proprietários de mercearias, padarias, minimercados e pequenos supermercados.

---

## 👥 Público-Alvo

### Perfil Primário: Proprietários de Pequenos Varejos

| Característica      | Descrição                                                      |
| ------------------- | -------------------------------------------------------------- |
| **Tipo de Negócio** | Mercearias, minimercados, padarias, açougues, hortifrútis      |
| **Faturamento**     | R$ 10.000 a R$ 500.000/mês                                     |
| **Funcionários**    | 1 a 15 colaboradores                                           |
| **Localização**     | Bairros, vilas, cidades do interior                            |
| **Tecnologia**      | Familiaridade básica com computadores                          |
| **Dor Principal**   | Perda de produtos por vencimento, falta de controle financeiro |

### Perfil Secundário: Operadores de Caixa

| Característica       | Descrição                            |
| -------------------- | ------------------------------------ |
| **Idade**            | 18 a 50 anos                         |
| **Escolaridade**     | Ensino médio                         |
| **Experiência Tech** | Básica (smartphone, redes sociais)   |
| **Necessidade**      | Interface simples, rápida, sem erros |

---

## 🌍 Análise de Mercado

### Tamanho do Mercado

| Métrica                        | Valor                                |
| ------------------------------ | ------------------------------------ |
| **Pequenos Varejos no Brasil** | ~1.2 milhões de estabelecimentos     |
| **Mercado de Software PDV**    | R$ 2.5 bilhões/ano (2025)            |
| **Crescimento Anual**          | 8-12%                                |
| **Taxa de Digitalização**      | Apenas 35% utilizam sistemas formais |

### Concorrência

| Concorrente   | Modelo     | Preço Mensal | Pontos Fracos                       |
| ------------- | ---------- | ------------ | ----------------------------------- |
| **MarketUP**  | SaaS Cloud | R$ 79-299    | Depende de internet, lento offline  |
| **Hiper**     | SaaS Cloud | R$ 99-399    | Complexo para pequenos comerciantes |
| **Siscomex**  | Desktop    | R$ 150-500   | Interface ultrapassada, UX ruim     |
| **ContaAzul** | SaaS Cloud | R$ 119-399   | Foco em serviços, não varejo        |
| **Bling**     | SaaS Cloud | R$ 75-300    | Genérico, pouca customização        |

### Oportunidades Identificadas

1. **65% dos pequenos varejos** ainda operam sem sistema ou com planilhas
2. **Conexão instável** em muitas regiões torna SaaS cloud problemático
3. **Custo mensal** de assinaturas é barreira para adoção
4. **Integração com hardware** (balanças, impressoras) é complexa nos concorrentes

---

## ⭐ Diferenciais Competitivos

### 1. 🖥️ Aplicação Desktop Nativa

| Benefício                       | Impacto                        |
| ------------------------------- | ------------------------------ |
| **Funciona 100% offline**       | Nunca para, mesmo sem internet |
| **Performance máxima**          | Resposta instantânea no caixa  |
| **Sem mensalidade de servidor** | Economia para o comerciante    |
| **Backup em nuvem opcional**    | Segurança com Google Drive     |

### 2. 📱 Scanner Mobile (Celular como Leitor)

Tecnologia inovadora que permite usar o celular do operador como leitor de código de barras, eliminando:

- Custo de leitoras dedicadas (R$ 200-800 cada)
- Cabos e configurações complexas
- Manutenção de hardware adicional

**Tecnologia:** WebSocket local + App PWA + Camera API

### 3. 🔌 Plug & Play de Hardware

Integração nativa com equipamentos mais usados no Brasil:

| Tipo            | Fabricantes                            | Protocolo            |
| --------------- | -------------------------------------- | -------------------- |
| **Impressoras** | Epson, Elgin, Bematech, Daruma, Gertec | ESC/POS              |
| **Balanças**    | Toledo, Filizola, Urano, Elgin         | Serial/USB           |
| **Leitoras**    | Honeywell, Zebra, Elgin, Bematech      | HID/Serial           |
| **Gavetas**     | Genéricas                              | Pulso via impressora |

### 4. 🚨 Sistema de Alertas Inteligente

| Alerta                 | Descrição                              |
| ---------------------- | -------------------------------------- |
| **Vencimento Crítico** | Produtos vencendo em 3, 7, 15, 30 dias |
| **Estoque Baixo**      | Atingiu quantidade mínima configurada  |
| **Estoque Zerado**     | Produto indisponível para venda        |
| **Produtos Parados**   | Sem movimentação em X dias             |
| **Margem Negativa**    | Preço de venda menor que custo         |

### 5. 📊 Relatórios Acionáveis

| Relatório                 | Decisão que Permite         |
| ------------------------- | --------------------------- |
| **Top 20 Mais Vendidos**  | Nunca deixar faltar         |
| **Top 20 Menos Vendidos** | Promoções ou descontinuar   |
| **Curva ABC**             | Foco nos 20% que geram 80%  |
| **Giro de Estoque**       | Otimizar capital de giro    |
| **Histórico de Preços**   | Negociar com fornecedores   |
| **DRE Simplificado**      | Saúde financeira do negócio |

### 6. ⚡ Cadastro Express (3 Cliques)

Cadastro rápido de produtos com:

- **Auto-complete** de dados via código de barras (base COSMOS/GTIN)
- **Sugestão de categoria** por machine learning local
- **Duplicação de produto similar** com ajustes
- **Import de planilha** do fornecedor

---

## 🏗️ Escopo da Versão 1.0

### ✅ Incluído (MVP)

| Módulo            | Funcionalidades Principais                       |
| ----------------- | ------------------------------------------------ |
| **PDV/Caixa**     | Venda rápida, busca inteligente, scanner, gaveta |
| **Produtos**      | Cadastro, categorias, códigos de barras, preços  |
| **Estoque**       | Entradas, saídas, inventário, alertas            |
| **Validade**      | Controle FIFO, alertas de vencimento             |
| **Funcionários**  | Cadastro básico, controle de acesso, logs        |
| **Caixa**         | Abertura, fechamento, sangria, suprimento        |
| **Relatórios**    | Vendas, estoque, produtos, financeiro básico     |
| **Configurações** | Empresa, impressora, balança, tema (dark/light)  |
| **Backup**        | Google Drive automático                          |

### ❌ Não Incluído (Versões Futuras)

| Funcionalidade           | Versão Planejada |
| ------------------------ | ---------------- |
| NFC-e / NF-e             | 2.0              |
| Integração TEF (cartões) | 2.0              |
| Multi-loja               | 2.5              |
| E-commerce sync          | 3.0              |
| App mobile gerencial     | 2.0              |
| Contas a pagar/receber   | 1.5              |
| Fidelidade/Cashback      | 2.5              |

---

## 📈 Métricas de Sucesso

### KPIs do Produto

| Métrica             | Meta v1.0         | Meta v2.0         |
| ------------------- | ----------------- | ----------------- |
| **Tempo de venda**  | < 5 segundos/item | < 3 segundos/item |
| **Uptime offline**  | 99.9%             | 99.99%            |
| **Crash rate**      | < 0.1%            | < 0.01%           |
| **Onboarding time** | < 30 minutos      | < 15 minutos      |
| **NPS usuários**    | > 50              | > 70              |

### KPIs de Negócio (Clientes)

| Métrica                       | Benchmark | Com Mercearias |
| ----------------------------- | --------- | -------------- |
| **Perda por vencimento**      | 3-5%      | < 1%           |
| **Ruptura de estoque**        | 15-20%    | < 5%           |
| **Tempo de fechamento caixa** | 30+ min   | < 10 min       |
| **Acuracidade de estoque**    | 70%       | > 95%          |

---

## 🛣️ Roadmap de Alto Nível

````text
Q1 2026: MVP Desktop + Caixa + Estoque + Validade
         ├── Instalador Windows
         ├── Impressora térmica
         └── Scanner USB/mobile

Q2 2026: Relatórios + Backup Cloud + Multi-usuário
         ├── Dashboard gerencial
         ├── Google Drive sync
         └── Perfis de acesso

Q3 2026: NFC-e + TEF + App Mobile
         ├── Emissão fiscal
         ├── Cartão crédito/débito
         └── App consulta gerencial

Q4 2026: Multi-loja + Franquias
         ├── Sincronização lojas
         ├── Dashboard consolidado
         └── Gestão de franquias
```text
---

## 💰 Modelo de Monetização (Planejado)

| Plano                | Preço      | Inclui                                    |
| -------------------- | ---------- | ----------------------------------------- |
| **Starter**          | R$ 49/mês  | 1 caixa, 500 produtos, backup básico      |
| **Pro**              | R$ 99/mês  | 3 caixas, ilimitado, relatórios avançados |
| **Enterprise**       | R$ 199/mês | Multi-loja, API, suporte prioritário      |
| **Licença Perpétua** | R$ 1.997   | Sem mensalidade, atualizações 1 ano       |

---

## 📞 Requisitos de Infraestrutura

### Hardware Mínimo (Cliente)

| Componente      | Mínimo         | Recomendado       |
| --------------- | -------------- | ----------------- |
| **Processador** | Dual Core 2GHz | Quad Core 2.5GHz  |
| **RAM**         | 4GB            | 8GB               |
| **Disco**       | 500MB livre    | 2GB SSD           |
| **Tela**        | 1024x768       | 1366x768 ou maior |
| **OS**          | Windows 10     | Windows 11        |

### Periféricos Suportados

| Tipo            | Modelos Homologados                                       |
| --------------- | --------------------------------------------------------- |
| **Impressoras** | Epson TM-T20X, TM-T88V, Elgin i9, i7, Bematech MP-4200 TH |
| **Balanças**    | Toledo Prix 3, Prix 4, Filizola CS15, Elgin DP            |
| **Leitoras**    | Honeywell Voyager 1250g, Elgin EL250, Bematech S-500      |

---

_Documento gerado seguindo metodologia "Architect First, Code Later" - Arkheion Corp_
````
