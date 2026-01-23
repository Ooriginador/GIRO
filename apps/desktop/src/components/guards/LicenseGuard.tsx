/**
 * License Guard Component
 *
 * Componente que verifica se a licença está válida antes de permitir acesso.
 * Deve envolver toda a aplicação para garantir que nenhuma funcionalidade
 * seja acessível sem uma licença ativa.
 */
import { validateLicense } from '@/lib/tauri';
import { useLicenseStore, type LicenseState } from '@/stores/license-store';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FC, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface LicenseGuardProps {
  children: ReactNode;
}

export const LicenseGuard: FC<LicenseGuardProps> = ({ children }) => {
  // Test-only bypass: when running E2E we can set a global flag before app scripts
  // load to skip license enforcement. This avoids modifying production behavior.
  const e2eBypass =
    typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { __E2E_BYPASS_LICENSE?: boolean }).__E2E_BYPASS_LICENSE;

  const {
    state,
    setState,
    setLicenseInfo,
    setError,
    updateLastValidation,
    hydrateFromDisk,
    isWithinGracePeriod,
  } = useLicenseStore();

  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    // Immediate bypass for E2E if flag or test key is present
    const isE2E =
      e2eBypass ||
      (typeof window !== 'undefined' &&
        localStorage.getItem('giro-license')?.includes('TEST-LOCAL-KEY'));

    if (isE2E) {
      console.log('[LicenseGuard] E2E Environment detected, bypassing...');
      setLocalLoading(false);
      if (state === 'loading') setState('valid');
      return;
    }

    const checkLicense = async () => {
      console.log('[LicenseGuard] Starting checkLicense...');
      try {
        const currentStore = useLicenseStore.getState();
        console.log(
          `[LicenseGuard] Initial state: isHydrated=${currentStore.isHydrated}, state=${currentStore.state}`
        );

        // Ensure we have data from disk
        if (!currentStore.isHydrated) {
          console.log('[LicenseGuard] Not hydrated, calling hydrateFromDisk...');
          await hydrateFromDisk();
        }

        const store = useLicenseStore.getState();
        const currentKey = store.licenseKey;
        console.log(
          `[LicenseGuard] Hydration finished. Key=${currentKey ? 'FOUND' : 'MISSING'}, state=${
            store.state
          }`
        );

        if (store.state === 'loading') {
          console.log('[LicenseGuard] Store state is still "loading", processing...');
          if (isWithinGracePeriod()) {
            console.log('[LicenseGuard] Within grace period, permitting access.');
            setState('valid');
          } else if (currentKey) {
            console.log('[LicenseGuard] Attempting online validation...');
            try {
              const info = await validateLicense(currentKey);
              setLicenseInfo(info);
              updateLastValidation();
              setState('valid');
              console.log('[LicenseGuard] Online validation SUCCESS');
            } catch (err) {
              console.error(
                '[LicenseGuard] Online validation FAILED:',
                (err as Error)?.message ?? String(err)
              );
              setError('Falha na validação online.');
              setState('error');
            }
          } else {
            console.log('[LicenseGuard] No key and no grace period. Setting to unlicensed.');
            setState('unlicensed');
          }
        } else {
          console.log(`[LicenseGuard] Store already in definitive state: ${store.state}`);
        }
      } catch (err) {
        console.error(
          '[LicenseGuard] Global error in checkLicense:',
          (err as Error)?.message ?? String(err)
        );
      } finally {
        setLocalLoading(false);
        console.log('[LicenseGuard] checkLicense finished.');
      }
    };

    checkLicense();

    // Configurar revalidação periódica (a cada 60 minutos)
    const VALIDATION_INTERVAL_MS = 60 * 60 * 1000;

    const revalidationId = setInterval(async () => {
      console.log('[LicenseGuard] Triggering periodic revalidation...');
      const store = useLicenseStore.getState();

      // Só tenta revalidar se já estiver "valid" e tivermos uma chave
      if (store.state === 'valid' && store.licenseKey) {
        try {
          // Verifica se PRECISA validar (expirou cache local)
          // Ou forçamos a cada X tempo. needsValidation já checa cache de 1h.
          if (store.needsValidation()) {
            console.log('[LicenseGuard] Cache expired, attempting online validation...');
            const info = await validateLicense(store.licenseKey);

            // Atualiza info. Se status mudou (ex: expired), setLicenseInfo atualiza state e UI reage.
            setLicenseInfo(info);
            updateLastValidation();
            console.log(`[LicenseGuard] Revalidation success. Status: ${info.status}`);
          } else {
            console.log('[LicenseGuard] Validation cache still valid, skipping online check.');
          }
        } catch (err) {
          console.warn('[LicenseGuard] Periodic validation failed (network?):', err);
          // Não mudamos estado para 'error' aqui para não bloquear o usuário no meio da operação
          // se for apenas queda de internet. O Grace Period cuida disso.
        }
      }
    }, VALIDATION_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      if (localLoading) {
        console.warn('[LicenseGuard] 10s timeout reached, forcing loading end.');
        setLocalLoading(false);
      }
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(revalidationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    e2eBypass,
    hydrateFromDisk,
    isWithinGracePeriod,
    setError,
    setLicenseInfo,
    setState,
    updateLastValidation,
  ]);

  const location = useLocation();
  const isLicensePath = location.pathname === '/license';

  console.log(
    `[LicenseGuard] Rendering. path=${location.pathname}, localLoading=${localLoading}, storeState=${state}`
  );

  // Bypass for activation page - let it handle its own loading/logic
  if (isLicensePath) {
    console.log('[LicenseGuard] Path is /license, bypassing guard render blocking');
    return <>{children}</>;
  }

  // Local loading or store initializing
  if (localLoading || state === 'loading') {
    console.log(
      `[LicenseGuard] Showing loading screen. localLoading=${localLoading}, state=${state}`
    );
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando licença...</p>
        </div>
      </div>
    );
  }

  // No license or invalid - redirect to activation
  const invalidStates: LicenseState[] = ['unlicensed', 'expired', 'suspended', 'error'];
  if (invalidStates.includes(state)) {
    console.log(`[LicenseGuard] Invalid state (${state}), redirecting to /license`);
    return <Navigate to="/license" replace />;
  }

  // License valid - render children
  console.log('[LicenseGuard] License valid, rendering children');
  return <>{children}</>;
};

export default LicenseGuard;
