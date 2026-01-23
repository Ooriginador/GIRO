//! Sistema RBAC - Role-Based Access Control
//!
//! Define permissões por role e verifica antes de executar commands.

use crate::error::{AppError, AppResult};
use crate::models::{Employee, EmployeeRole};
use crate::repositories::EmployeeRepository;
use sqlx::{Pool, Sqlite};

/// Permissões disponíveis no sistema
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Permission {
    // Produtos
    ViewProducts,
    CreateProducts,
    UpdateProducts,
    DeleteProducts,

    // Vendas
    ViewSales,
    CreateSales,
    CancelSales,

    // Estoque
    ViewStock,
    ManageStock,
    AdjustStock,

    // Caixa
    OpenCash,
    CloseCash,
    ViewCashMovements,
    CreateCashMovement,
    ManageCash,

    // Funcionários
    ViewEmployees,
    CreateEmployees,
    UpdateEmployees,
    DeleteEmployees,

    // Relatórios
    ViewReports,
    ExportReports,

    // Configurações
    ViewSettings,
    UpdateSettings,

    // Fornecedores
    ViewSuppliers,
    ManageSuppliers,

    // Categorias
    ViewCategories,
    ManageCategories,

    // Clientes
    ViewCustomers,
    ManageCustomers,

    // Ordens de Serviço
    ViewServiceOrders,
    CreateServiceOrder,
    UpdateServiceOrder,
    CancelServiceOrder,
    FinishServiceOrder,

    // Serviços
    ViewServices,
    ManageServices,

    // Garantias
    ManageWarranties,

    // Veículos (Motopeças)
    ViewVehicles,
    ManageVehicles,
}

impl Permission {
    /// Retorna as permissões de um role específico
    pub fn for_role(role: EmployeeRole) -> Vec<Permission> {
        match role {
            EmployeeRole::Admin => {
                // Admin tem TODAS as permissões
                vec![
                    Permission::ViewProducts,
                    Permission::CreateProducts,
                    Permission::UpdateProducts,
                    Permission::DeleteProducts,
                    Permission::ViewSales,
                    Permission::CreateSales,
                    Permission::CancelSales,
                    Permission::ViewStock,
                    Permission::ManageStock,
                    Permission::AdjustStock,
                    Permission::OpenCash,
                    Permission::CloseCash,
                    Permission::ViewCashMovements,
                    Permission::CreateCashMovement,
                    Permission::ManageCash,
                    Permission::ViewEmployees,
                    Permission::CreateEmployees,
                    Permission::UpdateEmployees,
                    Permission::DeleteEmployees,
                    Permission::ViewReports,
                    Permission::ExportReports,
                    Permission::ViewSettings,
                    Permission::UpdateSettings,
                    Permission::ViewSuppliers,
                    Permission::ManageSuppliers,
                    Permission::ViewCategories,
                    Permission::ManageCategories,
                    Permission::ViewCustomers,
                    Permission::ManageCustomers,
                    Permission::ViewServiceOrders,
                    Permission::CreateServiceOrder,
                    Permission::UpdateServiceOrder,
                    Permission::CancelServiceOrder,
                    Permission::FinishServiceOrder,
                    Permission::ViewServices,
                    Permission::ManageServices,
                    Permission::ManageWarranties,
                    Permission::ViewVehicles,
                    Permission::ManageVehicles,
                ]
            }
            EmployeeRole::Manager => {
                // Gerente: tudo exceto gerenciar funcionários e configurações
                vec![
                    Permission::ViewProducts,
                    Permission::CreateProducts,
                    Permission::UpdateProducts,
                    Permission::DeleteProducts,
                    Permission::ViewSales,
                    Permission::CreateSales,
                    Permission::CancelSales,
                    Permission::ViewStock,
                    Permission::ManageStock,
                    Permission::AdjustStock,
                    Permission::OpenCash,
                    Permission::CloseCash,
                    Permission::ViewCashMovements,
                    Permission::CreateCashMovement,
                    Permission::ManageCash,
                    Permission::ViewEmployees,
                    Permission::ViewReports,
                    Permission::ExportReports,
                    Permission::ViewSettings,
                    Permission::ViewSuppliers,
                    Permission::ManageSuppliers,
                    Permission::ViewCategories,
                    Permission::ManageCategories,
                    Permission::ViewCustomers,
                    Permission::ManageCustomers,
                    Permission::ViewServiceOrders,
                    Permission::CreateServiceOrder,
                    Permission::UpdateServiceOrder,
                    Permission::CancelServiceOrder,
                    Permission::FinishServiceOrder,
                    Permission::ViewServices,
                    Permission::ManageServices,
                    Permission::ManageWarranties,
                    Permission::ViewVehicles,
                    Permission::ManageVehicles,
                ]
            }
            EmployeeRole::Cashier => {
                // Operador de Caixa: apenas operações de venda e caixa
                vec![
                    Permission::ViewProducts,
                    Permission::ViewSales,
                    Permission::CreateSales,
                    Permission::ViewStock,
                    Permission::OpenCash,
                    Permission::CloseCash,
                    Permission::ViewCashMovements,
                    Permission::CreateCashMovement,
                    Permission::ManageCash,
                    Permission::ViewCustomers,
                    Permission::ManageCustomers,
                    Permission::ViewServiceOrders,
                    Permission::CreateServiceOrder,
                    Permission::UpdateServiceOrder,
                    Permission::ViewServices,
                ]
            }
            EmployeeRole::Viewer => {
                // Visualizador: apenas leitura
                vec![
                    Permission::ViewProducts,
                    Permission::ViewSales,
                    Permission::ViewStock,
                    Permission::ViewCashMovements,
                    Permission::ViewEmployees,
                    Permission::ViewReports,
                    Permission::ViewSuppliers,
                    Permission::ViewCategories,
                    Permission::ViewCustomers,
                    Permission::ViewServiceOrders,
                    Permission::ViewServices,
                ]
            }
            EmployeeRole::Stocker => {
                // Estoquista: gerencia estoque e produtos
                vec![
                    Permission::ViewProducts,
                    Permission::CreateProducts,
                    Permission::UpdateProducts,
                    Permission::ViewStock,
                    Permission::ManageStock,
                    Permission::AdjustStock,
                    Permission::ViewSuppliers,
                    Permission::ManageSuppliers,
                    Permission::ViewCategories,
                    Permission::ManageCategories,
                    Permission::ViewVehicles,
                    Permission::ManageVehicles,
                ]
            }
        }
    }

