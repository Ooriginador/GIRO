/**
 * @file SettingsPage - Configurações do Sistema
 * @description Configurações gerais, impressora, balança e preferências
 */

import { ContingencyManager } from '@/components/nfce/ContingencyManager';
import { FiscalSettings, LicenseSettings, MobileServerSettings } from '@/components/settings';
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
import { seedDatabase, setSetting } from '@/lib/tauri';
import { useSettingsStore } from '@/stores';
import {
  Bell,
  Building2,
  Database,
  FileCode,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Printer,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Smartphone,
  Sun,
  Volume2,
} from 'lucide-react';
import { useState, type FC } from 'react';

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

  const [printerModel, setPrinterModel] = useState(printer.model);
  const [printerPort, setPrinterPort] = useState(printer.port || '');
  const [printerEnabled, setPrinterEnabled] = useState(printer.enabled);

  const [scaleModel, setScaleModel] = useState(scale.model);
  const [scalePort, setScalePort] = useState(scale.port);
  const [scaleEnabled, setScaleEnabled] = useState(scale.enabled);

  // const [alertsEnabled, setAlertsEnabled] = useState(true); // Unused

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
      });

      setPrinter({
        enabled: printerEnabled,
        model: printerModel,
        port: printerPort,
      });

      setScale({
        enabled: scaleEnabled,
        model: scaleModel,
        port: scalePort,
      });

      // Persiste no banco de dados via Tauri
      await Promise.all([
        setSetting('company.name', companyName, 'string'),
        setSetting('company.tradeName', companyTradeName, 'string'),
        setSetting('company.cnpj', companyDocument, 'string'),
        setSetting('company.address', companyAddress, 'string'),
        setSetting('company.city', companyCity, 'string'),
        setSetting('company.state', companyState, 'string'),
        setSetting('company.phone', companyPhone, 'string'),
        setSetting('printer.enabled', String(printerEnabled), 'boolean'),
        setSetting('printer.model', printerModel, 'string'),
        setSetting('printer.port', printerPort, 'string'),
        setSetting('scale.enabled', String(scaleEnabled), 'boolean'),
        setSetting('scale.model', scaleModel, 'string'),
        setSetting('scale.port', scalePort, 'string'),
      ]);

      toast({
        title: 'Configurações salvas',
        description: 'Todas as configurações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-[900px]">
          <TabsTrigger value="general">
            <Building2 className="mr-2 h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="license">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Licença
          </TabsTrigger>
          <TabsTrigger value="fiscal">
            <FileCode className="mr-2 h-4 w-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="hardware">
            <Printer className="mr-2 h-4 w-4" />
            Hardware
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Smartphone className="mr-2 h-4 w-4" />
            Mobile
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
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
                <Building2 className="h-5 w-5" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licença */}
        <TabsContent value="license" className="space-y-6">
          <LicenseSettings />
        </TabsContent>

        {/* Hardware */}
        <TabsContent value="hardware" className="space-y-6">
          {/* Impressora */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5" />
                    Impressora Térmica
                  </CardTitle>
                  <CardDescription>Configure a impressora de cupons</CardDescription>
                </div>
                <Switch checked={printerEnabled} onCheckedChange={setPrinterEnabled} />
              </div>
            </CardHeader>
            <CardContent
              className={`space-y-4 ${!printerEnabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="printerModel">Modelo</Label>
                  <Select value={printerModel} onValueChange={setPrinterModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EPSON TM-T20">EPSON TM-T20</SelectItem>
                      <SelectItem value="EPSON TM-T88">EPSON TM-T88</SelectItem>
                      <SelectItem value="ELGIN I9">ELGIN I9</SelectItem>
                      <SelectItem value="BEMATECH MP-4200">BEMATECH MP-4200</SelectItem>
                      <SelectItem value="GENERIC">Genérica (ESC/POS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="printerPort">Porta</Label>
                  <Select value={printerPort} onValueChange={setPrinterPort}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USB">USB</SelectItem>
                      <SelectItem value="COM1">COM1</SelectItem>
                      <SelectItem value="COM2">COM2</SelectItem>
                      <SelectItem value="COM3">COM3</SelectItem>
                      <SelectItem value="LPT1">LPT1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Testar Impressora
              </Button>
            </CardContent>
          </Card>

          {/* Balança */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Balança
                  </CardTitle>
                  <CardDescription>Configure a balança para produtos pesáveis</CardDescription>
                </div>
                <Switch checked={scaleEnabled} onCheckedChange={setScaleEnabled} />
              </div>
            </CardHeader>
            <CardContent
              className={`space-y-4 ${!scaleEnabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="scaleModel">Modelo</Label>
                  <Select value={scaleModel} onValueChange={setScaleModel}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="scalePort">Porta Serial</Label>
                  <Select value={scalePort} onValueChange={setScalePort}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COM1">COM1</SelectItem>
                      <SelectItem value="COM2">COM2</SelectItem>
                      <SelectItem value="COM3">COM3</SelectItem>
                      <SelectItem value="COM4">COM4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Testar Balança
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mobile */}
        <TabsContent value="mobile" className="space-y-6">
          <MobileServerSettings />
        </TabsContent>

        {/* Aparência */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Tema
              </CardTitle>
              <CardDescription>Personalize a aparência do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Sun className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="font-medium">Claro</p>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Moon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-medium">Escuro</p>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'system'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
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
                <Bell className="h-5 w-5" />
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
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
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
                <Database className="h-5 w-5" />
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
