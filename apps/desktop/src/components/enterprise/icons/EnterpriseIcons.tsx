/**
 * 🏗️ GIRO Enterprise - Ícones do Módulo
 *
 * Ícones customizados para o módulo Enterprise usando Lucide React.
 * Cada ícone representa um conceito específico do almoxarifado industrial.
 *
 * @version 1.0.0
 * @author Arkheion Corp
 */

import type { LucideProps } from 'lucide-react';
import {
  Building2,
  CheckCircle,
  ClipboardList,
  Factory,
  FolderKanban,
  HardHat,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PackageSearch,
  Route,
  Send,
  Truck,
  User,
  Users,
  Warehouse,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import React from 'react';

// =============================================================================
// TIPOS
// =============================================================================

export interface EnterpriseIconProps extends LucideProps {
  /** Tamanho do ícone em pixels */
  size?: number;
  /** Cor do ícone (CSS color) */
  color?: string;
  /** Classes CSS adicionais */
  className?: string;
}

// =============================================================================
// ÍCONES COMPOSTOS
// =============================================================================

/**
 * Ícone de Contrato/Obra
 * Representa um contrato ou projeto de engenharia
 */
export const ContractIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <Building2 size={size} className={className} {...props} />
);

/**
 * Ícone de Frente de Trabalho
 * Representa uma frente de trabalho dentro de um contrato
 */
export const WorkFrontIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <HardHat size={size} className={className} {...props} />;

/**
 * Ícone de Atividade
 * Representa uma atividade/tarefa dentro de uma frente
 */
export const ActivityIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <FolderKanban size={size} className={className} {...props} />
);

/**
 * Ícone de Local de Estoque
 * Representa um local de armazenamento (almoxarifado, obra, etc)
 */
export const StockLocationIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <Warehouse size={size} className={className} {...props} />;

/**
 * Ícone de Requisição de Material
 * Representa uma solicitação de materiais
 */
export const MaterialRequestIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <ClipboardList size={size} className={className} {...props} />;

/**
 * Ícone de Transferência
 * Representa uma transferência entre locais
 */
export const StockTransferIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <Route size={size} className={className} {...props} />;

/**
 * Ícone de Inventário
 * Representa contagem de inventário físico
 */
export const InventoryIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <PackageSearch size={size} className={className} {...props} />;

/**
 * Ícone de Consumo
 * Representa baixa/consumo de material
 */
export const ConsumptionIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <PackageMinus size={size} className={className} {...props} />;

/**
 * Ícone de Entrada
 * Representa entrada de material no estoque
 */
export const StockInIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <PackagePlus size={size} className={className} {...props} />
);

/**
 * Ícone de Saída
 * Representa saída de material do estoque
 */
export const StockOutIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <Send size={size} className={className} {...props} />
);

/**
 * Ícone de Material Conferido
 * Representa material já separado/conferido
 */
export const MaterialCheckedIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <PackageCheck size={size} className={className} {...props} />;

/**
 * Ícone de Transporte
 * Representa material em trânsito
 */
export const InTransitIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <Truck size={size} className={className} {...props} />;

/**
 * Ícone de Almoxarifado Central
 * Representa o almoxarifado central da empresa
 */
export const CentralWarehouseIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <Factory size={size} className={className} {...props} />;

/**
 * Ícone de Local de Obra
 * Representa um local físico no canteiro
 */
export const SiteLocationIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <MapPin size={size} className={className} {...props} />;

/**
 * Ícone de Equipe
 * Representa equipe de trabalho
 */
export const CrewIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <Users size={size} className={className} {...props} />
);

/**
 * Ícone de Ferramenta/Equipamento
 * Representa ferramentas ou equipamentos
 */
export const EquipmentIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <Wrench size={size} className={className} {...props} />;

/**
 * Ícone de Material
 * Representa material genérico
 */
export const MaterialIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <Package size={size} className={className} {...props} />
);