    /// Verifica se um role tem uma permissão específica
    pub fn has_permission(role: EmployeeRole, permission: Permission) -> bool {
        Self::for_role(role).contains(&permission)
    }
}

/// Context de autenticação para passar entre commands
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub employee_id: String,
    pub role: EmployeeRole,
}

/// Verifica se um funcionário tem permissão para executar uma ação
pub async fn check_permission(
    pool: &Pool<Sqlite>,
    employee_id: &str,
    permission: Permission,
) -> AppResult<Employee> {
    let repo = EmployeeRepository::new(pool);

    let employee = repo
        .find_by_id(employee_id)
        .await?
        .ok_or(AppError::Unauthorized(
            "Funcionário não encontrado".to_string(),
        ))?;

    if !employee.is_active {
        return Err(AppError::Unauthorized("Funcionário inativo".to_string()));
    }

    // Parse role string to EmployeeRole
    let role = match employee.role.as_str() {
        "ADMIN" => EmployeeRole::Admin,
        "MANAGER" => EmployeeRole::Manager,
        "CASHIER" => EmployeeRole::Cashier,
        "VIEWER" => EmployeeRole::Viewer,
        "STOCKER" => EmployeeRole::Stocker,
        _ => return Err(AppError::Unauthorized("Role inválido".to_string())),
    };

    if Permission::has_permission(role, permission) {
        Ok(employee)
    } else {
        Err(AppError::PermissionDenied)
    }
}

/// Macro para verificar permissão de forma simplificada
#[macro_export]
macro_rules! require_permission {
    ($pool:expr, $employee_id:expr, $permission:expr) => {
        $crate::middleware::check_permission($pool, $employee_id, $permission).await?
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_admin_has_all_permissions() {
        assert!(Permission::has_permission(
            EmployeeRole::Admin,
            Permission::CreateProducts
        ));
        assert!(Permission::has_permission(
            EmployeeRole::Admin,
            Permission::DeleteEmployees
        ));
        assert!(Permission::has_permission(
            EmployeeRole::Admin,
            Permission::UpdateSettings
        ));
    }

    #[test]
    fn test_cashier_limited_permissions() {
        assert!(Permission::has_permission(
            EmployeeRole::Cashier,
            Permission::CreateSales
        ));
        assert!(Permission::has_permission(
            EmployeeRole::Cashier,
            Permission::OpenCash
        ));
        assert!(!Permission::has_permission(
            EmployeeRole::Cashier,
            Permission::CreateProducts
        ));
        assert!(!Permission::has_permission(
            EmployeeRole::Cashier,
            Permission::DeleteEmployees
        ));
    }

    #[test]
    fn test_viewer_readonly() {
        assert!(Permission::has_permission(
            EmployeeRole::Viewer,
            Permission::ViewProducts
        ));
        assert!(Permission::has_permission(
            EmployeeRole::Viewer,
            Permission::ViewSales
        ));
        assert!(!Permission::has_permission(
            EmployeeRole::Viewer,
            Permission::CreateSales
        ));
        assert!(!Permission::has_permission(
            EmployeeRole::Viewer,
            Permission::UpdateProducts
        ));
    }
}
