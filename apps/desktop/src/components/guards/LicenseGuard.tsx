/**
 * License Guard Component
 *
 * Componente que verifica se a licença está válida antes de permitir acesso.
 * Deve envolver toda a aplicação para garantir que nenhuma funcionalidade
 * seja acessível sem uma licença ativa.
 */
import { licenseLogger as log } from '@/lib/logger';
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
      log.debug(' E2E Environment detected, bypassing...');
      setLocalLoading(false);
      if (state === 'loading') setState('valid');
      return;
    }

    const checkLicense = async () => {
      log.debug(' Starting checkLicense...');
      try {
        const currentStore = useLicenseStore.getState();
        log.debug(
          ` Initial state: isHydrated=${currentStore.isHydrated}, state=${currentStore.state}`
        );

        // Ensure we have data from disk
        if (!currentStore.isHydrated) {
          log.debug(' Not hydrated, calling hydrateFromDisk...');
          await hydrateFromDisk();
        }

        const store = useLicenseStore.getState();
        const currentKey = store.licenseKey;
        log.debug(
          ` Hydration finished. Key=${currentKey ? 'FOUND' : 'MISSING'}, state=${
            store.state
          }`
        );

        if (store.state === 'loading') {
          log.debug(' Store state is still "loading", processing...');
          if (isWithinGracePeriod()) {
            log.debug(' Within grace period, permitting access.');
            setState('valid');
          } else if (currentKey) {
            log.debug(' Attempting online validation...');
            try {
              const info = await validateLicense(currentKey);
              setLicenseInfo(info);
              updateLastValidation();
              setState('valid');
              log.debug(' Online validation SUCCESS');
            } catch (err) {
              log.error(
                'Online validation FAILED:',
                (err as Error)?.message ?? String(err)
              );
              setError('Falha na validação online.');
              setState('error');
            }
          } else {
            log.debug(' No key and no grace period. Setting to unlicensed.');
            setState('unlicensed');
          }
        } else {
          log.debug(` Store already in definitive state: ${store.state}`);
        }
      } catch (err) {
        log.error(
          'Global error in checkLicense:',
          (err as Error)?.message ?? String(err)
        );
      } finally {
        setLocalLoading(false);
        log.debug(' checkLicense finished.');
      }
    };

    checkLicense();

    // Configurar revalidação periódica (a cada 60 minutos)
    const VALIDATION_INTERVAL_MS = 60 * 60 * 1000;

    const revalidationId = setInterval(async () => {
      log.debug(' Triggering periodic revalidation...');
      const store = useLicenseStore.getState();

      // Só tenta revalidar se já estiver "valid" e tivermos uma chave
      if (store.state === 'valid' && store.licenseKey) {
        try {
          // Verifica se PRECISA validar (expirou cache local)
          // Ou forçamos a cada X tempo. needsValidation já checa cache de 1h.
          if (store.needsValidation()) {
            log.debug(' Cache expired, attempting online validation...');
            const info = await validateLicense(store.licenseKey);

            // Atualiza info. Se status mudou (ex: expired), setLicenseInfo atualiza state e UI reage.
            setLicenseInfo(info);
            updateLastValidation();
            log.debug(` Revalidation success. Status: ${info.status}`);
          } else {
            log.debug(' Validation cache still valid, skipping online check.');
          }
        } catch (err) {
          log.warn(' Periodic validation failed (network?):', err);
          // Não mudamos estado para 'error' aqui para não bloquear o usuário no meio da operação
          // se for apenas queda de internet. O Grace Period cuida disso.
        }
      }
    }, VALIDATION_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      if (localLoading) {
        log.warn(' 10s timeout reached, forcing loading end.');
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

  log.debug(
    ` Rendering. path=${location.pathname}, localLoading=${localLoading}, storeState=${state}`
  );

  // Bypass for activation page - let it handle its own loading/logic
  if (isLicensePath) {
    log.debug(' Path is /license, bypassing guard render blocking');
    return <>{children}</>;
  }

  // Local loading or store initializing
  if (localLoading || state === 'loading') {
    log.debug(
      ` Showing loading screen. localLoading=${localLoading}, state=${state}`
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
    log.debug(` Invalid state (${state}), redirecting to /license`);
    return <Navigate to="/license" replace />;
  }

  // License valid - render children
  log.debug(' License valid, rendering children');
  return <>{children}</>;
};

export default LicenseGuard;
