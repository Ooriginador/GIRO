# 🧾 Roadmap - Integração NFe/NFC-e com SEFAZ

> **Versão:** 1.1.0  
> **Status:** 🟢 Em Implementação (Fase 4 & 6 Completas)  
> **Criado:** 9 de Janeiro de 2026  
> **Última Atualização:** 9 de Janeiro de 2026  
> **Prioridade:** Opcional (Feature Premium)

---

## 🚀 Progresso da Implementação

| Fase | Status | Testes | Arquivos |
|------|--------|--------|----------|
| **1. Infraestrutura Base** | ✅ Completa | 3 | `certificate.rs`, `fiscal_*`, migrations |
| **2. XML e Chave de Acesso** | ✅ Completa | 6 | `xml_builder.rs`, `access_key.rs`, `endpoints.rs` |
| **3. WebService e QR Code** | ✅ Completa | 6 | `webservice.rs`, `qrcode.rs` |
| **4. XMLDSig e Integração** | ✅ Completa | 8 | `services/nfce_service.rs`, `routes/nfce.rs` |
| **5. Contingência** | ✅ Completa | 1 | `contingency.rs` |
| **6. DANFE** | ✅ Completa | 7 | `danfe.rs` |

**Total: 30 testes unitários passando**

### Módulos Implementados

