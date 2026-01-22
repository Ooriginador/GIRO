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
import {
  activateLicense,
  getHardwareId,
  restoreLicense,
  setSetting,
  validateLicense,
} from '@/lib/tauri';
import { useLicenseStore } from '@/stores/license-store';
import { AlertCircle, Key, Loader2, Monitor, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LicenseActivationPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [hardwareId, setHardwareId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    setLicenseKey: storeLicenseKey,
    setLicenseInfo,
    setState,
    updateLastValidation,
    hydrateFromDisk,
  } = useLicenseStore();

  const performActivation = useCallback(
    async (key: string) => {
      setIsLoading(true);
      try {
        const info = await activateLicense(key);

        // Store the license in Zustand
        storeLicenseKey(key);
        setLicenseInfo(info);
        updateLastValidation();

        // Also save to settings table for LicenseSettings page compatibility
        try {
          await setSetting('system.license_key', key, 'string');
        } catch (err) {
          console.error(
            'Falha ao salvar license key nas configurações:',
            (err as Error)?.message ?? String(err)
          );
        }

        // Sincronizar dados do proprietário se existirem na licença
        if (info.company_name) {
          try {
            await setSetting('company.name', info.company_name);
          } catch (err) {
            console.error(
              'Falha ao salvar nome da empresa da licença:',
              (err as Error)?.message ?? String(err)
            );
          }
        }

        toast({
          title: 'Licença Ativada!',
          description: info.company_name
            ? `Bem-vindo, ${info.company_name}. Software ativado.`
            : 'Seu software foi ativado com sucesso.',
        });

        console.log('[LicenseActivationPage] Activation success, redirecting in 1.5s...');

        // If server says no admin exists, we MUST go to setup
        // If server says admin exists, we go to root (which checks local admin)
        const targetRoute = info.has_admin === false ? '/setup' : '/';

        setTimeout(() => {
          console.log(`[LicenseActivationPage] Executing navigate to ${targetRoute}`);
          navigate(targetRoute, { replace: true });
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
        setState('unlicensed');
        setIsValidating(false);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, setLicenseInfo, setState, storeLicenseKey, toast, updateLastValidation]
  );

  const validateStoredLicense = useCallback(
    async (key: string) => {
      try {
        const info = await validateLicense(key);
        setLicenseInfo(info);
        updateLastValidation();

        if (info.status === 'active') {
          // License is valid, redirect to root for proper routing
          navigate('/', { replace: true });
        } else {
          setIsValidating(false);
        }
      } catch (error) {
        console.error('License validation failed:', (error as Error)?.message ?? String(error));
        setState('error');
        setIsValidating(false);
      }
    },
    [navigate, setLicenseInfo, setState, updateLastValidation]
  );

  // Check for stored license on mount
  useEffect(() => {
    const initialize = async () => {
      // Timeout de segurança para não ficar preso no loader se o backend não responder
      const timeoutId = setTimeout(() => {
        if (isValidating) {
          console.warn('License initialization timed out, showing form.');
          setIsValidating(false);
          const currentState = useLicenseStore.getState().state;
          if (currentState === 'loading') {
            setState('unlicensed');
          }
        }
      }, 5000);

      try {
        console.log('[LicenseActivationPage] Initializing...');
        // Get hardware ID
        const hwId = await getHardwareId();
        console.log('[LicenseActivationPage] Hardware ID:', hwId);
        setHardwareId(hwId);

        // Initialize from disk/local state
        console.log('[LicenseActivationPage] Hydrating from disk...');
        await hydrateFromDisk();

        const store = useLicenseStore.getState();
        const currentKey = store.licenseKey;
        console.log(
          `[LicenseActivationPage] Post-hydration: key=${currentKey}, state=${store.state}`
        );

        if (currentKey) {
          setLicenseKey(currentKey);

          // Check if we are within grace period (7 days) OR if already valid
          if (store.isWithinGracePeriod() || store.state === 'valid') {
            console.log(
              '[LicenseActivationPage] Valid license or within grace period, proceeding to root'
            );
            clearTimeout(timeoutId);
            navigate('/', { replace: true });
            return;
          }

          // Not in grace period and not valid, MUST validate online
          console.log('[LicenseActivationPage] Triggering online validation...');
          await validateStoredLicense(currentKey);
        } else {
          try {
            const restoredKey = await restoreLicense();
            if (restoredKey) {
              console.log('[LicenseActivationPage] License restored!', restoredKey);
              toast({
                title: 'Licença Restaurada',
                description: 'Sua licença foi encontrada e recuperada automaticamente!',
                duration: 5000,
              });
              setLicenseKey(restoredKey);
              setIsValidating(false); // Stop "Checking license..." spinner to show activation spinner or success

              // Trigger activation automatically using the new function
              await performActivation(restoredKey);
            } else {
              console.log('[LicenseActivationPage] No license to restore.');
              setState('unlicensed');
              setIsValidating(false);
            }
          } catch (restoreErr) {
            console.warn(
              '[LicenseActivationPage] Restore failed:',
              (restoreErr as Error)?.message ?? String(restoreErr)
            );
            setState('unlicensed');
            setIsValidating(false);
          }
        }
      } catch (error) {
        console.error(
          '[LicenseActivationPage] Failed to initialize license check:',
          (error as Error)?.message ?? String(error)
        );
        setState('error');
        setIsValidating(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrateFromDisk, navigate, setState, validateStoredLicense, performActivation, toast]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      toast({
        title: 'Chave de Licença Obrigatória',
        description: 'Por favor, insira sua chave de licença.',
        variant: 'destructive',
      });
      return;
    }

    await performActivation(licenseKey.trim());
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
    console.log(`[LicenseActivationPage] Showing loading screen (isValidating=${isValidating})`);
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
            id="activate-btn"
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
              href="mailto:suporte@arkheion-tiktrend.com.br"
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
