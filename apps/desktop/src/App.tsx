import { LicenseGuard, SessionGuard } from '@/components/guards';
import { AppShell } from '@/components/layout';
import { BusinessProfileWizard, FeatureRoute } from '@/components/shared';
import { UpdateChecker } from '@/components/UpdateChecker';
import { useHasAdmin } from '@/hooks/useSetup';
import { useThemeEffect } from '@/hooks/useThemeEffect';
/* force refresh */
import { useNetworkEvents } from '@/hooks/use-network-events';
import { navLogger, setupLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/auth-store';
import { useLicenseStore } from '@/stores/license-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { useEffect, type FC } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
// ... existing imports ...

const NavigationLogger: FC = () => {
  const location = useLocation();
  useEffect(() => {
    navLogger.debug('Path changed to:', location.pathname);
  }, [location.pathname]);
  return null;
};

// Pages - usando named exports
import { AlertsPage } from '@/pages/alerts';
import { LoginPage } from '@/pages/auth';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { CashControlPage } from '@/pages/cash';
import { CustomersPage } from '@/pages/customers';
import { DashboardPage } from '@/pages/dashboard';
import { EmployeesPage } from '@/pages/employees';
import {
  ActivitiesPage,
  ConsumptionReportPage,
  ContractDetailPage,
  ContractNewPage,
  ContractsPage,
  EnterpriseDashboardPage,
  EnterpriseReportsPage,
  InventoryDetailPage,
  InventoryPage,
  KardexReportPage,
  LocationNewPage,
  LocationsPage,
  LocationStockPage,
  LowStockAlertsPage,
  RequestDetailPage,
  RequestNewPage,
  RequestsPage,
  TransferDetailPage,
  TransferNewPage,
  TransfersPage,
  WorkFrontDetailPage,
  WorkFrontNewPage,
  WorkFrontsPage,
} from '@/pages/enterprise';
import { LicenseActivationPage } from '@/pages/license';
import { MotopartsDashboardPage, ServiceOrdersPage, WarrantiesPage } from '@/pages/motoparts';
import { PDVPage, PendingOrdersPage } from '@/pages/pdv';
import { CategoriesPage, ProductFormPage, ProductsPage } from '@/pages/products';
import {
  EmployeePerformancePage,
  FinancialReportPage,
  ProductsRankingPage,
  ReportsPage,
  SalesReportPage,
  StockReportPage,
} from '@/pages/reports';
import { MyDataPage, SettingsPage } from '@/pages/settings';
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
  const { isAuthenticated, employee, mustChangePassword } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Enforce password change if required (except when already on the change password page)
  if (mustChangePassword && location.pathname !== '/auth/change-password') {
    return <Navigate to="/auth/change-password" replace />;
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

const GlobalSetupGate: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: hasAdmin, isLoading } = useHasAdmin();
  const { isAuthenticated, logout } = useAuthStore();
  const { isConfigured, resetProfile } = useBusinessProfile();
  const location = useLocation();

  // E2E Bypass: skip cleanup if in test mode
  const isE2E =
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>).__E2E_HAS_ADMIN !== undefined &&
    (window as unknown as Record<string, unknown>).__E2E_HAS_ADMIN !== false;

  const bypassRoutes = ['/login', '/license', '/license-activation', '/setup'];
  const isBypass = bypassRoutes.includes(location.pathname);

  // Global monitoring
  useEffect(() => {
    if (isLoading || isE2E) return;

    if (hasAdmin === false) {
      // Logic from AdminCheck: Purge frontend if backend is clean
      if (isAuthenticated || isConfigured) {
        setupLogger.warn('State mismatch: No admin in DB but frontend has state. PURGING.');
        logout();
        resetProfile();
      }
    }
  }, [hasAdmin, isLoading, isE2E, isAuthenticated, isConfigured, logout, resetProfile]);

  // If loading and NOT in a bypass/E2E environment, show spinner
  if (isLoading && !isBypass && !isE2E) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Inicializando Sistema...</p>
      </div>
    );
  }

  // FORCE Setup if no admin exists and not in bypass/E2E
  const adminMissing = hasAdmin === false && !isE2E;

  if (adminMissing && !isBypass) {
    setupLogger.warn(
      `No Admin detected (hasAdmin=${hasAdmin}). Forcing redirect from ${location.pathname} to /setup`
    );
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: FC = () => {
  const { isConfigured } = useBusinessProfile();
  if (!isConfigured) return <Navigate to="/wizard" replace />;
  return <Navigate to="/pdv" replace />;
};

const App: FC = () => {
  const { isAuthenticated, restoreSession, isRestoring, mustChangePassword } = useAuthStore();
  useHelpHotkey();
  useNetworkEvents();
  useThemeEffect(); // Aplica tema no load inicial

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (isRestoring) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Restaurando Sessão...</p>
      </div>
    );
  }

  return (
    <SessionGuard timeoutMinutes={30}>
      <NavigationLogger />
      <GlobalSetupGate>
        {isAuthenticated && <UpdateChecker />}
        <Routes>
          <Route path="/" element={<RootRedirect />} />
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
                {isAuthenticated ? (
                  mustChangePassword ? (
                    <Navigate to="/auth/change-password" replace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                ) : (
                  <LoginPage />
                )}
              </LicenseGuard>
            }
          />

          {/* Rotas de Recuperação de Senha */}
          <Route
            path="/auth/forgot-password"
            element={
              <LicenseGuard>
                <ForgotPasswordPage />
              </LicenseGuard>
            }
          />
          <Route
            path="/auth/reset-password"
            element={
              <LicenseGuard>
                <ResetPasswordPage />
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

            {/* Motopeças - Protegido por feature */}
            <Route
              path="motoparts/dashboard"
              element={
                <FeatureRoute feature="serviceOrders" redirectTo="/dashboard">
                  <MotopartsDashboardPage />
                </FeatureRoute>
              }
            />
            <Route
              path="service-orders"
              element={
                <FeatureRoute feature="serviceOrders" redirectTo="/dashboard">
                  <ServiceOrdersPage />
                </FeatureRoute>
              }
            />
            <Route
              path="warranties"
              element={
                <FeatureRoute feature="warranties" redirectTo="/dashboard">
                  <WarrantiesPage />
                </FeatureRoute>
              }
            />

            {/* Enterprise - Almoxarifado Industrial - Protegido por feature */}
            <Route
              path="enterprise"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <EnterpriseDashboardPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/contracts"
              element={
                <FeatureRoute feature="contracts" redirectTo="/dashboard">
                  <ContractsPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/contracts/new"
              element={
                <FeatureRoute feature="contracts" redirectTo="/dashboard">
                  <ContractNewPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/contracts/:id"
              element={
                <FeatureRoute feature="contracts" redirectTo="/dashboard">
                  <ContractDetailPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/work-fronts"
              element={
                <FeatureRoute feature="workFronts" redirectTo="/dashboard">
                  <WorkFrontsPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/work-fronts/new"
              element={
                <FeatureRoute feature="workFronts" redirectTo="/dashboard">
                  <WorkFrontNewPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/work-fronts/:id"
              element={
                <FeatureRoute feature="workFronts" redirectTo="/dashboard">
                  <WorkFrontDetailPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/locations"
              element={
                <FeatureRoute feature="multiLocation" redirectTo="/dashboard">
                  <LocationsPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/locations/new"
              element={
                <FeatureRoute feature="multiLocation" redirectTo="/dashboard">
                  <LocationNewPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/locations/:id"
              element={
                <FeatureRoute feature="multiLocation" redirectTo="/dashboard">
                  <LocationsPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/locations/:id/stock"
              element={
                <FeatureRoute feature="multiLocation" redirectTo="/dashboard">
                  <LocationStockPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/activities"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <ActivitiesPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/requests"
              element={
                <FeatureRoute feature="materialRequests" redirectTo="/dashboard">
                  <RequestsPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/requests/new"
              element={
                <FeatureRoute feature="materialRequests" redirectTo="/dashboard">
                  <RequestNewPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/requests/:id"
              element={
                <FeatureRoute feature="materialRequests" redirectTo="/dashboard">
                  <RequestDetailPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/transfers"
              element={
                <FeatureRoute feature="stockTransfers" redirectTo="/dashboard">
                  <TransfersPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/transfers/new"
              element={
                <FeatureRoute feature="stockTransfers" redirectTo="/dashboard">
                  <TransferNewPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/transfers/:id"
              element={
                <FeatureRoute feature="stockTransfers" redirectTo="/dashboard">
                  <TransferDetailPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/inventory"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <InventoryPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/inventory/:id"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <InventoryDetailPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/reports"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <EnterpriseReportsPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/reports/kardex"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <KardexReportPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/reports/consumption"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <ConsumptionReportPage />
                </FeatureRoute>
              }
            />
            <Route
              path="enterprise/alerts"
              element={
                <FeatureRoute feature="enterprise" redirectTo="/dashboard">
                  <LowStockAlertsPage />
                </FeatureRoute>
              }
            />

            {/* PDV - Protegido por feature */}
            <Route
              path="pdv"
              element={
                <FeatureRoute feature="pdv" redirectTo="/dashboard">
                  <PDVPage />
                </FeatureRoute>
              }
            />
            <Route
              path="pdv/pending-orders"
              element={
                <FeatureRoute feature="pdv" redirectTo="/dashboard">
                  <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'CASHIER']}>
                    <PendingOrdersPage />
                  </ProtectedRoute>
                </FeatureRoute>
              }
            />

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

            {/* Caixa - Protegido por feature */}
            <Route
              path="cash"
              element={
                <FeatureRoute feature="cashControl" redirectTo="/dashboard">
                  <CashControlPage />
                </FeatureRoute>
              }
            />

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
            <Route
              path="reports/financial"
              element={
                <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'VIEWER']}>
                  <FinancialReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports/stock"
              element={
                <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'VIEWER']}>
                  <StockReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports/products"
              element={
                <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'VIEWER']}>
                  <ProductsRankingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports/employees"
              element={
                <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'VIEWER']}>
                  <EmployeePerformancePage />
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

            {/* Alterar Senha */}
            <Route
              path="auth/change-password"
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />

            {/* Meus Dados LGPD */}
            <Route
              path="my-data"
              element={
                <ProtectedRoute>
                  <MyDataPage />
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
      </GlobalSetupGate>
    </SessionGuard>
  );
};

export default App;
