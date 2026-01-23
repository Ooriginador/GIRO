# 📊 Relatório Completo: GIRO License Server + GIRO Desktop

> **Data:** 11 de Janeiro de 2026  
> **Versão:** 1.0  
> **Autor:** Arkheion Corp - Análise Técnica

---

## 📋 Sumário Executivo

Este relatório apresenta uma análise completa dos dois projetos:
1. **GIRO License Server** - Sistema de licenciamento em Rust/Axum
2. **GIRO Desktop** - Aplicação PDV em Tauri/React

---

## 🔍 1. Status Atual dos Projetos

### 1.1 GIRO License Server

| Componente | Status | Descrição |
|------------|--------|-----------|
| **Backend API (Rust)** | ✅ Implementado | Axum 0.7, SQLx, PostgreSQL |
| **Dashboard (Next.js)** | ✅ Implementado | React 18, TailwindCSS, Radix UI |
| **Autenticação JWT** | ✅ Implementado | Login, Register, Refresh Tokens |
| **Gestão de Licenças** | ✅ Implementado | CRUD completo |
| **Hardware Binding** | ✅ Implementado | SHA256 fingerprint |
| **Validação de Licenças** | ✅ Implementado | Endpoint Desktop |
| **Transferência** | ✅ Implementado | Reset de hardware |
| **Métricas/Sync** | ✅ Implementado | Agregação de dados |
| **Pagamentos (Stripe)** | ⏳ Pendente | Mock implementado |
| **API Keys** | ✅ Implementado | Para Desktop |

### 1.2 GIRO Desktop

| Componente | Status | Descrição |
|------------|--------|-----------|
| **Core Tauri** | ✅ Implementado | Rust backend |
| **Frontend React** | ✅ Implementado | TypeScript, TailwindCSS |
| **PDV** | ✅ Implementado | Vendas, busca, scanner |
| **Estoque** | ✅ Implementado | Entrada, saída, alertas |
| **Relatórios** | ✅ Implementado | Analytics |
| **Hardware Integration** | ✅ Implementado | Impressoras, balanças |
| **Integração com License Server** | ⚠️ Parcial | Precisa validação |

---

## 🔐 2. Sistema de Licenças Atual

### 2.1 Tipos de Plano (plan_type)

```rust
pub enum PlanType {
    Monthly,     // 30 dias  - R$ 99,90
    Semiannual,  // 180 dias - R$ 599,40 (14% off)
    Annual,      // 365 dias - R$ 999,00 (17% off)
}
```

### 2.2 Status da Licença (license_status)

```rust
pub enum LicenseStatus {
    Pending,    // Criada, aguardando ativação
    Active,     // Ativada e funcionando
    Expired,    // Expirada por falta de pagamento
    Suspended,  // Suspensa manualmente
    Revoked,    // Revogada permanentemente
}
```

### 2.3 Fluxo de Ativação

```
1. Admin cria licença (status: pending)
2. Desktop envia: license_key + hardware_id
3. Server valida e registra hardware
4. Licença ativada (status: active, expires_at calculado)
5. Desktop valida a cada inicialização
```

### 2.4 Hardware Binding

```
Hardware ID = SHA256(CPU_ID + MOTHERBOARD_SERIAL + MAC_ADDRESS + DISK_SERIAL)
```

### 2.5 Proteções Anti-Fraude

| Proteção | Implementação |
|----------|---------------|
| **Time Drift** | ✅ Validação com tolerância de 5 min |
| **Hardware Clone** | ✅ Detecta conflito de fingerprint |
| **Offline Abuse** | ✅ Grace period de 7 dias |
| **License Sharing** | ✅ Invalida ativação anterior |

---

## 🆕 3. Proposta: Licença Vitalícia

### 3.1 Alterações Necessárias

#### a) Enum PlanType (backend/src/models/license.rs)

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "plan_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum PlanType {
    Monthly,     // 30 dias
    Semiannual,  // 180 dias
    Annual,      // 365 dias
    Lifetime,    // ∞ (vitalícia) <-- NOVO
}

impl PlanType {
    pub fn days(&self) -> i64 {
        match self {
            PlanType::Monthly => 30,
            PlanType::Semiannual => 180,
            PlanType::Annual => 365,
            PlanType::Lifetime => 36500, // ~100 anos (efetivamente vitalício)
        }
    }

