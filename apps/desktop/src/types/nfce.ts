export interface NfceItem {
  code: string;
  description: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  ean?: string;
  icmsOrigin: number;
  icmsCst: string;
  pisCst: string;
  cofinsCst: string;
}

export interface EmitNfceRequest {
  saleId?: string;
  items: NfceItem[];
  total: number;
  discount: number;
  paymentMethod: string;
  paymentValue: number;

  // Emitter
  emitterCnpj: string;
  emitterIe: string;
  emitterName: string;
  emitterTradeName?: string;
  emitterAddress: string;
  emitterCity: string;
  emitterCityCode: string; // IBGE
  emitterState: string;
  emitterUf: string;
  emitterCep: string;
  emitterPhone?: string;

  // NFC-e Config
  serie: number;
  numero: number;
  environment: number; // 1=Prod, 2=Homolog
  cscId: string;
  csc: string;

  // Certificate
  certPath: string;
  certPassword: string;
}

export interface EmissionResponse {
  success: boolean;
  message: string;
  accessKey?: string; // Chave de acesso 44 digitos
  protocol?: string;
  xml?: string; // XML Assinado
  danfeEscpos?: number[]; // Bytes para impressão direta (convertidos de Vec<u8>)
  qrcodeUrl?: string;
}

export interface StatusResponse {
  active: boolean;
  statusCode: string;
  statusMessage: string;
  environment: string;
}

export interface OfflineNote {
  access_key: string; // Snake case from Rust
  xml: string;
  created_at: string;
  status: 'PENDING' | 'TRANSMITTED' | 'ERROR';
}
