import { AppShell } from '@/components/layout';
import { UpdateChecker } from '@/components/UpdateChecker';
/* force refresh */
import { useAuthStore } from '@/stores/auth-store';
import { type FC, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';

// Pages - usando named exports
import { AlertsPage } from '@/pages/alerts';
import { LoginPage } from '@/pages/auth';
import { CashControlPage } from '@/pages/cash';
import { DashboardPage } from '@/pages/dashboard';
import { EmployeesPage } from '@/pages/employees';
import { ServiceOrdersPage, WarrantiesPage } from '@/pages/motoparts';
import { PDVPage } from '@/pages/pdv';
import { CategoriesPage, ProductFormPage, ProductsPage } from '@/pages/products';
import { ReportsPage, SalesReportPage } from '@/pages/reports';
import { SettingsPage } from '@/pages/settings';
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

// Hook para atalho F1 - Ajuda
const useHelpHotkey = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        navigate('/tutorials');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
};

const App: FC = () => {
  const { isAuthenticated } = useAuthStore();
  useHelpHotkey();

  return (
    <>
      {isAuthenticated && <UpdateChecker />}
      <Routes>
        {/* Rota de Login */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/pdv" replace /> : <LoginPage />}
        />

        {/* Layout com AppShell usando element wrapper */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Navigate to="/pdv" replace />} />
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
          <Route path="*" element={<Navigate to="/pdv" replace />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