    pub fn price_cents(&self) -> i64 {
        match self {
            PlanType::Monthly => 9990,      // R$ 99,90
            PlanType::Semiannual => 59940,  // R$ 599,40
            PlanType::Annual => 99900,      // R$ 999,00
            PlanType::Lifetime => 199900,   // R$ 1.999,00 (sugestão)
        }
    }
}
```

#### b) Migration SQL

```sql
-- Migration: add_lifetime_plan_type
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'lifetime';
```

#### c) Lógica de Expiração

```rust
// No license_service.rs, função activate()
let expires_at = if license.plan_type == PlanType::Lifetime {
    None // Nunca expira - ou usar data muito futura
} else {
    Some(Utc::now() + Duration::days(license.plan_type.days()))
};
```

### 3.2 Precificação Sugerida

| Plano | Preço | Economia | Equivalência |
|-------|-------|----------|--------------|
| **Mensal** | R$ 99,90 | - | - |
| **Semestral** | R$ 599,40 | 14% | 6 meses |
| **Anual** | R$ 999,00 | 17% | 12 meses |
| **Vitalício** | R$ 1.999,00 | - | ~20 meses |

> **Nota:** O preço vitalício equivale a ~20 meses de mensalidade. Após esse período, o cliente está "lucrando".

### 3.3 Considerações de Negócio

| Aspecto | Análise |
|---------|---------|
| **Vantagem para cliente** | Pagamento único, sem preocupação |
| **Vantagem para empresa** | Receita upfront, cash flow imediato |
| **Desvantagem** | Perde recorrência de longo prazo |
| **Recomendação** | Oferecer apenas em promoções especiais |

---

## 🛒 4. Página de Cadastro, Compra e Download

### 4.1 Estrutura Proposta

```
/landing (site público)
├── / (home - benefícios do GIRO)
├── /precos (tabela de preços)
├── /cadastro (registro de conta)
├── /checkout (pagamento Stripe)
├── /download (downloads após compra)
└── /suporte (FAQ e contato)
```

### 4.2 Fluxo do Usuário

```
┌──────────────────────────────────────────────────────────────────────┐
│                        JORNADA DO CLIENTE                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. DESCOBERTA                                                        │
│     ┌─────────────────┐                                              │
│     │   Landing Page  │  ─► Benefícios, screenshots, vídeos          │
│     │   (site público)│                                              │
│     └────────┬────────┘                                              │
│              │                                                        │
│  2. INTERESSE                                                         │
│              ▼                                                        │
│     ┌─────────────────┐                                              │
│     │     /precos     │  ─► Tabela com planos, CTA "Começar"         │
│     │                 │     Mensal | Semestral | Anual | Vitalício   │
│     └────────┬────────┘                                              │
│              │                                                        │
│  3. CADASTRO                                                          │
│              ▼                                                        │
│     ┌─────────────────┐                                              │
│     │    /cadastro    │  ─► Nome, Email, Empresa, Senha              │
│     │                 │     Aceite de termos                         │
│     └────────┬────────┘                                              │
│              │                                                        │
│  4. PAGAMENTO                                                         │
│              ▼                                                        │
│     ┌─────────────────┐                                              │
│     │    /checkout    │  ─► Stripe Checkout (cartão, boleto, Pix)    │
│     │                 │     Seleção de quantidade de licenças        │
│     └────────┬────────┘                                              │
│              │                                                        │
│  5. CONFIRMAÇÃO                                                       │
│              ▼                                                        │
│     ┌─────────────────┐                                              │
│     │    /sucesso     │  ─► Licença(s) gerada(s) automaticamente     │
│     │                 │     Exibe chave(s) + botão download          │
│     └────────┬────────┘                                              │
│              │                                                        │
│  6. DOWNLOAD                                                          │
│              ▼                                                        │
│     ┌─────────────────┐                                              │
│     │    /download    │  ─► Escolher Windows/Linux                   │
│     │                 │     Instruções de instalação                 │
│     │                 │     Link para ativação                       │
│     └────────┬────────┘                                              │
│              │                                                        │
│  7. INSTALAÇÃO & ATIVAÇÃO                                             │
│              ▼                                                        │
│     ┌─────────────────┐                                              │
│     │  GIRO Desktop   │  ─► Instala, insere chave, ativado!         │
│     │                 │                                              │
│     └─────────────────┘                                              │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 Componentes Necessários

