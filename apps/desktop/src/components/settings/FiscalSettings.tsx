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
import { useSettingsStore } from '@/stores/settings-store';
import { open } from '@tauri-apps/plugin-dialog';
import { FileCode, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

export const FiscalSettings = () => {
  const { fiscal, setFiscalConfig } = useSettingsStore();

  // Local state
  const [enabled, setEnabled] = useState(fiscal.enabled);
  const [environment, setEnvironment] = useState(fiscal.environment.toString());
  const [serie, setSerie] = useState(fiscal.serie.toString());
  const [nextNumber, setNextNumber] = useState(fiscal.nextNumber.toString());
  const [cscId, setCscId] = useState(fiscal.cscId);
  const [csc, setCsc] = useState(fiscal.csc);
  const [certPath, setCertPath] = useState(fiscal.certPath);
  const [certPassword, setCertPassword] = useState(fiscal.certPassword);

  // Update local state when store changes
  useEffect(() => {
    setEnabled(fiscal.enabled);
    setEnvironment(fiscal.environment.toString());
    setSerie(fiscal.serie.toString());
    setNextNumber(fiscal.nextNumber.toString());
    setCscId(fiscal.cscId);
    setCsc(fiscal.csc);
    setCertPath(fiscal.certPath);
    setCertPassword(fiscal.certPassword);
  }, [fiscal]);

  // Sync to store on change
  useEffect(() => {
    setFiscalConfig({
      enabled,
      environment: parseInt(environment),
      serie: parseInt(serie),
      nextNumber: parseInt(nextNumber),
      cscId,
      csc,
      certPath,
      certPassword,
    });
  }, [
    enabled,
    environment,
    serie,
    nextNumber,
    cscId,
    csc,
    certPath,
    certPassword,
    setFiscalConfig,
  ]);

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
      console.error('Falha ao selecionar arquivo', err);
    }
  };

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
              {/* Ambiente e Série */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ambiente de Emissão</Label>
                  <Select value={environment} onValueChange={setEnvironment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Homologação (Testes)</SelectItem>
                      <SelectItem value="1">Produção (Validade Jurídica)</SelectItem>
                    </SelectContent>
                  </Select>
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
