/**
 * @file SettingsPage - Configurações do Sistema
 * @description Configurações gerais, impressora, balança e preferências
 */

import { ContingencyManager } from '@/components/nfce/ContingencyManager';
import {
  FiscalSettings,
  LicenseSettings,
  MobileServerSettings,
  NetworkSettings,
  CloudLoginDialog,
} from '@/components/settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { invoke, seedDatabase, setSetting, syncBackupToCloud } from '@/lib/tauri';
import { createLogger } from '@/lib/logger';
import { useSettingsStore, useLicenseStore } from '@/stores';
import {
  Bell,
  Building2,
  Database,
  FileCode,
  Image,
  Loader2,
  Monitor,
  Moon,
  Network,
  Palette,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  Volume2,
  Cloud,
} from 'lucide-react';
import type { TauriResponse } from '@/types';
import { useCallback, useEffect, useState, type FC } from 'react';

type SerialPort = string;

type BackendPrinterModel = 'epson' | 'elgin' | 'bematech' | 'daruma' | 'generic';
type BackendPrinterConnection = 'usb' | 'serial' | 'network';
type BackendScaleProtocol = 'toledo' | 'filizola' | 'elgin' | 'urano' | 'generic';

const mapPrinterModelToBackend = (model: string): BackendPrinterModel => {
  const upper = model.toUpperCase();
  if (upper.includes('ELGIN')) return 'elgin';
  if (upper.includes('BEMATECH')) return 'bematech';
  if (upper.includes('DARUMA')) return 'daruma';
  if (upper.includes('EPSON')) return 'epson';
  return 'generic';
};

const mapPrinterPortToConnection = (port: string): BackendPrinterConnection => {
  const trimmed = port.trim();
  if (!trimmed) return 'serial';
  if (trimmed === 'USB' || trimmed.includes('/dev/usb/lp') || trimmed.includes('/dev/lp'))
    return 'usb';
  if (trimmed.includes(':')) return 'network';
  return 'serial';
};

const mapScaleModelToProtocol = (model: string): BackendScaleProtocol => {
  const upper = model.toUpperCase();
  if (upper.includes('TOLEDO')) return 'toledo';
  if (upper.includes('FILIZOLA')) return 'filizola';
  if (upper.includes('ELGIN')) return 'elgin';
  if (upper.includes('URANO')) return 'urano';
  return 'generic';
};

const settingsLogger = createLogger('Settings');