| Página | Componentes | Integrações |
|--------|-------------|-------------|
| **Landing** | Hero, Features, Testimonials, Pricing | - |
| **Preços** | PricingCards, FAQ, CTA | - |
| **Cadastro** | RegisterForm, Validation | API /auth/register |
| **Checkout** | StripeElements, PlanSelector | Stripe API |
| **Sucesso** | LicenseDisplay, CopyButton | API /licenses |
| **Download** | DownloadButtons, Instructions | GitHub Releases |

### 4.4 Arquivos de Download

| Plataforma | Formato | Tamanho Estimado |
|------------|---------|------------------|
| **Windows** | .msi | ~80 MB |
| **Windows** | .exe (NSIS) | ~75 MB |
| **Linux** | .deb | ~70 MB |
| **Linux** | .AppImage | ~85 MB |
| **Linux** | .rpm | ~70 MB |

---

## 💰 5. Questões Fiscais e Custos

### 5.1 Tipos de Nota Fiscal para Software

| Tipo | Descrição | Quando Usar |
|------|-----------|-------------|
| **NF-e (Produto)** | Nota Fiscal Eletrônica | Venda de software "de prateleira" (download) |
| **NFS-e (Serviço)** | Nota Fiscal de Serviço | SaaS, assinatura mensal, customização |
| **Nota de Licença** | Cessão de uso | Licenciamento perpétuo |

### 5.2 GIRO se enquadra em qual?

O GIRO é um **software vendido por licença de uso**, podendo ser enquadrado como:

| Modelo | Enquadramento | Imposto |
|--------|---------------|---------|
| **Mensal/Anual** | NFS-e (Serviço) | ISS (2-5% do município) |
| **Vitalício** | NF-e ou NFS-e | ISS ou ICMS (depende do estado) |

### 5.3 Custos para o Desenvolvedor

#### a) Custos Fixos

| Item | Custo Mensal | Observação |
|------|--------------|------------|
| **MEI** | R$ 76,90 (2026) | Limite: R$ 81.000/ano |
| **ME (Simples)** | ~6% do faturamento | Limite: R$ 4.8M/ano |
| **Contador** | R$ 200-500 | Para ME/EPP |
| **Certificado Digital** | R$ 150-300/ano | Para emitir NF-e/NFS-e |
| **Servidor (Railway)** | ~R$ 200/mês | Para o License Server |

#### b) Taxas por Venda

| Item | Taxa | Exemplo (R$ 99,90) |
|------|------|---------------------|
| **Stripe** | 3,99% + R$ 0,39 | R$ 4,37 |
| **PIX (via Stripe)** | 1,5% | R$ 1,50 |
| **ISS** | 2-5% | R$ 2,00 - R$ 5,00 |
| **Simples Nacional** | ~6% | R$ 6,00 |

#### c) Custos de Plataforma de Pagamento

| Plataforma | Taxa Cartão | Taxa PIX | Taxa Boleto |
|------------|-------------|----------|-------------|
| **Stripe** | 3,99% + R$ 0,39 | 1,5% | Não disponível |
| **PagSeguro** | 4,99% + R$ 0,40 | 0,99% | R$ 3,49/boleto |
| **Mercado Pago** | 4,98% | 0,99% | R$ 3,49/boleto |
| **Asaas** | 2,99% | Grátis (até limites) | R$ 1,99/boleto |

### 5.4 Homologação

| Questão | Resposta |
|---------|----------|
| **Precisa de homologação?** | **NÃO** para software de gestão genérico |
| **E se emitir NFC-e/NF-e?** | **SIM** - precisa integrar com SEFAZ |
| **PAF-ECF** | **OBSOLETO** - substituído por NFC-e |
| **E se emitir cupom fiscal?** | Impressora fiscal (SAT em SP, MFE em outros estados) |

### 5.5 Resumo de Custos Iniciais