/**
 * Ícone de Funcionário
 * Representa um funcionário/colaborador
 */
export const EmployeeIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <User size={size} className={className} {...props} />
);

/**
 * Ícone de Fornecedor
 * Representa um fornecedor de materiais
 */
export const SupplierIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <Truck size={size} className={className} {...props} />
);

/**
 * Ícone de Categoria
 * Representa categoria de materiais
 */
export const CategoryIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <Layers size={size} className={className} {...props} />
);

/**
 * Ícone de Material de Frente
 * Representa materiais alocados a uma frente de trabalho
 */
export const WorkFrontMaterialIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <Package size={size} className={className} {...props} />;

/**
 * Ícone de Saldo de Estoque
 * Representa saldo atual de estoque
 */
export const StockBalanceIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <PackageSearch size={size} className={className} {...props} />;

/**
 * Ícone de Movimentação de Estoque
 * Representa movimento (entrada/saída) de estoque
 */
export const StockMovementIcon: React.FC<EnterpriseIconProps> = ({
  size = 24,
  className,
  ...props
}) => <Route size={size} className={className} {...props} />;

/**
 * Ícone de Aprovação
 * Representa ação de aprovar
 */
export const ApprovalIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <CheckCircle size={size} className={className} {...props} />
);

/**
 * Ícone de Rejeição
 * Representa ação de rejeitar
 */
export const RejectIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <XCircle size={size} className={className} {...props} />
);

/**
 * Ícone de Entrega
 * Representa entrega de material
 */
export const DeliveryIcon: React.FC<EnterpriseIconProps> = ({ size = 24, className, ...props }) => (
  <Send size={size} className={className} {...props} />
);

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

export type EnterpriseIconType = keyof typeof EnterpriseIcons;

// =============================================================================
// MAPEAMENTO POR TIPO
// =============================================================================

/** Mapeamento de tipos de local para ícones */
export const locationTypeIcons: Record<string, LucideIcon> = {
  CENTRAL: Factory,
  WAREHOUSE: Warehouse,
  WORK_FRONT: HardHat,
  TRANSIT: Truck,
};

/** Mapeamento de status de requisição para ícones */
export const requestStatusIcons: Record<string, LucideIcon> = {
  PENDING: ClipboardList,
  APPROVED: PackageCheck,
  SEPARATED: PackageCheck,
  DELIVERED: Send,
  CANCELLED: PackageMinus,
};

/** Mapeamento de status de transferência para ícones */
export const transferStatusIcons: Record<string, LucideIcon> = {
  PENDING: ClipboardList,
  APPROVED: PackageCheck,
  IN_TRANSIT: Truck,
  RECEIVED: PackageCheck,
  CANCELLED: PackageMinus,
};

// =============================================================================
// EXPORT
// =============================================================================

export const EnterpriseIcons = {
  Contract: ContractIcon,
  WorkFront: WorkFrontIcon,
  Activity: ActivityIcon,
  StockLocation: StockLocationIcon,
  MaterialRequest: MaterialRequestIcon,
  StockTransfer: StockTransferIcon,
  Inventory: InventoryIcon,
  Consumption: ConsumptionIcon,
  StockIn: StockInIcon,
  StockOut: StockOutIcon,
  MaterialChecked: MaterialCheckedIcon,
  InTransit: InTransitIcon,
  CentralWarehouse: CentralWarehouseIcon,
  SiteLocation: SiteLocationIcon,
  Crew: CrewIcon,
  Equipment: EquipmentIcon,
  Material: MaterialIcon,
  Employee: EmployeeIcon,
  Supplier: SupplierIcon,
  Category: CategoryIcon,
  WorkFrontMaterial: WorkFrontMaterialIcon,
  StockBalance: StockBalanceIcon,
  StockMovement: StockMovementIcon,
  Approval: ApprovalIcon,
  Reject: RejectIcon,
  Delivery: DeliveryIcon,
};

export default EnterpriseIcons;
