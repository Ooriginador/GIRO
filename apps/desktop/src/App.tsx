import { LicenseGuard, SessionGuard } from '@/components/guards';
import { AppShell } from '@/components/layout';
import { BusinessProfileWizard } from '@/components/shared';
import { UpdateChecker } from '@/components/UpdateChecker';
import { useHasAdmin } from '@/hooks/useSetup';
/* force refresh */
import { useAuthStore } from '@/stores/auth-store';
import { useLicenseStore } from '@/stores/license-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { type FC, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';

// Pages - usando named exports
import { AlertsPage } from '@/pages/alerts';
import { LoginPage } from '@/pages/auth';
import { CashControlPage } from '@/pages/cash';
import { CustomersPage } from '@/pages/customers';
import { DashboardPage } from '@/pages/dashboard';
import { EmployeesPage } from '@/pages/employees';
import { LicenseActivationPage } from '@/pages/license';
import { ServiceOrdersPage, WarrantiesPage } from '@/pages/motoparts';
import { PDVPage } from '@/pages/pdv';
import { CategoriesPage, ProductFormPage, ProductsPage } from '@/pages/products';
import { ReportsPage, SalesReportPage } from '@/pages/reports';
import { SettingsPage } from '@/pages/settings';
import { InitialSetupPage } from '@/pages/setup';
import { ExpirationPage, StockEntryPage, StockMovementsPage, StockPage } from '@/pages/stock';
import { SuppliersPage } from '@/pages/suppliers';
import { TutorialsPage } from '@/pages/tutorials';

// Componente de rota protegida
interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: string[];
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, employee } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && employee && !requiredRole.includes(employee.role)) {
    return <Navigate to="/pdv" replace />;
  }

  // Use children if provided, otherwise use Outlet for nested routes
  return <>{children ?? <Outlet />}</>;
};

// Componente para rota do wizard - redireciona se já configurado
const WizardRoute: FC = () => {
  const { isConfigured } = useBusinessProfile();

  // Se já configurado, redirecionar para PDV
  if (isConfigured) {
    return <Navigate to="/pdv" replace />;
  }

  return <BusinessProfileWizard redirectTo="/pdv" />;
};

// Componente para rota raiz - verifica se perfil está configurado
const RootRedirect: FC = () => {
  const { isConfigured } = useBusinessProfile();

  // Se não configurado, enviar para wizard
  if (!isConfigured) {
    return <Navigate to="/wizard" replace />;
  }

  // Se configurado, agora sim vai para o PDV
  return <Navigate to="/pdv" replace />;
};

// Hook para atalho F1 - Ajuda
const useHelpHotkey = () => {
  const navigate = useNavigate();
  const { state } = useLicenseStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        // Só permite ajuda se a licença estiver ativa (valid) ou carregando (loading)
        if (state === 'valid' || state === 'loading') {
          navigate('/tutorials');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, state]);
};

const AdminCheck: FC = () => {
  const { data: hasAdmin, isLoading, error } = useHasAdmin();
  const { isAuthenticated, logout } = useAuthStore();
  const { isConfigured, resetProfile } = useBusinessProfile();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupDone, setCleanupDone] = useState(false);

  // Cleanup stale localStorage state when database has no admin
  useEffect(() => {
    if (isLoading) return;

    console.log('[AdminCheck] hasAdmin state:', hasAdmin);

    // [FIX] If NO admin is found in backend, we MUST ensure the frontend is also clean.
    // Otherwise, stale AuthStore or BusinessProfile might guard/redirect us wrong.
    if (hasAdmin === false) {
      console.log('🚨 [AdminCheck] No admin in DB. PURGING frontend state...', {
        isAuthenticated,
        isConfigured,
      });

      let needsCleanup = false;

      if (isAuthenticated) {
        console.warn('❌ [AdminCheck] User was authenticated but no Admin exists! Logging out.');
        logout();
        needsCleanup = true;
      }

      if (isConfigured) {
        console.warn('❌ [AdminCheck] Profile was configured but no Admin exists! Resetting.');
        resetProfile();
        needsCleanup = true;
      }

      if (needsCleanup) {
        setIsCleaningUp(true);
        setTimeout(() => {
          setIsCleaningUp(false);
          setCleanupDone(true);
        }, 500); // Give it a moment to stabilize
      } else {
        setCleanupDone(true);
      }
    } else {
      // hasAdmin is true (or undefined/error?), just proceed
      setCleanupDone(true);
    }
  }, [hasAdmin, isLoading, isAuthenticated, isConfigured, logout, resetProfile]);

  if (isLoading || isCleaningUp) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Inicializando...</p>
        <div className="rounded bg-black/80 p-4 text-xs font-mono text-white">
          <p>DEBUG INFO:</p>
          <p>hasAdmin: {isLoading ? 'LOADING' : hasAdmin ? 'TRUE' : 'FALSE'}</p>
          <p>isAuthenticated: {isAuthenticated ? 'TRUE' : 'FALSE'}</p>
          <p>isConfigured: {isConfigured ? 'TRUE' : 'FALSE'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('[AdminCheck] Error:', error);
    return (
      <div className="p-4 text-red-500">
        Erro ao verificar estado inicial. Verifique se o backend está rodando.
      </div>
    );
  }

  // After cleanup is done, redirect appropriately
  if (!hasAdmin) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <RootRedirect />;
};