| Item | Custo Único | Custo Mensal |
|------|-------------|--------------|
| **Abertura MEI** | R$ 0 | R$ 76,90 |
| **Abertura ME** | R$ 500-1.500 | - |
| **Certificado A1** | R$ 180 | - |
| **Servidor** | - | R$ 200 |
| **Domínio** | R$ 40/ano | - |
| **SSL** | Grátis (Let's Encrypt) | - |

---

## 🔄 6. Sincronização entre Projetos

### 6.1 Pontos de Integração

| GIRO Desktop | License Server | Status |
|--------------|----------------|--------|
| `license::activate()` | `POST /licenses/:key/activate` | ✅ Definido |
| `license::validate()` | `POST /licenses/:key/validate` | ✅ Definido |
| `sync::metrics()` | `POST /metrics` | ✅ Definido |
| `update::check()` | `GET /updates/latest` | ⚠️ Não implementado |

### 6.2 Verificações Necessárias

| Item | Verificação | Ação |
|------|-------------|------|
| **Hardware ID** | Formato compatível | ✅ SHA256 |
| **API Key** | Formato e validação | ✅ `giro_live_XXX` |
| **Endpoints** | URLs corretas | ⚠️ Confirmar no Desktop |
| **Retry Logic** | Offline handling | ⚠️ Verificar |
| **Grace Period** | 7 dias configurado | ⚠️ Verificar |

### 6.3 Tarefas de Sincronização

- [ ] Verificar implementação de license validation no Desktop Rust
- [ ] Confirmar grace period de 7 dias no Desktop
- [ ] Testar fluxo de ativação end-to-end
- [ ] Implementar endpoint de updates
- [ ] Adicionar retry com exponential backoff no Desktop

---

## 📋 7. Checklist de Implementação

### 7.1 Licença Vitalícia

- [ ] Adicionar `lifetime` ao enum `plan_type`
- [ ] Criar migration SQL
- [ ] Atualizar `price_cents()` e `days()`
- [ ] Atualizar Dashboard (dropdown de planos)
- [ ] Atualizar página de pricing
- [ ] Testar fluxo completo

### 7.2 Página de Compra

- [ ] Criar projeto Next.js para landing page
- [ ] Implementar páginas: /, /precos, /cadastro, /checkout, /download
- [ ] Integrar Stripe Checkout
- [ ] Configurar webhooks Stripe
- [ ] Hospedar em Vercel/Railway
- [ ] Configurar DNS

### 7.3 Questões Fiscais

- [ ] Definir enquadramento (MEI ou ME)
- [ ] Adquirir certificado digital
- [ ] Configurar emissão de NFS-e
- [ ] Integrar com sistema de notas (Nota Certa, etc.)

---

## 📊 8. Projeção de Receita

### 8.1 Cenário Conservador (Ano 1)

| Métrica | Valor |
|---------|-------|
| Clientes novos/mês | 30 |
| Churn mensal | 5% |
| Ticket médio | R$ 120 |
| MRR final | R$ 36.000 |
| ARR | R$ 432.000 |

### 8.2 Impacto da Licença Vitalícia

| Cenário | % Vitalício | Receita Upfront | Recorrência Perdida |
|---------|-------------|-----------------|---------------------|
| **Baixo** | 10% | +R$ 60.000/ano | -R$ 7.200/ano |
| **Médio** | 25% | +R$ 150.000/ano | -R$ 18.000/ano |
| **Alto** | 50% | +R$ 300.000/ano | -R$ 36.000/ano |

> **Recomendação:** Manter vitalício como opção premium (preço mais alto) e priorizar assinaturas mensais/anuais.

---

## ✅ 9. Conclusão

### O que está funcionando bem:
1. ✅ Arquitetura do License Server está robusta
2. ✅ Hardware binding implementado corretamente
3. ✅ Dashboard administrativo funcional
4. ✅ API REST bem documentada
5. ✅ Proteções anti-fraude implementadas

### O que precisa de atenção:
1. ⚠️ Integração Stripe ainda em mock
2. ⚠️ Página pública de vendas não existe
3. ⚠️ Licença vitalícia não implementada
4. ⚠️ Sistema de updates não implementado
5. ⚠️ Questões fiscais precisam ser definidas

### Próximos Passos Prioritários:
1. **Implementar licença vitalícia** (1-2 dias)
2. **Integrar Stripe real** (3-5 dias)
3. **Criar landing page de vendas** (5-7 dias)
4. **Definir enquadramento fiscal** (1 dia + contador)
5. **Testar fluxo end-to-end** (2-3 dias)

---

_Relatório gerado em 11 de Janeiro de 2026 pela equipe Arkheion Corp._
