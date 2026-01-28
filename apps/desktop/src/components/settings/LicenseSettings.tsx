import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { activateLicense, setSetting, validateLicense } from '@/lib/tauri';
import { useLicenseStore } from '@/stores/license-store';
import { Key, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LicenseSettings() {
  const {
    licenseKey: storeKey,
    licenseInfo: storeInfo,
    state: storeState,
    setLicenseKey,
    setLicenseInfo,
    updateLastValidation,
    hydrateFromDisk,
    isHydrated,
  } = useLicenseStore();

  const [inputKey, setInputKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Sync input field with store key when it loads
  useEffect(() => {
    if (storeKey && !inputKey) {
      setInputKey(storeKey);
    }
  }, [storeKey, inputKey]);

  // Ensure store is hydrated
  useEffect(() => {
    if (!isHydrated) {
      hydrateFromDisk();
    }
  }, [isHydrated, hydrateFromDisk]);

  const handleActivate = async () => {
    if (!inputKey.trim()) {
      toast({
        title: 'Chave Obrigatória',
        description: 'Por favor, insira uma chave de ativação.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await activateLicense(inputKey);

      // Update Store
      setLicenseKey(inputKey);
      setLicenseInfo(result);
      updateLastValidation();

      // Save key to local database for legacy support/redundancy
      await setSetting('system.license_key', inputKey, 'string');

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

  const handleSync = async () => {
    if (!storeKey) {
      toast({
        title: 'Licença não configurada',
        description: 'Ative uma licença antes de sincronizar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await validateLicense(storeKey);
      setLicenseInfo(result);
      updateLastValidation();

      toast({
        title: 'Sincronização Concluída',
        description: 'Dados atualizados com sucesso.',
      });
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Falha ao sincronizar com servidor.';
      
      // Mensagens mais amigáveis para erros comuns
      let userMessage = errorMessage;
      if (errorMessage.includes('não encontrada no servidor')) {
        userMessage = 'Licença não encontrada no servidor. Verifique se a chave está correta ou entre em contato com o suporte.';
      } else if (errorMessage.includes('Hardware não autorizado')) {
        userMessage = 'Este computador não está autorizado para usar esta licença. Ative novamente ou contate o suporte.';
      } else if (errorMessage.includes('expirada')) {
        userMessage = 'Sua licença expirou. Renove sua assinatura para continuar usando o sistema.';
      }

      toast({
        title: 'Erro na Sincronização',
        description: userMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Vitalício';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return 'Data Inválida';
    }
  };

  if (!isHydrated || (storeState === 'loading' && !storeInfo)) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const isLicenseActive = storeState === 'valid' || storeInfo?.status === 'active';

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
          {storeInfo ? (
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
                    {storeInfo.message ||
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
                  <span className="font-medium capitalize">{storeInfo.status}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Expira em</span>
                  <span className="font-medium">{formatDate(storeInfo.expires_at)}</span>
                </div>
                {storeInfo.company_name && (
                  <div className="col-span-2">
                    <span className="text-gray-500 block">Licenciado para</span>
                    <span className="font-medium">{storeInfo.company_name}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Agora
                </Button>
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
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="font-mono uppercase"
                disabled={isLoading}
              />
              <Button onClick={handleActivate} disabled={isLoading || !inputKey}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {storeInfo ? 'Reativar' : 'Ativar'}
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