const App: FC = () => {
  const { isAuthenticated } = useAuthStore();
  useHelpHotkey();

  return (
    <SessionGuard timeoutMinutes={30}>
      {isAuthenticated && <UpdateChecker />}
      <Routes>
        <Route path="/" element={<AdminCheck />} />
        {/* Setup Inicial - Primeiro Acesso */}
        <Route path="/setup" element={<InitialSetupPage />} />

        {/* Rota de Ativação de Licença - ANTES de tudo */}
        <Route path="/license" element={<LicenseActivationPage />} />

        {/* Test-only route to bypass license guard for E2E (not used in production) */}
        <Route path="/__test-login" element={<LoginPage />} />

        {/* Rota de Login - Protegida por licença */}
        <Route
          path="/login"
          element={
            <LicenseGuard>
              {isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
            </LicenseGuard>
          }
        />

        {/* Wizard de Configuração de Perfil (primeira execução) */}
        <Route
          path="/wizard"
          element={
            <LicenseGuard>
              <ProtectedRoute>
                <WizardRoute />
              </ProtectedRoute>
            </LicenseGuard>
          }
        />

        {/* Layout com AppShell usando element wrapper */}
        <Route
          element={
            <LicenseGuard>
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            </LicenseGuard>
          }
        >
          {/* Dashboard - Verifica se perfil está configurado */}
          <Route index element={<RootRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Motopeças */}
          <Route path="service-orders" element={<ServiceOrdersPage />} />
          <Route path="warranties" element={<WarrantiesPage />} />

          {/* PDV */}
          <Route path="pdv" element={<PDVPage />} />

          {/* Clientes */}
          <Route path="customers" element={<CustomersPage />} />

          {/* Produtos */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route path="products/categories" element={<CategoriesPage />} />

          {/* Estoque */}
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/entry" element={<StockEntryPage />} />
          <Route path="stock/movements" element={<StockMovementsPage />} />
          <Route path="stock/expiration" element={<ExpirationPage />} />

          {/* Funcionários */}
          <Route
            path="employees"
            element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <EmployeesPage />
              </ProtectedRoute>
            }
          />

          {/* Fornecedores */}
          <Route
            path="suppliers"
            element={
              <ProtectedRoute requiredRole={['ADMIN', 'MANAGER']}>
                <SuppliersPage />
              </ProtectedRoute>
            }
          />

          {/* Caixa */}
          <Route path="cash" element={<CashControlPage />} />

          {/* Relatórios */}
          <Route
            path="reports"
            element={
              <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'VIEWER']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports/sales"
            element={
              <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'VIEWER']}>
                <SalesReportPage />
              </ProtectedRoute>
            }
          />

          {/* Configurações */}
          <Route
            path="settings"
            element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Alertas */}
          <Route path="alerts" element={<AlertsPage />} />

          {/* Tutoriais / Ajuda */}
          <Route path="tutorials" element={<TutorialsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SessionGuard>
  );
};

export default App;
