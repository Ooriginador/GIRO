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
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { CheckCircle2, FileCode, Loader2, ShieldCheck, Wifi, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const FiscalSettings = () => {
  // Estados locais sincronizados com o banco
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [uf, setUf] = useState('SP');
  const [environment, setEnvironment] = useState('2');
  const [serie, setSerie] = useState('1');
  const [nextNumber, setNextNumber] = useState('1');
  const [cscId, setCscId] = useState('');
  const [csc, setCsc] = useState('');
  const [certPath, setCertPath] = useState('');
  const [certPassword, setCertPassword] = useState('');

  // Estado do teste de conexão
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Carregar configurações iniciais do backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<{
          enabled: boolean;
          uf: string;
          environment: number;
          serie: number;
          nextNumber: number;
          cscId?: string;
          csc?: string;
          certPath?: string;
          certPassword?: string;
        }>('get_fiscal_settings');
        setEnabled(settings.enabled);
        setUf(settings.uf);
        setEnvironment(settings.environment.toString());
        setSerie(settings.serie.toString());
        setNextNumber(settings.nextNumber.toString());
        setCscId(settings.cscId || '');
        setCsc(settings.csc || '');
        setCertPath(settings.certPath || '');
        setCertPassword(settings.certPassword || '');
      } catch (err) {
        toast.error('Erro ao carregar configurações fiscais');
        console.error((err as Error)?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke('update_fiscal_settings', {
        data: {
          enabled,
          uf,
          environment: parseInt(environment),
          serie: parseInt(serie),
          nextNumber: parseInt(nextNumber),
          cscId: cscId || null,
          csc: csc || null,
          certPath: certPath || null,
          certPassword: certPassword || null,
        },
      });
      toast.success('Configurações fiscais salvas!');
    } catch (err) {
      toast.error('Falha ao salvar configurações', {
        description: String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCert = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Certificado Digital',
            extensions: ['pfx', 'p12'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        setCertPath(selected);
      }
    } catch (err) {
      console.error('Falha ao selecionar arquivo', (err as Error)?.message ?? String(err));
    }
  };

  // Testar conexão com a SEFAZ
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // UF padrão - em produção deveria vir das configurações da empresa
      // const uf = fiscal.uf || 'SP'; // Old line
      // Using local state `uf`
      const response = await invoke<{
        active: boolean;
        statusCode: string;
        statusMessage: string;
        environment: string;
      }>('check_sefaz_status', {
        uf,
        environment: parseInt(environment),
      });

      if (response.active) {
        setConnectionStatus('success');
        toast.success('Conexão estabelecida!', {
          description: `SEFAZ ${uf} operacional (${response.environment})`,
        });
      } else {
        setConnectionStatus('error');
        toast.error('SEFAZ com problemas', {
          description: `${response.statusCode}: ${response.statusMessage}`,
        });
      }
    } catch (err) {
      setConnectionStatus('error');
      toast.error('Falha na conexão', {
        description: String(err),
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Módulo Fiscal (NFC-e)</CardTitle>
              <CardDescription>
                Habilita a emissão de Nota Fiscal de Consumidor Eletrônica
              </CardDescription>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* UF e Ambiente */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Select value={uf} onValueChange={setUf}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SP">São Paulo (SP)</SelectItem>
                        <SelectItem value="RJ">Rio de Janeiro (RJ)</SelectItem>
                        <SelectItem value="MG">Minas Gerais (MG)</SelectItem>
                        <SelectItem value="RS">Rio Grande do Sul (RS)</SelectItem>
                        <SelectItem value="PR">Paraná (PR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select value={environment} onValueChange={setEnvironment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">Homologação</SelectItem>
                        <SelectItem value="1">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Série</Label>
                    <Input type="number" value={serie} onChange={(e) => setSerie(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Próximo Número</Label>
                    <Input
                      type="number"
                      value={nextNumber}
                      onChange={(e) => setNextNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* CSC */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ID do CSC (Token)</Label>
                  <Input
                    placeholder="Ex: 000001"
                    value={cscId}
                    onChange={(e) => setCscId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código CSC (Alfanumérico)</Label>
                  <div className="relative">
                    <Input
                      type="password"
                      className="pr-10"
                      placeholder="Identificador enviado pela SEFAZ"
                      value={csc}
                      onChange={(e) => setCsc(e.target.value)}
                    />
                    <ShieldCheck className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {/* Certificado Digital */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">Certificado Digital (A1)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Arquivo .PFX ou .P12</Label>
                  <div className="flex gap-2">
                    <Input value={certPath} readOnly placeholder="Nenhum arquivo selecionado" />
                    <Button variant="outline" onClick={handleSelectCert}>
                      Selecionar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Senha do Certificado</Label>
                  <Input
                    type="password"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="gap-2"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : connectionStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Conectado
                    </>
                  ) : connectionStatus === 'error' ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      Testar Novamente
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4" />
                      Testar Conexão SEFAZ
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground hidden md:inline">
                  Verifica status do serviço na SEFAZ
                </span>
              </div>

              <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-md text-sm">
              <FileCode className="h-4 w-4" />
              <span>
                Para emitir em Produção, certifique-se de que a empresa está credenciada na SEFAZ do
                seu estado.
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {!enabled && (
        <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground text-sm">
          O módulo fiscal está desativado. As vendas serão registradas apenas internamente
          ("Gerencial").
        </div>
      )}
    </div>
  );
};
