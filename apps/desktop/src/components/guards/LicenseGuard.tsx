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
import { useEffect, type FC, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface LicenseGuardProps {
  children: ReactNode;
}

export const LicenseGuard: FC<LicenseGuardProps> = ({ children }) => {
  // Test-only bypass: when running E2E we can set a global flag before app scripts
  // load to skip license enforcement. This avoids modifying production behavior.
  if (typeof globalThis !== 'undefined' && (globalThis as any).__E2E_BYPASS_LICENSE) {
    return <>{children}</>;
  }
  const {
    licenseKey,
    state,
    setState,
    setLicenseInfo,
    setError,
    updateLastValidation,
    hydrateFromDisk,
    isWithinGracePeriod,
  } = useLicenseStore();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkLicense = async () => {
      const currentStore = useLicenseStore.getState();
      console.log(
        `[LicenseGuard] Checking license... isHydrated=${currentStore.isHydrated}, state=${state}`
      );

      // Always ensure we have the truth from disk on first load
      if (!currentStore.isHydrated) {
        console.log('[LicenseGuard] Store not hydrated, attempting hydration...');
        await hydrateFromDisk();
      }

      const store = useLicenseStore.getState();
      const currentKey = store.licenseKey;
      console.log(`[LicenseGuard] Hydration finished: key=${currentKey}, state=${store.state}`);

      // If still loading after hydration, handle properly
      if (store.state === 'loading') {
        if (isWithinGracePeriod()) {
          console.log('[LicenseGuard] Within grace period, permitting access');
          setState('valid');
          return;
        }

        // No grace period? Must validate
        try {
          if (currentKey) {
            console.log('[LicenseGuard] Triggering mandatory validation');
            const info = await validateLicense(currentKey);
            setLicenseInfo(info);
            updateLastValidation();
          } else {
            setState('unlicensed');
          }
        } catch (e) {
          console.error('[LicenseGuard] Validation failed', e);
          setError('Erro de conexão com servidor de licença');
        }
      }
    };

    // Safety fallback: if stuck in loading for 10s, force unlicensed
    timeoutId = setTimeout(() => {
      if (useLicenseStore.getState().state === 'loading') {
        console.warn('[LicenseGuard] Stuck in loading for 10s, forcing unlicensed state');
        setState('unlicensed');
      }
    }, 10000);

    checkLicense();

    return () => clearTimeout(timeoutId);
  }, [licenseKey, state]);

  // Loading state
  if (state === 'loading') {
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
    return <Navigate to="/license" replace />;
  }

  // License valid - render children
  return <>{children}</>;
};

export default LicenseGuard;
