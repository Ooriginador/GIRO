import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { activateLicense, getSetting, setSetting, validateLicense } from '@/lib/tauri';
import { LicenseInfo } from '@/types';
import { Key, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function LicenseSettings() {
  const [licenseKey, setLicenseKey] = useState('');
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const validate = useCallback(async (key: string) => {
    setIsLoading(true);
    try {
      const result = await validateLicense(key);
      setInfo(result);
    } catch (error) {
      console.error('Validation failed:', error);
      // Don't clear key, just show error state
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLicense = useCallback(async () => {
    try {
      const storedKey = await getSetting('system.license_key');
      if (storedKey) {
        setLicenseKey(storedKey);
        await validate(storedKey);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to load license:', error);
      setIsLoading(false);
    }
  }, [validate]);

  useEffect(() => {
    loadLicense();
  }, [loadLicense]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;

    setIsLoading(true);
    try {
      const result = await activateLicense(licenseKey);
      setInfo(result);

      // Save key
      await setSetting('system.license_key', licenseKey, 'string');

      toast({
        title: 'Licença Ativada',
        description: 'O sistema foi ativado com sucesso.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Erro na Ativação',
        description:
          typeof error === 'string' ? error : 'Falha ao ativar licença. Verifique a chave.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Vitalício';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isLicenseActive = info?.status === 'active';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isLicenseActive ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Key className="h-5 w-5" />
          )}
          Licença do Sistema
        </CardTitle>
        <CardDescription>Gerencie a ativação e status da sua cópia do GIRO</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {info ? (
            <div
              className={`p-4 rounded-lg border ${
                isLicenseActive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className={`font-semibold ${
                      isLicenseActive ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {isLicenseActive ? 'Licença Ativa' : 'Licença Inválida/Suspensa'}
                  </h3>
                  <p className="text-sm mt-1 text-gray-700">
                    {info.message ||
                      (isLicenseActive ? 'Sistema operando normalmente.' : 'Contate o suporte.')}
                  </p>
                </div>
                {isLicenseActive ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-red-600" />
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Status</span>
                  <span className="font-medium capitalize">{info.status}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Expira em</span>
                  <span className="font-medium">{formatDate(info.expires_at)}</span>
                </div>
                {info.company_name && (
                  <div className="col-span-2">
                    <span className="text-gray-500 block">Licenciado para</span>
                    <span className="font-medium">{info.company_name}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Sistema não ativado. Algumas funcionalidades podem estar limitadas.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="licenseKey">Chave de Ativação</Label>
            <div className="flex gap-2">
              <Input
                id="licenseKey"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="font-mono uppercase"
                disabled={isLoading}
              />
              <Button onClick={handleActivate} disabled={isLoading || !licenseKey}>
                {info ? 'Reativar' : 'Ativar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A licença é vinculada a este computador (Hardware ID).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