```
src/nfce/
├── access_key.rs    ✅ 44-dígitos com mod-11
├── certificate.rs   ✅ Load/validate PFX + XMLDSig
├── endpoints.rs     ✅ URLs SEFAZ por UF (SP/MG/RJ/RS + SVRS/SVAN)
├── qrcode.rs        ✅ QR Code URL per NT 2019.001
├── webservice.rs    ✅ SOAP client (StatusServico, Autorizacao, Consulta)
├── xml_builder.rs   ✅ NFC-e XML per SEFAZ 4.00
├── danfe.rs         ✅ Impressão térmica (80mm) + HTML + QR Code
└── contingency.rs   ⏳ EPEC/offline (TODO)
```

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [O Que é Necessário](#o-que-é-necessário)
3. [Requisitos Técnicos](#requisitos-técnicos)
4. [Fluxo de Configuração do Admin](#fluxo-de-configuração-do-admin)
5. [Arquitetura da Integração](#arquitetura-da-integração)
6. [Schema do Banco de Dados](#schema-do-banco-de-dados)
7. [Fases de Implementação](#fases-de-implementação)
8. [Estimativa de Esforço](#estimativa-de-esforço)

---

## 🎯 Visão Geral

### NFe vs NFC-e - Qual Usar?

| Documento             | Uso                                 | Destinatário                    |
| --------------------- | ----------------------------------- | ------------------------------- |
| **NF-e** (Modelo 55)  | Vendas B2B, atacado, transferências | Pessoa Jurídica (CNPJ)          |
| **NFC-e** (Modelo 65) | Vendas no varejo, PDV               | Consumidor Final (CPF opcional) |

**Para Mercearias/Varejo: NFC-e é o documento ideal!**

### Por Que a Emissão é Opcional?

- Nem todo cliente precisa/quer nota fiscal
- Custos de certificado digital (~R$ 150-400/ano)
- Complexidade regulatória varia por estado
- Pequenos estabelecimentos podem usar Nota Fiscal Avulsa

---

## 📦 O Que é Necessário

### 1. Requisitos Legais (Responsabilidade do Cliente)

| Item                       | Descrição                           | Custo Estimado   |
| -------------------------- | ----------------------------------- | ---------------- |
| **CNPJ Ativo**             | Empresa regular na Receita Federal  | -                |
| **Inscrição Estadual**     | Registro na SEFAZ do estado         | Gratuito         |
| **Credenciamento NFC-e**   | Solicitação na SEFAZ estadual       | Gratuito         |
| **Certificado Digital A1** | Arquivo .pfx válido por 1 ano       | R$ 150-250/ano   |
| **Código CSC**             | Código de Segurança do Contribuinte | Gratuito (SEFAZ) |
| **ID do Token CSC**        | Identificador do CSC                | Gratuito (SEFAZ) |

### 2. Requisitos Técnicos (Nossa Responsabilidade)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENTES A IMPLEMENTAR                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔐 Certificado Digital                                              │
│  ├── Upload e armazenamento seguro do .pfx                         │
│  ├── Validação de senha e validade                                  │
│  └── Renovação automática de alertas                                │
│                                                                      │
│  📄 Geração de XML                                                   │
│  ├── Montagem do XML conforme layout SEFAZ                         │
│  ├── Cálculo de impostos (ICMS, PIS, COFINS)                       │
│  ├── Assinatura digital (XMLDSig)                                  │
│  └── Validação de schema (XSD)                                     │
│                                                                      │
│  🌐 Comunicação WebService                                          │
│  ├── Autorização (envio da NFC-e)                                  │
│  ├── Consulta de status                                             │
│  ├── Cancelamento                                                   │
│  ├── Inutilização de numeração                                     │
│  └── Contingência offline (EPEC)                                   │
│                                                                      │
│  🖨️ Impressão DANFE                                                 │
│  ├── Layout NFC-e (cupom térmico)                                  │
│  ├── QR Code para consulta                                         │
│  └── Impressão em contingência                                     │
│                                                                      │
│  💾 Armazenamento                                                    │
│  ├── XMLs autorizados (5 anos obrigatório)                         │
│  ├── Backup automático                                              │
│  └── Exportação para contabilidade                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Dependências Rust a Adicionar

```toml
# Cargo.toml - Novas dependências para NFe/NFC-e

[dependencies]
# XML
quick-xml = { version = "0.31", features = ["serialize"] }
roxmltree = "0.19"  # Parsing de respostas

# Criptografia e Assinatura Digital
openssl = { version = "0.10", features = ["vendored"] }
x509-parser = "0.16"  # Parsing de certificados

# HTTP/SOAP para WebServices SEFAZ
reqwest = { version = "0.12", features = ["rustls-tls", "cookies"] }

# QR Code para DANFE
qrcode = "0.14"
image = "0.25"

# Validação de schemas
regex = "1.10"

# Encoding
encoding_rs = "0.8"  # ISO-8859-1 para XML
```

---

## 🔧 Requisitos Técnicos Detalhados

### Webservices SEFAZ (Endpoints por UF)

Cada estado possui URLs diferentes. Exemplo para principais estados:

| UF  | Ambiente    | URL Base                                             |
| --- | ----------- | ---------------------------------------------------- |
| SP  | Produção    | `https://nfce.fazenda.sp.gov.br/NFCeWS/`             |
| SP  | Homologação | `https://homologacao.nfce.fazenda.sp.gov.br/NFCeWS/` |
| RJ  | Produção    | `https://nfce.fazenda.rj.gov.br/`                    |
| MG  | Produção    | `https://nfce.fazenda.mg.gov.br/nfce/`               |
| RS  | Produção    | `https://nfce.sefazrs.rs.gov.br/ws/`                 |
| ... | ...         | Consultar Portal Nacional                            |

### Serviços WebService Necessários

| Serviço                | Método                  | Descrição                      |
| ---------------------- | ----------------------- | ------------------------------ |
| `NFeAutorizacao`       | `nfeAutorizacaoLote`    | Enviar NFC-e para autorização  |
| `NFeRetAutorizacao`    | `nfeRetAutorizacaoLote` | Consultar retorno do lote      |
| `NFeConsultaProtocolo` | `nfeConsultaNF`         | Consultar NFC-e pela chave     |
| `NFeStatusServico`     | `nfeStatusServicoNF`    | Verificar se SEFAZ está online |
| `NFeInutilizacao`      | `nfeInutilizacaoNF`     | Inutilizar faixa de numeração  |
| `RecepcaoEvento`       | `nfeRecepcaoEvento`     | Cancelar NFC-e                 |

### Estrutura do XML NFC-e

```xml
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="NFe...">
    <!-- Identificação da NFC-e -->
    <ide>
      <cUF>35</cUF>           <!-- Código UF -->
      <cNF>12345678</cNF>     <!-- Código numérico -->
      <natOp>VENDA</natOp>    <!-- Natureza operação -->
      <mod>65</mod>           <!-- Modelo: 65 = NFC-e -->
      <serie>1</serie>
      <nNF>1</nNF>            <!-- Número da nota -->
      <dhEmi>2026-01-09T14:30:00-03:00</dhEmi>
      <tpNF>1</tpNF>          <!-- 1 = Saída -->
      <idDest>1</idDest>      <!-- 1 = Interna -->
      <cMunFG>3550308</cMunFG> <!-- Código IBGE município -->
      <tpImp>4</tpImp>        <!-- 4 = DANFE NFC-e -->
      <tpEmis>1</tpEmis>      <!-- 1 = Normal, 9 = Contingência -->
      <tpAmb>2</tpAmb>        <!-- 1 = Produção, 2 = Homologação -->
      <finNFe>1</finNFe>      <!-- 1 = Normal -->
      <indFinal>1</indFinal>  <!-- 1 = Consumidor final -->
      <indPres>1</indPres>    <!-- 1 = Presencial -->
      <procEmi>0</procEmi>    <!-- Aplicativo contribuinte -->
      <verProc>GIRO 1.0</verProc>
    </ide>

    <!-- Emitente -->
    <emit>
      <CNPJ>12345678000199</CNPJ>
      <xNome>MERCEARIA EXEMPLO</xNome>
      <xFant>MERCEARIA</xFant>
      <enderEmit>...</enderEmit>
      <IE>123456789</IE>
      <CRT>1</CRT>  <!-- 1 = Simples Nacional -->
    </emit>

    <!-- Destinatário (opcional para NFC-e) -->
    <dest>
      <CPF>12345678901</CPF>  <!-- Opcional -->
    </dest>

    <!-- Produtos -->
    <det nItem="1">
      <prod>
        <cProd>001</cProd>
        <cEAN>7891234567890</cEAN>
        <xProd>COCA-COLA 2L</xProd>
        <NCM>22021000</NCM>
        <CFOP>5102</CFOP>
        <uCom>UN</uCom>
        <qCom>2.0000</qCom>
        <vUnCom>7.00</vUnCom>
        <vProd>14.00</vProd>
        <cEANTrib>7891234567890</cEANTrib>
        <uTrib>UN</uTrib>
        <qTrib>2.0000</qTrib>
        <vUnTrib>7.00</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMSSN102>  <!-- Simples Nacional -->
            <orig>0</orig>
            <CSOSN>102</CSOSN>
          </ICMSSN102>
        </ICMS>
        <PIS><PISOutr>...</PISOutr></PIS>
        <COFINS><COFINSOutr>...</COFINSOutr></COFINS>
      </imposto>
    </det>

    <!-- Totais -->
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vProd>14.00</vProd>
        <vNF>14.00</vNF>
      </ICMSTot>
    </total>

    <!-- Pagamento -->
    <pag>
      <detPag>
        <tPag>01</tPag>  <!-- 01=Dinheiro, 03=Cartão Crédito, 17=PIX -->
        <vPag>14.00</vPag>
      </detPag>
    </pag>

    <!-- Informações adicionais -->
    <infAdic>
      <infCpl>Venda realizada pelo sistema GIRO</infCpl>
    </infAdic>
  </infNFe>

  <!-- Assinatura Digital -->
  <Signature>...</Signature>
</NFe>
```

---

## 👤 Fluxo de Configuração do Admin

### Passo a Passo para o Cliente Final

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WIZARD DE CONFIGURAÇÃO NFC-e                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PASSO 1: Dados da Empresa                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Nome/Razão Social: [Mercearia Exemplo LTDA            ]    │   │
│  │ Nome Fantasia:     [Mercearia do João                 ]    │   │
│  │ CNPJ:              [12.345.678/0001-99                ]    │   │
│  │ Inscrição Estadual:[123.456.789                       ]    │   │
│  │ Regime Tributário: [○ Simples  ○ Lucro Presumido      ]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  PASSO 2: Endereço Completo                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CEP:      [01310-100] [🔍 Buscar]                          │   │
│  │ Rua:      [Av. Paulista                               ]    │   │
│  │ Número:   [1000        ]  Complemento: [Loja 1       ]    │   │
│  │ Bairro:   [Bela Vista                                 ]    │   │
│  │ Cidade:   [São Paulo   ]  UF: [SP ▼]                      │   │
│  │ Cód IBGE: [3550308] (preenchido automaticamente)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  PASSO 3: Certificado Digital                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Você precisa de um certificado digital A1 (.pfx)         │   │
│  │                                                              │   │
│  │ [📤 Selecionar arquivo .pfx]                                │   │
│  │                                                              │   │
│  │ Senha do certificado: [••••••••••••]                        │   │
│  │                                                              │   │
│  │ ✅ Certificado válido até: 15/01/2027                       │   │
│  │ 📋 Titular: MERCEARIA EXEMPLO LTDA                          │   │
│  │ 📋 CNPJ: 12.345.678/0001-99                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  PASSO 4: Credenciamento SEFAZ                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📌 Essas informações você obtém no portal da SEFAZ-SP       │   │
│  │                                                              │   │
│  │ Código CSC (Token):  [A1B2C3D4E5F6G7H8...            ]     │   │
│  │ ID do Token:         [000001                          ]     │   │
│  │                                                              │   │
│  │ 🔗 [Acessar Portal SEFAZ-SP para obter CSC]                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  PASSO 5: Configurações de Emissão                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Ambiente:                                                    │   │
│  │ (•) Homologação (testes, NFC-e sem valor fiscal)            │   │
│  │ ( ) Produção (NFC-e válida)                                 │   │
│  │                                                              │   │
│  │ Série NFC-e:         [1  ]                                  │   │
│  │ Número inicial:      [1  ]                                  │   │
│  │                                                              │   │
│  │ Emitir automaticamente após venda?                          │   │
│  │ [✓] Sim, emitir NFC-e para todas as vendas                  │   │
│  │ [ ] Não, apenas quando solicitado                           │   │
│  │                                                              │   │
│  │ Solicitar CPF do cliente?                                   │   │
│  │ [ ] Sempre perguntar                                        │   │
│  │ [✓] Opcional (perguntar apenas se > R$ 200)                 │   │
│  │ [ ] Nunca solicitar                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  PASSO 6: Teste de Conexão                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  [🧪 Testar Conexão com SEFAZ]                              │   │
│  │                                                              │   │
│  │  ✅ Conexão estabelecida com sucesso!                       │   │
│  │  ✅ Certificado válido e aceito                             │   │
│  │  ✅ CSC validado                                            │   │
│  │  ✅ Ambiente de homologação ativo                           │   │
│  │                                                              │   │
│  │  [📄 Emitir NFC-e de Teste]                                 │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│                    [← Voltar]  [Salvar e Ativar NFC-e →]            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Emissão Automática

```
┌────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE EMISSÃO AUTOMÁTICA                     │
└────────────────────────────────────────────────────────────────────┘

    ┌──────────┐      ┌──────────────┐      ┌─────────────────┐
    │ Finaliza │ ───► │ NFC-e está   │ ───► │ Gerar XML       │
    │  Venda   │      │ habilitada?  │  Sim │ da NFC-e        │
    └──────────┘      └──────────────┘      └────────┬────────┘
                             │                        │
                             │ Não                    ▼
                             ▼                ┌─────────────────┐
                      ┌──────────────┐       │ Assinar com     │
                      │ Imprimir     │       │ Certificado A1  │
                      │ Cupom Normal │       └────────┬────────┘
                      └──────────────┘                │
                                                      ▼
                                              ┌─────────────────┐
                                              │ Enviar para     │
                                              │ SEFAZ           │
                                              └────────┬────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────────────┐
                          │                            │                            │
                          ▼                            ▼                            ▼
                   ┌──────────────┐          ┌─────────────────┐          ┌─────────────────┐
                   │ ✅ Autorizada │          │ ⚠️ SEFAZ Offline │          │ ❌ Rejeitada     │
                   │              │          │ Contingência     │          │                 │
                   └──────┬───────┘          └────────┬────────┘          └────────┬────────┘
                          │                           │                            │
                          ▼                           ▼                            ▼
                   ┌──────────────┐          ┌─────────────────┐          ┌─────────────────┐
                   │ Salvar XML   │          │ Emitir EPEC     │          │ Exibir erro     │
                   │ Autorizado   │          │ (contingência)  │          │ e motivo        │
                   └──────┬───────┘          └────────┬────────┘          └─────────────────┘
                          │                           │
                          ▼                           ▼
                   ┌──────────────┐          ┌─────────────────┐
                   │ Imprimir     │          │ Imprimir DANFE  │
                   │ DANFE NFC-e  │          │ Contingência    │
                   └──────────────┘          └─────────────────┘
```

---

## 🏗️ Arquitetura da Integração

### Estrutura de Pastas (Backend Rust)

```
src-tauri/src/
├── nfce/
│   ├── mod.rs              # Módulo principal
│   ├── certificate.rs      # Gerenciamento de certificados A1
│   ├── xml_builder.rs      # Montagem do XML NFC-e
│   ├── signer.rs           # Assinatura digital XMLDSig
│   ├── webservice.rs       # Cliente SOAP para SEFAZ
│   ├── qrcode.rs           # Geração de QR Code
│   ├── danfe.rs            # Layout DANFE para impressão
│   ├── contingency.rs      # Modo contingência (EPEC)
│   ├── validators.rs       # Validação de dados fiscais
│   └── endpoints.rs        # URLs por UF
├── commands/
│   └── nfce_commands.rs    # Comandos Tauri para frontend
├── models/
│   └── nfce_models.rs      # Structs de dados fiscais
└── repositories/
    └── nfce_repository.rs  # Persistência de notas
```

### Estrutura de Pastas (Frontend React)

```
src/
├── pages/
│   └── settings/
│       └── nfce/
│           ├── NFCeConfigPage.tsx      # Wizard de configuração
│           ├── CertificateUpload.tsx   # Upload de certificado
│           ├── CompanyDataForm.tsx     # Dados da empresa
│           ├── SefazCredentials.tsx    # CSC e Token
│           └── NFCeTestConnection.tsx  # Teste de conexão
├── components/
│   └── nfce/
│       ├── NFCeStatusBadge.tsx         # Status da nota
│       ├── DANFEPreview.tsx            # Preview do DANFE
│       └── NFCeHistoryTable.tsx        # Histórico de notas
├── hooks/
│   └── useNFCe.ts                      # Hook de emissão
└── stores/
    └── nfceStore.ts                    # Estado global NFC-e
```

---

## 💾 Schema do Banco de Dados

### Novas Tabelas Necessárias

```prisma
// prisma/schema.prisma - Adições para NFC-e

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO FISCAL DA EMPRESA
// ════════════════════════════════════════════════════════════════════════════

model FiscalConfig {
  id                String   @id @default(cuid())

  // Status
  isEnabled         Boolean  @default(false)  // NFC-e habilitada?
  environment       FiscalEnvironment @default(HOMOLOGATION)

  // Dados da Empresa
  razaoSocial       String
  nomeFantasia      String?
  cnpj              String   @unique
  inscricaoEstadual String
  regimeTributario  TaxRegime @default(SIMPLES_NACIONAL)

  // Endereço (obrigatório para NFC-e)
  cep               String
  logradouro        String
  numero            String
  complemento       String?
  bairro            String
  codigoMunicipio   String   // Código IBGE
  municipio         String
  uf                String
  codigoPais        String   @default("1058")
  pais              String   @default("BRASIL")
  telefone          String?

  // Certificado Digital (armazenado de forma segura)
  certificatePath   String?       // Caminho do .pfx (criptografado)
  certificateHash   String?       // Hash para validação
  certificateExpiry DateTime?     // Data de expiração

  // Credenciamento SEFAZ
  csc               String?       // Código de Segurança do Contribuinte
  cscId             String?       // ID do Token

  // Numeração
  serieNFCe         Int      @default(1)
  ultimoNumeroNFCe  Int      @default(0)

  // Configurações de Emissão
  emissaoAutomatica Boolean  @default(true)
  solicitarCpf      CpfPolicy @default(OPTIONAL)
  valorMinimoCpf    Float?   @default(200)

  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  updatedById       String?

  @@index([cnpj])
}

enum FiscalEnvironment {
  PRODUCTION    // Produção (notas válidas)
  HOMOLOGATION  // Homologação (testes)
}

enum TaxRegime {
  SIMPLES_NACIONAL           // CRT 1
  SIMPLES_EXCESSO            // CRT 2
  LUCRO_PRESUMIDO            // CRT 3
  LUCRO_REAL                 // CRT 3
}

enum CpfPolicy {
  ALWAYS    // Sempre solicitar
  OPTIONAL  // Opcional (perguntar)
  NEVER     // Nunca solicitar
  BY_VALUE  // Apenas acima de valorMinimoCpf
}

// ════════════════════════════════════════════════════════════════════════════
// NOTAS FISCAIS ELETRÔNICAS
// ════════════════════════════════════════════════════════════════════════════

model NFCe {
  id              String   @id @default(cuid())

  // Relacionamento com Venda
  saleId          String   @unique
  // sale            Sale     @relation(fields: [saleId], references: [id])

  // Identificação da Nota
  chaveAcesso     String   @unique   // 44 dígitos
  numero          Int
  serie           Int

  // Status
  status          NFCeStatus @default(PENDING)

  // XMLs (armazenados como texto ou referência a arquivo)
  xmlEnviado      String?   // XML antes de assinar
  xmlAssinado     String?   // XML assinado (enviado)
  xmlAutorizado   String?   // XML com protocolo (retorno SEFAZ)

  // Protocolo de Autorização
  protocolo       String?   // Número do protocolo SEFAZ
  dataAutorizacao DateTime?

  // Cancelamento
  canceledAt      DateTime?
  cancelProtocolo String?
  cancelMotivo    String?

  // Contingência
  isContingency   Boolean   @default(false)
  contingencyType String?   // EPEC, offline, etc

  // Erros
  codigoRejeicao  String?
  motivoRejeicao  String?
  tentativas      Int       @default(0)

  // Consumidor
  cpfConsumidor   String?

  // Valores (snapshot)
  valorTotal      Float

  // Metadata
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([saleId])
  @@index([chaveAcesso])
  @@index([status])
  @@index([createdAt])
}

enum NFCeStatus {
  PENDING      // Aguardando emissão
  PROCESSING   // Em processamento
  AUTHORIZED   // Autorizada
  REJECTED     // Rejeitada
  CANCELED     // Cancelada
  CONTINGENCY  // Emitida em contingência
  ERROR        // Erro de comunicação
}

// ════════════════════════════════════════════════════════════════════════════
// INUTILIZAÇÃO DE NUMERAÇÃO
// ════════════════════════════════════════════════════════════════════════════

model NFCeInutilizacao {
  id            String   @id @default(cuid())

  // Faixa inutilizada
  serie         Int
  numeroInicial Int
  numeroFinal   Int

  // Justificativa
  justificativa String

  // Protocolo SEFAZ
  protocolo     String?
  dataInutilizacao DateTime?

  // Status
  status        InutStatus @default(PENDING)

  // Metadata
  createdAt     DateTime @default(now())
  employeeId    String

  @@index([serie, numeroInicial, numeroFinal])
}

enum InutStatus {
  PENDING
  CONFIRMED
  ERROR
}

// ════════════════════════════════════════════════════════════════════════════
// DADOS FISCAIS DO PRODUTO (NCM, CFOP, etc)
// ════════════════════════════════════════════════════════════════════════════

model ProductFiscalData {
  id          String   @id @default(cuid())

  productId   String   @unique
  // product     Product  @relation(fields: [productId], references: [id])

  // Classificação Fiscal
  ncm         String?  // Nomenclatura Comum do Mercosul (8 dígitos)
  cest        String?  // Código Especificador da Substituição Tributária
  cfop        String   @default("5102")  // Venda interna

  // Origem
  origem      ProductOrigin @default(NACIONAL)

  // ICMS
  csosnSimples  String?  // CSOSN para Simples Nacional (ex: 102)
  cstIcms       String?  // CST para outros regimes
  aliquotaIcms  Float?

  // PIS/COFINS
  cstPis        String   @default("49")  // Outras saídas
  cstCofins     String   @default("49")

  // Metadata
  updatedAt   DateTime @updatedAt

  @@index([productId])
  @@index([ncm])
}

enum ProductOrigin {
  NACIONAL                 // 0
  ESTRANGEIRA_DIRETA       // 1
  ESTRANGEIRA_MERCADO      // 2
  NACIONAL_MAIS_40_CI      // 3
  NACIONAL_PPB             // 4
  NACIONAL_MENOS_40_CI     // 5
  ESTRANGEIRA_DIRETA_S_SI  // 6
  ESTRANGEIRA_MERC_S_SI    // 7
  NACIONAL_CI_NI           // 8
}
```

### Alterações na Tabela Sale

```prisma
model Sale {
  // ... campos existentes ...

  // Novo: Relacionamento com NFC-e (opcional)
  nfce          NFCe?

  // Novo: Flag para indicar se tem nota
  hasNFCe       Boolean  @default(false)
}
```

---

## 📅 Fases de Implementação

### Fase 1: Infraestrutura Base (2-3 semanas)

| Sprint | Tasks                                              | Responsável |
| ------ | -------------------------------------------------- | ----------- |
| 1.1    | Criar modelos de dados (Prisma migrations)         | Backend     |
| 1.2    | Implementar módulo de certificados digitais        | Backend     |
| 1.3    | Criar tela de configuração fiscal (wizard)         | Frontend    |
| 1.4    | Upload e validação de certificado A1               | Full-stack  |
| 1.5    | Armazenamento seguro do certificado (criptografia) | Backend     |

**Entregáveis:**

- [ ] Migrations do banco de dados
- [ ] Upload de certificado funcionando
- [ ] Wizard de configuração básico
- [ ] Testes unitários

### Fase 2: Geração de XML e Assinatura (2-3 semanas)

| Sprint | Tasks                                                 | Responsável |
| ------ | ----------------------------------------------------- | ----------- |
| 2.1    | Implementar builder de XML NFC-e                      | Backend     |
| 2.2    | Implementar assinatura digital XMLDSig                | Backend     |
| 2.3    | Validação de XML contra XSD                           | Backend     |
| 2.4    | Testes com XMLs de exemplo                            | Backend     |
| 2.5    | Configuração de dados fiscais de produtos (NCM, CFOP) | Frontend    |

**Entregáveis:**

- [ ] XML gerado corretamente
- [ ] Assinatura digital funcionando
- [ ] Tela de dados fiscais de produtos

### Fase 3: Comunicação WebService SEFAZ (3-4 semanas)

| Sprint | Tasks                                        | Responsável |
| ------ | -------------------------------------------- | ----------- |
| 3.1    | Implementar cliente SOAP para SEFAZ          | Backend     |
| 3.2    | Mapeamento de endpoints por UF               | Backend     |
| 3.3    | Implementar NFeStatusServico (teste conexão) | Backend     |
| 3.4    | Implementar NFeAutorizacao (envio)           | Backend     |
| 3.5    | Implementar tratamento de retorno e erros    | Backend     |
| 3.6    | Testes em ambiente de homologação            | QA          |

**Entregáveis:**

- [ ] Conexão com SEFAZ funcionando
- [ ] Autorização de NFC-e em homologação
- [ ] Logs de comunicação

### Fase 4: Impressão DANFE e QR Code (1-2 semanas)

| Sprint | Tasks                                     | Responsável |
| ------ | ----------------------------------------- | ----------- |
| 4.1    | Gerar QR Code da NFC-e                    | Backend     |
| 4.2    | Layout DANFE NFC-e (cupom térmico)        | Backend     |
| 4.3    | Integrar com impressora térmica existente | Backend     |
| 4.4    | Preview de DANFE no frontend              | Frontend    |

**Entregáveis:**

- [ ] DANFE imprimindo corretamente
- [ ] QR Code válido
- [ ] Preview no sistema

### Fase 5: Contingência e Eventos (2 semanas)

| Sprint | Tasks                                           | Responsável |
| ------ | ----------------------------------------------- | ----------- |
| 5.1    | Implementar detecção de SEFAZ offline           | Backend     |
| 5.2    | Implementar modo contingência (EPEC ou offline) | Backend     |
| 5.3    | Implementar cancelamento de NFC-e               | Backend     |
| 5.4    | Implementar inutilização de numeração           | Backend     |
| 5.5    | Transmissão automática quando SEFAZ voltar      | Backend     |

**Entregáveis:**

- [ ] Sistema resiliente a quedas
- [ ] Cancelamento funcionando
- [ ] Inutilização funcionando

### Fase 6: Integração com PDV e Polimento (2 semanas)

| Sprint | Tasks                                 | Responsável |
| ------ | ------------------------------------- | ----------- |
| 6.1    | Integrar emissão automática pós-venda | Backend     |
| 6.2    | Opção de solicitar CPF no PDV         | Frontend    |
| 6.3    | Histórico de notas e reimpressão      | Frontend    |
| 6.4    | Consulta de notas por chave           | Frontend    |
| 6.5    | Exportação de XMLs para contabilidade | Backend     |
| 6.6    | Alertas de certificado vencendo       | Backend     |

**Entregáveis:**

- [ ] Fluxo completo integrado
- [ ] Histórico e reimpressão
- [ ] Exportação funcionando

### Fase 7: Testes e Go-Live (2 semanas)

| Sprint | Tasks                               | Responsável |
| ------ | ----------------------------------- | ----------- |
| 7.1    | Testes E2E completos                | QA          |
| 7.2    | Testes em produção simulada         | QA          |
| 7.3    | Documentação de uso para cliente    | Docs        |
| 7.4    | Treinamento (vídeos/tutoriais)      | Docs        |
| 7.5    | Feature flag para liberação gradual | Backend     |

---

## ⏱️ Estimativa de Esforço

### Resumo por Fase

| Fase                   | Duração     | Complexidade | Risco |
| ---------------------- | ----------- | ------------ | ----- |
| 1. Infraestrutura Base | 2-3 semanas | Média        | Baixo |
| 2. XML e Assinatura    | 2-3 semanas | Alta         | Médio |
| 3. WebService SEFAZ    | 3-4 semanas | Muito Alta   | Alto  |
| 4. DANFE e QR Code     | 1-2 semanas | Média        | Baixo |
| 5. Contingência        | 2 semanas   | Alta         | Médio |
| 6. Integração PDV      | 2 semanas   | Média        | Baixo |
| 7. Testes e Go-Live    | 2 semanas   | Média        | Médio |

### Total Estimado

```
┌────────────────────────────────────────────────────────────┐
│                 ESTIMATIVA TOTAL                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Tempo total:       14-18 semanas (~3.5-4.5 meses)        │
│                                                            │
│  Desenvolvedor(es): 1-2 desenvolvedores full-stack        │
│                                                            │
│  Dependências externas:                                    │
│  - Certificado digital A1 para testes                     │
│  - Credenciamento em ambiente de homologação SEFAZ        │
│  - Acesso ao Portal SEFAZ do estado                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Riscos e Mitigações

| Risco                              | Probabilidade | Impacto | Mitigação                              |
| ---------------------------------- | ------------- | ------- | -------------------------------------- |
| Mudanças na legislação/layout      | Média         | Alto    | Monitorar NT (Notas Técnicas) da SEFAZ |
| Instabilidade WebService SEFAZ     | Alta          | Alto    | Implementar contingência robusta       |
| Complexidade de assinatura digital | Média         | Médio   | Usar crates Rust bem testadas          |
| Variação entre estados             | Alta          | Médio   | Começar com SP/MG/RS (maiores volumes) |
| Certificado A1 para testes         | Baixa         | Médio   | Usar certificados de teste SEFAZ       |

---

## 🔗 Recursos Úteis

### Documentação Oficial

- [Portal Nacional NF-e](https://www.nfe.fazenda.gov.br/portal/principal.aspx)
- [Manual de Orientação do Contribuinte](https://www.nfe.fazenda.gov.br/portal/listaSubMenu.aspx?Id=04BIflQt1aY=)
- [Schemas XSD NF-e 4.00](https://www.nfe.fazenda.gov.br/portal/listaSchemas.aspx)
- [Notas Técnicas](https://www.nfe.fazenda.gov.br/portal/listaSubMenu.aspx?Id=eTQqYkBpTMY=)

### Bibliotecas de Referência

- [nfe-rs](https://github.com/rscarvalho/nfe-rs) - Crate Rust para NF-e
- [rust-xmlsec](https://github.com/nickvidal/rust-xmlsec) - Assinatura XML
- [openssl-rust](https://github.com/sfackler/rust-openssl) - Manipulação de certificados

### Ferramentas de Teste

- [Validador de XML NF-e](https://www.sefaz.rs.gov.br/nfe/nfe-val.aspx)
- [Consulta NFC-e](https://www.nfce.fazenda.gov.br/portal/consultaRecaptcha.aspx)

---

## ✅ Checklist de Prontidão para Produção

Antes de ir para produção, verificar:

- [ ] Certificado digital A1 válido e configurado
- [ ] Credenciamento NFC-e aprovado na SEFAZ
- [ ] CSC e ID do Token configurados
- [ ] Testes em homologação aprovados (mínimo 50 notas)
- [ ] Contingência testada e funcionando
- [ ] Backup de XMLs configurado
- [ ] Treinamento do cliente realizado
- [ ] Contabilidade informada sobre integração
- [ ] Monitoramento de erros ativo
- [ ] Alerta de vencimento de certificado configurado

---

> **Nota:** Este é um recurso **opcional** e **premium**. A complexidade da integração com SEFAZ justifica um add-on pago ou tier superior do sistema.