export const SettingsPage: FC = () => {
  const { theme, setTheme, printer, setPrinter, scale, setScale, company, setCompany } =
    useSettingsStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Local form state - Company
  const [companyName, setCompanyName] = useState(company.name);
  const [companyTradeName, setCompanyTradeName] = useState(company.tradeName || '');
  const [companyDocument, setCompanyDocument] = useState(company.cnpj || '');
  const [companyAddress, setCompanyAddress] = useState(company.address || '');
  const [companyCity, setCompanyCity] = useState(company.city || '');
  const [companyState, setCompanyState] = useState(company.state || '');
  const [companyPhone, setCompanyPhone] = useState(company.phone || '');
  const [companyLogo, setCompanyLogo] = useState(company.logo || '');

  const [printerModel, setPrinterModel] = useState(printer.model);
  const [printerPort, setPrinterPort] = useState(printer.port || '');
  const [printerEnabled, setPrinterEnabled] = useState(printer.enabled);
  const [printerBaudRate, setPrinterBaudRate] = useState<number>(printer.baudRate ?? 9600);
  const [printerDataBits, setPrinterDataBits] = useState<number>(printer.dataBits ?? 8);
  const [printerParity, setPrinterParity] = useState<'none' | 'odd' | 'even'>(
    (printer.parity as 'none' | 'odd' | 'even') ?? 'none'
  );
  const [printerTimeoutMs, setPrinterTimeoutMs] = useState<number>(printer.timeoutMs ?? 3000);

  const [scaleModel, setScaleModel] = useState(scale.model);
  const [scalePort, setScalePort] = useState(scale.port);
  const [scaleEnabled, setScaleEnabled] = useState(scale.enabled);

  const [availablePorts, setAvailablePorts] = useState<SerialPort[]>([]);
  const [isLoadingPorts, setIsLoadingPorts] = useState(false);

  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerMode, setScannerMode] = useState<'hid' | 'serial'>('hid');
  const [scannerPort, setScannerPort] = useState('');
  const [lastScan, setLastScan] = useState('');

  const [testQrSvg, setTestQrSvg] = useState<string>('');
  const [testQrValue, setTestQrValue] = useState<string>('');

  const [isSyncingLicense, setIsSyncingLicense] = useState(false);
  const { cloudToken, setCloudToken } = useLicenseStore();
  const [isCloudLoginOpen, setIsCloudLoginOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const fetchPorts = useCallback(async () => {
    setIsLoadingPorts(true);
    try {
      const ports = await invoke<SerialPort[]>('list_hardware_ports');
      setAvailablePorts(ports);
    } catch (error) {
      settingsLogger.error('Erro ao listar portas:', error);
    } finally {
      setIsLoadingPorts(false);
    }
  }, []);

  useEffect(() => {
    fetchPorts();

    // Listen for scan events (Serial Scanner) - Use dynamic import to avoid
    // module-level execution in tests where @tauri-apps/api/event may hang
    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen('scan_event', (event: { payload: { code: string } }) => {
          const { code } = event.payload;
          setLastScan(code);
        });
      } catch (e) {
        settingsLogger.error('Erro ao configurar listener de scan:', e);
      }
    };
    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [fetchPorts]);

  // const [alertsEnabled, setAlertsEnabled] = useState(true); // Unused

  const buildBackendPrinterConfig = () => {
    const connection = mapPrinterPortToConnection(printerPort);

    if (printerPort === 'LPT1') {
      throw new Error('Porta LPT1 não suportada. Use COMx (Serial) ou USB (Linux raw).');
    }

    return {
      enabled: printerEnabled,
      model: mapPrinterModelToBackend(printerModel),
      connection,
      // Para USB, deixar vazio para o backend tentar /dev/usb/lp0 (Linux)
      port: printerPort === 'USB' ? '' : printerPort,
      paper_width: 48,
      auto_cut: printer.autoCut ?? true,
      open_drawer_on_sale: printer.openDrawer ?? true,
      // Serial params (aplicáveis quando connection === 'serial')
      baud_rate: printerBaudRate,
      data_bits: printerDataBits,
      parity: printerParity,
      timeout_ms: printerTimeoutMs,
    };
  };

  const buildBackendScaleConfig = () => {
    return {
      enabled: scaleEnabled,
      protocol: mapScaleModelToProtocol(scaleModel),
      port: scalePort,
      baud_rate: scale.baudRate ?? 9600,
      data_bits: 8,
      parity: 'none',
      stop_bits: 1,
    };
  };

  const handleTestPrinter = async () => {
    try {
      if (!printerEnabled) {
        toast({
          title: 'Impressora desabilitada',
          description: 'Habilite a impressora antes de testar.',
          variant: 'destructive',
        });
        return;
      }

      const config = buildBackendPrinterConfig();
      await invoke('configure_printer', { config });
      await invoke('test_printer');

      toast({
        title: 'Teste enviado',
        description: 'Verifique se a impressora imprimiu a página de teste.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao testar impressora.';
      toast({
        title: 'Erro no teste da impressora',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleTestScale = async () => {
    try {
      if (!scaleEnabled) {
        toast({
          title: 'Balança desabilitada',
          description: 'Habilite a balança antes de testar.',
          variant: 'destructive',
        });
        return;
      }

      const config = buildBackendScaleConfig();
      await invoke('configure_scale', { config });
      await invoke('read_weight');

      toast({
        title: 'Leitura realizada',
        description: 'Se a leitura apareceu sem erro, a conexão está OK.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao testar balança.';
      toast({
        title: 'Erro no teste da balança',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handlePrintTestDocuments = async () => {
    try {
      if (!printerEnabled) {
        toast({
          title: 'Impressora desabilitada',
          description: 'Habilite a impressora antes de imprimir testes.',
          variant: 'destructive',
        });
        return;
      }

      const config = buildBackendPrinterConfig();
      await invoke('configure_printer', { config });
      await invoke('print_test_documents');

      toast({
        title: 'Testes enviados',
        description: 'Nota/OS/Relatório de teste foram enviados para a impressora.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao imprimir testes.';
      toast({
        title: 'Erro ao imprimir testes',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleGenerateTestQr = async () => {
    try {
      const value = `TESTE-QR:${Date.now()}`;
      const svg = await invoke<string>('generate_qr_svg', { data: value });
      setTestQrValue(value);
      setTestQrSvg(svg);

      toast({
        title: 'QR gerado',
        description: 'Aponte o leitor para a tela para testar a leitura.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar QR.';
      toast({
        title: 'Erro ao gerar QR',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Atualiza store local (Zustand com persist)
      setCompany({
        name: companyName,
        tradeName: companyTradeName,
        cnpj: companyDocument,
        address: companyAddress,
        city: companyCity,
        state: companyState,
        phone: companyPhone,
        logo: companyLogo,
      });

      setPrinter({
        enabled: printerEnabled,
        model: printerModel,
        port: printerPort,
        baudRate: printerBaudRate,
        dataBits: printerDataBits,
        parity: printerParity,
        timeoutMs: printerTimeoutMs,
      });

      setScale({
        enabled: scaleEnabled,
        model: scaleModel,
        port: scalePort,
      });

      // Persiste no banco de dados via Tauri (sequencialmente para evitar locks)
      await setSetting('company.name', companyName, 'string');
      await setSetting('company.tradeName', companyTradeName, 'string');
      await setSetting('company.cnpj', companyDocument, 'string');
      await setSetting('company.address', companyAddress, 'string');
      await setSetting('company.city', companyCity, 'string');
      await setSetting('company.state', companyState, 'string');
      await setSetting('company.phone', companyPhone, 'string');
      await setSetting('printer.enabled', String(printerEnabled), 'boolean');
      await setSetting('printer.model', printerModel, 'string');
      await setSetting('printer.port', printerPort, 'string');
      await setSetting('printer.baudRate', String(printerBaudRate ?? 9600), 'number');
      await setSetting('printer.dataBits', String(printerDataBits ?? 8), 'number');
      await setSetting('printer.parity', String(printerParity ?? 'none'), 'string');
      await setSetting('printer.timeoutMs', String(printerTimeoutMs ?? 3000), 'number');
      await setSetting('scale.enabled', String(scaleEnabled), 'boolean');
      await setSetting('scale.model', scaleModel, 'string');
      await setSetting('scale.port', scalePort, 'string');

      // Sincroniza configurações no estado de hardware (em memória)
      try {
        await invoke('configure_printer', {
          config: buildBackendPrinterConfig(),
        });
      } catch {
        // Não bloquear o save por erro de hardware
      }
      try {
        await invoke('configure_scale', { config: buildBackendScaleConfig() });
      } catch {
        // Não bloquear o save por erro de hardware
      }

      toast({
        title: 'Configurações salvas',
        description: 'Todas as configurações foram atualizadas com sucesso.',
      });

      // Sincroniza com o servidor de licenças (Background)
      const { licenseKey } = useLicenseStore.getState();
      if (licenseKey) {
        invoke('update_license_admin', {
          licenseKey,
          data: {
            name: companyName, // Usando nome da empresa como nome do admin para simplificar se não houver campo separado
            email: '', // Email costuma ser fixo ou gerenciado pelo auth, mas o DTO exige.
            // Na prática, o backend deve preservar o email se enviarmos vazio ou buscar o atual.
            phone: companyPhone,
            company_name: companyName,
            company_cnpj: companyDocument,
            company_address: companyAddress,
            company_city: companyCity,
            company_state: companyState,
            pin: '', // O PIN não deve ser alterado aqui sem validação extra
          },
        }).catch((e) => settingsLogger.warn('Erro ao sincronizar com servidor:', e));
      }
    } catch (error) {
      settingsLogger.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncLicense = async () => {
    setIsSyncingLicense(true);
    try {
      // Let's use useLicenseStore if that's where it is
      const key = (await invoke<string | null>('get_setting', { key: 'license_key' })) || '';

      if (!key) {
        toast({
          title: 'Licença não encontrada',
          description: 'Ative sua licença antes de sincronizar.',
          variant: 'destructive',
        });
        return;
      }

      await invoke('validate_license', { licenseKey: key });

      toast({
        title: 'Sincronização concluída',
        description: 'Dados da licença e empresa atualizados com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Falha ao conectar com servidor.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncingLicense(false);
    }
  };

  const handleSyncCloud = async () => {
    if (!cloudToken) {
      setIsCloudLoginOpen(true);
      return;
    }

    setIsSyncingCloud(true);
    try {
      const result = await syncBackupToCloud(cloudToken);
      if (result) {
        toast({
          title: 'Sincronização em Nuvem Concluída',
          description: `Backup enviado com sucesso: ${result.file_key}`,
        });
      }
    } catch (error) {
      // If unauthorized, clear token and prompt login
      if (typeof error === 'string' && (error.includes('401') || error.includes('unauthorized'))) {
        setCloudToken(null);
        setIsCloudLoginOpen(true);
      } else {
        toast({
          title: 'Erro na Sincronização em Nuvem',
          description: typeof error === 'string' ? error : 'Falha ao sincronizar com GIRO Cloud.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure o sistema de acordo com suas necessidades
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Salvar alterações nas configurações"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList
          className="grid w-full grid-cols-7 lg:w-[900px]"
          aria-label="Seções de configuração"
        >
          <TabsTrigger value="general">
            <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="license">
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Licença
          </TabsTrigger>
          <TabsTrigger value="fiscal">
            <FileCode className="mr-2 h-4 w-4" aria-hidden="true" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="hardware">
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Hardware
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Smartphone className="mr-2 h-4 w-4" aria-hidden="true" />
            Mobile
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="mr-2 h-4 w-4" aria-hidden="true" />
            Rede (PC Sync)
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" aria-hidden="true" />
            Aparência
          </TabsTrigger>
          {/*          
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="developer" className="text-red-500 hover:text-red-600">
            <Database className="mr-2 h-4 w-4" />
            Dev
          </TabsTrigger>
*/}
        </TabsList>

        {/* Fiscal */}
        <TabsContent value="fiscal" className="space-y-6">
          <FiscalSettings />
          <ContingencyManager />
        </TabsContent>

        {/* Empresa */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" aria-hidden="true" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>Informações que aparecem nos cupons e relatórios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="companyName">Razão Social *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Empresa LTDA"
                  />
                </div>
                <div>
                  <Label htmlFor="tradeName">Nome Fantasia</Label>
                  <Input
                    id="tradeName"
                    value={companyTradeName}
                    onChange={(e) => setCompanyTradeName(e.target.value)}
                    placeholder="Mercearia do João"
                  />
                </div>
                <div>
                  <Label htmlFor="document">CNPJ/CPF</Label>
                  <Input
                    id="document"
                    value={companyDocument}
                    onChange={(e) => setCompanyDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Rua das Flores, 123 - Centro"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={companyCity}
                    onChange={(e) => setCompanyCity(e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Select value={companyState} onValueChange={setCompanyState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">Acre</SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="AP">Amapá</SelectItem>
                      <SelectItem value="AM">Amazonas</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="DF">Distrito Federal</SelectItem>
                      <SelectItem value="ES">Espírito Santo</SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="MT">Mato Grosso</SelectItem>
                      <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                      <SelectItem value="PA">Pará</SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                      <SelectItem value="RO">Rondônia</SelectItem>
                      <SelectItem value="RR">Roraima</SelectItem>
                      <SelectItem value="SC">Santa Catarina</SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="SE">Sergipe</SelectItem>
                      <SelectItem value="TO">Tocantins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Logo da Empresa */}
              <div className="pt-4 border-t">
                <Label className="text-base font-medium">Logo da Empresa</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Aparece em relatórios, PDFs e exportações
                </p>
                <div className="flex items-start gap-4">
                  {/* Preview do Logo */}
                  <div className="relative flex-shrink-0">
                    {companyLogo ? (
                      <div className="relative group">
                        <img
                          src={companyLogo}
                          alt="Logo da empresa"
                          className="w-24 h-24 object-contain rounded-lg border bg-white p-2"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setCompanyLogo('')}
                          aria-label="Remover logo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Limita a 500KB
                          if (file.size > 500 * 1024) {
                            toast({
                              title: 'Arquivo muito grande',
                              description: 'O logo deve ter no máximo 500KB',
                              variant: 'destructive',
                            });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setCompanyLogo(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {companyLogo ? 'Trocar Logo' : 'Carregar Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG ou WEBP. Máximo 500KB. Recomendado: 200x200px
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licença */}
        <TabsContent value="license" className="space-y-6">
          <LicenseSettings />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" aria-hidden="true" />
                Sincronização Avançada
              </CardTitle>
              <CardDescription>Gerencie seus dados na nuvem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleSyncLicense}
                  disabled={isSyncingLicense}
                  className="w-full justify-start"
                  aria-label="Forçar sincronização de licença e dados com servidor"
                >
                  {isSyncingLicense ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Forçar Sincronização de Licença e Dados
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await invoke<TauriResponse<string>>('create_backup');
                      if (res.success && res.data) {
                        toast({
                          title: 'Backup local criado',
                          description: `Salvo em: ${res.data}`,
                        });
                      }
                    } catch {
                      toast({ title: 'Erro no backup', variant: 'destructive' });
                    }
                  }}
                  className="w-full justify-start"
                  aria-label="Criar backup local do banco de dados"
                >
                  <Database className="mr-2 h-4 w-4" aria-hidden="true" />
                  Criar Backup Local
                </Button>

                <Button
                  variant="default"
                  onClick={handleSyncCloud}
                  disabled={isSyncingCloud}
                  className="w-full justify-start bg-primary/90 hover:bg-primary shadow-sm"
                  aria-label={
                    cloudToken
                      ? 'Sincronizar com GIRO Cloud - conectado'
                      : 'Sincronizar com GIRO Cloud - não conectado'
                  }
                >
                  {isSyncingCloud ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Cloud className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Sincronizar com GIRO Cloud
                  {cloudToken && (
                    <Badge
                      variant="secondary"
                      className="ml-auto bg-green-100 text-green-800 border-green-200"
                    >
                      Conectado
                    </Badge>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <CloudLoginDialog
            open={isCloudLoginOpen}
            onOpenChange={setIsCloudLoginOpen}
            onSuccess={handleSyncCloud}
          />
        </TabsContent>

        {/* Hardware */}
        <TabsContent value="hardware" className="space-y-6">
          {/* Impressora */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5" aria-hidden="true" />
                    Impressora Térmica
                  </CardTitle>
                  <CardDescription>Configure a impressora de cupons</CardDescription>
                </div>
                <Switch
                  checked={printerEnabled}
                  onCheckedChange={setPrinterEnabled}
                  aria-label="Habilitar impressora térmica"
                />
              </div>
            </CardHeader>
            <CardContent
              className={`space-y-4 ${!printerEnabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="printerModel">Modelo da Impressora</Label>
                  <Select value={printerModel} onValueChange={setPrinterModel}>
                    <SelectTrigger id="printerModel">
                      <SelectValue placeholder="Selecione o modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EPSON TM-T20">EPSON TM-T20</SelectItem>
                      <SelectItem value="EPSON TM-T88">EPSON TM-T88</SelectItem>
                      <SelectItem value="ELGIN I9">ELGIN I9</SelectItem>
                      <SelectItem value="BEMATECH MP-4200">BEMATECH MP-4200</SelectItem>
                      <SelectItem value="C3TECH IT-100">C3Tech IT-100</SelectItem>
                      <SelectItem value="GENERIC">Genérica (ESC/POS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="printerPort">Porta de Conexão</Label>
                  <Select value={printerPort} onValueChange={setPrinterPort}>
                    <SelectTrigger id="printerPort">
                      <SelectValue
                        placeholder={
                          isLoadingPorts ? 'Carregando portas...' : 'Selecione a porta...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USB">USB (Automático/Físico)</SelectItem>
                      {availablePorts.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="printerBaud">Velocidade (Baud Rate)</Label>
                  <Select
                    value={String(printerBaudRate)}
                    onValueChange={(v) => setPrinterBaudRate(Number(v))}
                  >
                    <SelectTrigger id="printerBaud">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2400">2400</SelectItem>
                      <SelectItem value="4800">4800</SelectItem>
                      <SelectItem value="9600">9600 (Padrão)</SelectItem>
                      <SelectItem value="19200">19200</SelectItem>
                      <SelectItem value="38400">38400</SelectItem>
                      <SelectItem value="57600">57600</SelectItem>
                      <SelectItem value="115200">115200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="printerDataBits">Bits de Dados</Label>
                  <Select
                    value={String(printerDataBits)}
                    onValueChange={(v) => setPrinterDataBits(Number(v))}
                  >
                    <SelectTrigger id="printerDataBits">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8 (Padrão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="printerParity">Paridade</Label>
                  <Select
                    value={printerParity}
                    onValueChange={(v: string) => setPrinterParity(v as 'none' | 'odd' | 'even')}
                  >
                    <SelectTrigger id="printerParity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (None)</SelectItem>
                      <SelectItem value="even">Par (Even)</SelectItem>
                      <SelectItem value="odd">Ímpar (Odd)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="printerTimeout">Tempo de Resposta (ms)</Label>
                  <Input
                    id="printerTimeout"
                    type="number"
                    value={String(printerTimeoutMs)}
                    onChange={(e) => setPrinterTimeoutMs(Number(e.target.value) || 3000)}
                    placeholder="3000"
                  />
                </div>
              </div>
              <div className="grid gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleTestPrinter}
                  aria-label="Testar comunicação com impressora"
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Testar Comunicação
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePrintTestDocuments}
                  aria-label="Imprimir documentos de teste"
                >
                  <FileCode className="mr-2 h-4 w-4" aria-hidden="true" />
                  Imprimir Documentos de Teste
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" aria-hidden="true" />
                QR Code (Teste de Leitura)
              </CardTitle>
              <CardDescription>
                Gere um QR na tela para validar o leitor (se suportar QR/2D)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateTestQr}
                aria-label="Gerar QR Code de teste"
              >
                <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
                Gerar QR de Teste
              </Button>

              {testQrSvg ? (
                <div className="space-y-2">
                  <div className="rounded-md border p-4 flex items-center justify-center">
                    <div
                      aria-label="QR Code de teste"
                      dangerouslySetInnerHTML={{ __html: testQrSvg }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground break-all">
                    Valor: {testQrValue}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Balança */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" aria-hidden="true" />
                    Balança
                  </CardTitle>
                  <CardDescription>Configure a balança para produtos pesáveis</CardDescription>
                </div>
                <Switch
                  checked={scaleEnabled}
                  onCheckedChange={setScaleEnabled}
                  aria-label="Habilitar balança"
                />
              </div>
            </CardHeader>
            <CardContent
              className={`space-y-4 ${!scaleEnabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="scaleModel">Modelo da Balança</Label>
                  <Select value={scaleModel} onValueChange={setScaleModel}>
                    <SelectTrigger id="scaleModel">
                      <SelectValue placeholder="Selecione o modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOLEDO Prix 4">Toledo Prix 4</SelectItem>
                      <SelectItem value="FILIZOLA">Filizola</SelectItem>
                      <SelectItem value="URANO">Urano</SelectItem>
                      <SelectItem value="GENERIC">Genérica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scalePort">Porta Serial de Conexão</Label>
                  <Select value={scalePort} onValueChange={setScalePort}>
                    <SelectTrigger id="scalePort">
                      <SelectValue placeholder="Selecione a porta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePorts.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTestScale}
                aria-label="Testar comunicação com balança"
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Testar Comunicação da Balança
              </Button>
            </CardContent>
          </Card>

          {/* Scanner */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" aria-hidden="true" />
                    Leitor de Código de Barras
                  </CardTitle>
                  <CardDescription>Configure o scanner C3Tech LB-129 ou genérico</CardDescription>
                </div>
                <Switch
                  checked={scannerEnabled}
                  onCheckedChange={setScannerEnabled}
                  aria-label="Habilitar leitor de código de barras"
                />
              </div>
            </CardHeader>
            <CardContent
              className={`space-y-4 ${!scannerEnabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Modo de Operação</Label>
                  <Select
                    value={scannerMode}
                    onValueChange={(v: 'hid' | 'serial') => setScannerMode(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hid">USB HID (Emulação de Teclado)</SelectItem>
                      <SelectItem value="serial">Serial (Segundo Plano)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scannerMode === 'serial' && (
                  <div>
                    <Label>Porta Serial do Leitor</Label>
                    <Select value={scannerPort} onValueChange={setScannerPort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a porta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePorts.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {scannerMode === 'serial' && (
                <Button
                  variant="outline"
                  className="w-full"
                  aria-label="Iniciar leitor de código de barras em modo serial"
                  onClick={async () => {
                    try {
                      await invoke('start_serial_scanner', {
                        port: scannerPort,
                        baud: 9600,
                      });
                      toast({
                        title: 'Leitor iniciado',
                        description: 'O leitor serial está ativo e pronto para uso.',
                      });
                    } catch (e: unknown) {
                      const message = e instanceof Error ? e.message : String(e);
                      toast({
                        title: 'Erro ao iniciar leitor',
                        description: message || 'Falha desconhecida',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Iniciar Leitor Serial
                </Button>
              )}

              {lastScan && (
                <div className="p-4 rounded-lg bg-muted text-center border">
                  <p className="text-xs text-muted-foreground mb-1">Última Leitura realizada:</p>
                  <p className="text-xl font-mono font-bold tracking-widest">{lastScan}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mobile */}
        <TabsContent value="mobile" className="space-y-6">
          <MobileServerSettings />
        </TabsContent>

        {/* Network */}
        <TabsContent value="network" className="space-y-6">
          <NetworkSettings />
        </TabsContent>

        {/* Aparência */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" aria-hidden="true" />
                Tema
              </CardTitle>
              <CardDescription>Personalize a aparência do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-4 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Selecionar tema do sistema"
              >
                <button
                  onClick={() => setTheme('light')}
                  role="radio"
                  aria-checked={theme === 'light'}
                  aria-label="Tema claro"
                  className={`p-4 rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Sun className="h-8 w-8 mx-auto mb-2 text-yellow-500" aria-hidden="true" />
                  <p className="font-medium">Claro</p>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  role="radio"
                  aria-checked={theme === 'dark'}
                  aria-label="Tema escuro"
                  className={`p-4 rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Moon className="h-8 w-8 mx-auto mb-2 text-blue-500" aria-hidden="true" />
                  <p className="font-medium">Escuro</p>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  role="radio"
                  aria-checked={theme === 'system'}
                  aria-label="Tema do sistema"
                  className={`p-4 rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    theme === 'system'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Monitor
                    className="h-8 w-8 mx-auto mb-2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="font-medium">Sistema</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" aria-hidden="true" />
                Alertas e Notificações
              </CardTitle>
              <CardDescription>Configure quando e como receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Alertas de Estoque Baixo</p>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando produtos atingirem o estoque mínimo
                  </p>
                </div>
                <Switch checked={false} onCheckedChange={() => {}} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Alertas de Validade</p>
                  <p className="text-sm text-muted-foreground">
                    Notificar sobre produtos próximos ao vencimento
                  </p>
                </div>
                <Switch checked={true} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Sons</p>
                    <p className="text-sm text-muted-foreground">Reproduzir sons em ações do PDV</p>
                  </div>
                </div>
                <Switch checked={true} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Developer Tools */}
        <TabsContent value="developer" className="space-y-6">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Database className="h-5 w-5" aria-hidden="true" />
                Área de Perigo (Desenvolvedor)
              </CardTitle>
              <CardDescription className="text-red-600">
                Ações irreversíveis para teste e desenvolvimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex bg-white p-4 rounded-lg border border-red-100 items-center justify-between">
                <div>
                  <p className="font-medium text-red-900">Popular Banco de Dados</p>
                  <p className="text-sm text-red-600">
                    Gera dados de teste (5 meses de histórico, produtos, vendas). Pode demorar
                    alguns minutos.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const confirm = await window.confirm(
                      'Isso vai gerar muitos dados. Tem certeza?'
                    );
                    if (!confirm) return;

                    try {
                      const msg = await seedDatabase(); // Auto-imported or imported manual
                      alert(msg);
                    } catch (e) {
                      alert('Erro ao popular: ' + e);
                    }
                  }}
                >
                  Popular Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
