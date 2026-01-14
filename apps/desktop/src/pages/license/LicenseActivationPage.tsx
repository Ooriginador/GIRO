/**
 * License Activation Page
 *
 * Tela bloqueante que exige a ativação da licença antes de qualquer acesso ao sistema.
 * O usuário deve inserir a license key que comprou para ativar o software.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { activateLicense, getHardwareId, setSetting, validateLicense } from '@/lib/tauri';
import { useLicenseStore } from '@/stores/license-store';
import { AlertCircle, Key, Loader2, Monitor, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LicenseActivationPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [hardwareId, setHardwareId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    licenseKey: storedKey,
    setLicenseKey: storeLicenseKey,
    setLicenseInfo,
    setState,
    updateLastValidation,
  } = useLicenseStore();

  // Check for stored license on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get hardware ID
        const hwId = await getHardwareId();
        setHardwareId(hwId);

        // Check for stored license
        if (storedKey) {
          setLicenseKey(storedKey);
          await validateStoredLicense(storedKey);
        } else {
          setState('unlicensed');
          setIsValidating(false);
        }
      } catch (error) {
        console.error('Failed to initialize license check:', error);
        setState('error');
        setIsValidating(false);
      }
    };

    initialize();
  }, []);

  const validateStoredLicense = async (key: string) => {
    try {
      const info = await validateLicense(key);
      setLicenseInfo(info);
      updateLastValidation();

      if (info.status === 'active') {
        // License is valid, redirect to login
        navigate('/login', { replace: true });
      } else {
        setIsValidating(false);
      }
    } catch (error) {
      console.error('License validation failed:', error);
      setState('error');
      setIsValidating(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      toast({
        title: 'Chave de Licença Obrigatória',
        description: 'Por favor, insira sua chave de licença.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const info = await activateLicense(licenseKey.trim());

      // Store the license
      storeLicenseKey(licenseKey.trim());
      setLicenseInfo(info);
      updateLastValidation();

      // Sincronizar dados do proprietário se existirem na licença
      if (info.company_name) {
        try {
          await setSetting('company.name', info.company_name);
        } catch (err) {
          console.error('Falha ao salvar nome da empresa da licença:', err);
        }
      }

      toast({
        title: 'Licença Ativada!',
        description: info.company_name
          ? `Bem-vindo, ${info.company_name}. Software ativado.`
          : 'Seu software foi ativado com sucesso.',
      });

      // Redirect to login (which will then lead to wizard if not configured)
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (error) {
      const errorMessage =
        typeof error === 'string'
          ? error
          : 'Falha ao ativar licença. Verifique a chave e tente novamente.';

      toast({
        title: 'Erro na Ativação',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format license key as user types (XXXX-XXXX-XXXX-XXXX)
  const formatLicenseKey = (value: string) => {
    // Remove non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Add dashes every 4 characters
    const parts = cleaned.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted.slice(0, 24)); // Max: GIRO-XXXX-XXXX-XXXX-XXXX (24 chars)
  };

  // Loading state while validating stored license
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando licença...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Key className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ativar Licença</CardTitle>
          <CardDescription>
            Insira sua chave de licença para ativar o GIRO PDV neste computador.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* License Key Input */}
          <div className="space-y-2">
            <Label htmlFor="license-key">Chave de Licença</Label>
            <Input
              id="license-key"
              type="text"
              placeholder="GIRO-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={handleKeyChange}
              className="font-mono text-lg tracking-wider text-center"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground text-center">
              A chave foi enviada para seu email após a compra
            </p>
          </div>

          {/* Hardware Info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4" />
              <span>Identificador do Hardware:</span>
            </div>
            <code className="block text-xs bg-background rounded p-2 break-all">
              {hardwareId || 'Carregando...'}
            </code>
            <p className="text-xs text-muted-foreground">
              Sua licença será vinculada a este computador.
            </p>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Sobre a vinculação de hardware</p>
              <p className="text-blue-700 dark:text-blue-200">
                Cada licença pode ser usada em apenas um computador por vez. Se precisar trocar de
                máquina, entre em contato com o suporte.
              </p>
            </div>
          </div>

          {/* Activate Button */}
          <Button
            onClick={handleActivate}
            disabled={isLoading || !licenseKey.trim()}
            className="w-full h-12 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Ativar Licença
              </>
            )}
          </Button>

          {/* Help Links */}
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <a
              href="https://giro-website-production.up.railway.app/#precos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary underline-offset-4 hover:underline"
            >
              Comprar licença
            </a>
            <a
              href="mailto:suporte@arkheion.com.br"
              className="hover:text-primary underline-offset-4 hover:underline"
            >
              Precisa de ajuda? Contate o suporte
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LicenseActivationPage;
