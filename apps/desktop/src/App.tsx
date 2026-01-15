import { LicenseGuard } from '@/components/guards';
import { AppShell } from '@/components/layout';
import { BusinessProfileWizard } from '@/components/shared';
import { UpdateChecker } from '@/components/UpdateChecker';
import { useHasAdmin } from '@/hooks/useSetup';
/* force refresh */
import { useAuthStore } from '@/stores/auth-store';
import { useLicenseStore } from '@/stores/license-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { type FC, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';

// Pages - usando named exports
import { AlertsPage } from '@/pages/alerts';
import { LoginPage } from '@/pages/auth';
import { CashControlPage } from '@/pages/cash';
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
  const { data: hasAdmin, isLoading } = useHasAdmin();
  const { isAuthenticated } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Inicializando...</p>
        </div>
      </div>
    );
  }

  // Se não tem admin, redireciona para o setup inicial
  if (!hasAdmin && !isAuthenticated) {
    return <Navigate to="/setup" replace />;
  }

  // Se não está autenticado, vai para o login (que é protegido pela licença)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se autenticado, vai para a raiz do layout (RootRedirect)
  return <Navigate to="/" replace />;
};

const App: FC = () => {
  const { isAuthenticated } = useAuthStore();
  useHelpHotkey();

  return (
    <>
      {isAuthenticated && <UpdateChecker />}
      <Routes>
        <Route index element={<AdminCheck />} />
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
    </>
  );
};

export default App;
