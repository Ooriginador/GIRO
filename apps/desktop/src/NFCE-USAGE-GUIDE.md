# 📘 Guia de Integração NFC-e (Frontend)

Este guia documenta como utilizar o sistema de emissão de NFC-e totalmente integrado no frontend React/Tauri.

---

## 🚀 Como Integrar

### 1. Verificar Status da SEFAZ

Antes de iniciar vendas, você pode verificar se o serviço da SEFAZ está operante para a UF configurada.

```typescript
import { checkSefazStatus } from '@/lib/tauri';

async function checkService() {
  try {
    const status = await checkSefazStatus('SP', 2); // 2 = Homologação
    if (status.active) {
      console.log('SEFAZ Operante:', status.statusMessage);
    } else {
      console.warn('SEFAZ Indisponível:', status.statusMessage);
    }
  } catch (error) {
    console.error('Erro de comunicação:', error);
  }
}
```

### 2. Emitir NFC-e

A emissão processa o XML, assina, envia, gera QR Code e retorna os dados para impressão.

```typescript
import { emitNfce, EmitNfceRequest } from '@/lib/tauri';

const payload: EmitNfceRequest = {
  // Dados Básicos
  saleId: 'venda-123',
  total: 150.0,
  discount: 0,
  paymentMethod: 'PIX',
  paymentValue: 150.0,

  // Itens da Venda
  items: [
    {
      code: '123',
      description: 'Coca Cola 2L',
      ncm: '22021000',
      cfop: '5102',
      unit: 'UN',
      quantity: 1,
      unitValue: 10.0,
      totalValue: 10.0,
      icmsOrigin: 0, // 0 = Nacional
      icmsCst: '102', // Simples Nacional
      pisCst: '07', // Isento
      cofinsCst: '07', // Isento
    },
    // ... outros itens
  ],

  // Configuração do Emitente (Carregar do Banco/Settings)
  emitterCnpj: '12345678000199',
  emitterName: 'MINHA LOJA LTDA',
  emitterIe: '123456789',
  emitterAddress: 'Rua Principal, 100',
  emitterCity: 'São Paulo',
  emitterCityCode: '3550308',
  emitterUf: 'SP',
  emitterCep: '01000000',

  // Configuração Fiscal
  serie: 1,
  numero: 500, // Próximo número sequencial
  environment: 2, // 2 = Homologação (Testes)
  cscId: '000001',
  csc: 'AABBCCDD...', // Token CSC

  // Certificado
  certPath: '/caminho/para/certificado.pfx',
  certPassword: 'senha-do-certificado',
};

async function finalizeSale() {
  const response = await emitNfce(payload);

  if (response.success) {
    console.log('Autorizada!', response.accessKey);

    // Imprimir DANFE
    if (response.danfeEscpos) {
      // Enviar bytes para impressora
      await printBytes(response.danfeEscpos);
    }
  } else {
    console.error('Rejeição:', response.message);
    // Mostrar erro ao usuário e permitir tentar novamente ou contigência
  }
}
```

## 🛠️ Tratamento de Erros

O backend retorna erros detalhados em caso de:

- Certificado inválido ou vencido
- Erro de validação XML (campos obrigatórios, NCM inválido)
- Rejeição SEFAZ (duplicidade, dados cadastrais inválidos)
- Falha de conexão de rede

Sempre envolva as chamadas em blocos `try/catch`.

## 📦 Tipos Disponíveis

Todos os tipos estão disponíveis em `@/types/nfce`:

- `EmitNfceRequest`
- `EmissionResponse`
- `StatusResponse`
- `NfceItem`

---

**Observação:** Em produção, nunca hardcode caminhos de certificado ou senhas. Utilize a store de `Settings` para recuperar essas informações de forma segura.
