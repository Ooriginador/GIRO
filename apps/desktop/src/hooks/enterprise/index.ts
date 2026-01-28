/**
 * @file Enterprise Hooks - Barrel Export
 * @description Re-exporta todos os hooks do módulo Enterprise
 */

// Contracts
export {
  useContracts,
  useContract,
  useContractDashboard,
  useEnterpriseDashboard,
  useContractsConsumptionSummary,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  contractKeys,
} from './useContracts';

// Work Fronts
export {
  useWorkFrontsByContract,
  useWorkFrontsBySupervisor,
  useWorkFront,
  useWorkFronts,
  useCreateWorkFront,
  useUpdateWorkFront,
  useDeleteWorkFront,
  workFrontKeys,
} from './useWorkFronts';

// Activities
export {
  useActivitiesByWorkFront,
  useActivitiesByCostCenter,
  useActivity,
  useCreateActivity,
  useUpdateActivity,
  useUpdateActivityProgress,
  useDeleteActivity,
  activityKeys,
} from './useActivities';

// Stock Locations
export {
  useStockLocations,
  useStockLocationsByType,
  useStockLocationsByContract,
  useStockLocation,
  useStockBalances,
  useCreateStockLocation,
  useDeleteStockLocation,
  useAdjustStockBalance,
  locationKeys,
} from './useStockLocations';

// Material Requests
export {
  useMaterialRequestsPaginated,
  useMaterialRequests,
  useMaterialRequestsByContract,
  usePendingRequests,
  useMaterialRequest,
  useRequestItems,
  useCreateMaterialRequest,
  useAddRequestItem,
  useSubmitRequest,
  useApproveRequest,
  useRejectRequest,
  useStartSeparation,
  useCompleteSeparation,
  useDeliverRequest,
  requestKeys,
} from './useMaterialRequests';

// Stock Transfers
export {
  useStockTransfers,
  useStockTransfer,
  useTransferItems,
  useCreateStockTransfer,
  useAddTransferItem,
  useApproveTransfer,
  useRejectTransfer,
  useShipTransfer,
  useReceiveTransfer,
  useCancelTransfer,
  transferKeys,
} from './useStockTransfers';
