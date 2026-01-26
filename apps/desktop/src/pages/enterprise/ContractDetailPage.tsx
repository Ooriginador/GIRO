/**
 * @file ContractDetailPage - Detalhes do Contrato
 * @description Página de detalhes com tabs: Visão Geral, Frentes, Requisições
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContract, useUpdateContract } from '@/hooks/enterprise/useContracts';
import { useWorkFrontsByContract } from '@/hooks/enterprise/useWorkFronts';
import { useMaterialRequestsByContract } from '@/hooks/enterprise/useMaterialRequests';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { WorkFrontWithDetails, MaterialRequestWithDetails } from '@/lib/tauri';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  FileText,
  HardHat,
  MapPin,
  Package,
  Pause,
  Play,
  Plus,
  RefreshCw,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useMemo, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

type ContractStatus = 'PLANNING' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';
type RequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SEPARATING'
  | 'SEPARATED'
  | 'DELIVERED'
  | 'CANCELLED';

// ────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ────────────────────────────────────────────────────────────────────────────

const contractStatusConfig: Record<ContractStatus, { label: string; color: string }> = {
  PLANNING: { label: 'Planejamento', color: 'bg-blue-100 text-blue-800' },
  ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
  SUSPENDED: { label: 'Suspenso', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Concluído', color: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

const requestStatusConfig: Record<RequestStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' },
  SEPARATING: { label: 'Separando', color: 'bg-blue-100 text-blue-800' },
  SEPARATED: { label: 'Separada', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

// ────────────────────────────────────────────────────────────────────────────
// WORK FRONT CARD
// ────────────────────────────────────────────────────────────────────────────

interface WorkFrontCardProps {
  workFront: WorkFrontWithDetails;
  onClick: () => void;
}

const WorkFrontCard: FC<WorkFrontCardProps> = ({ workFront, onClick }) => {
  const progress = workFront.progress ?? 0;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{workFront.name}</CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardDescription>{workFront.code}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{workFront.supervisorName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardHat className="h-4 w-4" />
          <span>{workFront.activityCount ?? 0} atividades</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// REQUEST ROW
// ────────────────────────────────────────────────────────────────────────────

interface RequestRowProps {
  request: MaterialRequestWithDetails;
  onClick: () => void;
}

const RequestRow: FC<RequestRowProps> = ({ request, onClick }) => {
  const status =
    requestStatusConfig[request.status as RequestStatus] || requestStatusConfig.PENDING;

  return (
    <div
      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{request.requestNumber}</p>
          <p className="text-sm text-muted-foreground">
            {request.requesterName} • {request.itemCount ?? 0} itens
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Badge className={cn('font-normal', status.color)}>{status.label}</Badge>
        <span className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// STATS CARD
// ────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  icon: FC<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const StatCard: FC<StatCardProps> = ({ title, value, icon: Icon, variant = 'default' }) => {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'h-12 w-12 rounded-lg flex items-center justify-center',
            variantStyles[variant]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ────────────────────────────────────────────────────────────────────────────

const ContractDetailSkeleton: FC = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-[400px] rounded-lg" />
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const ContractDetailPage: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Data fetching
  const { data: contract, isLoading: isLoadingContract, refetch } = useContract(id || '');
  const { data: workFronts = [], isLoading: isLoadingWorkFronts } = useWorkFrontsByContract(
    id || ''
  );
  const { data: requests = [], isLoading: isLoadingRequests } = useMaterialRequestsByContract(
    id || ''
  );

  // Mutations
  const updateContract = useUpdateContract();

  // Computed stats
  const stats = useMemo(() => {
    const activeWorkFronts = workFronts.filter((wf) => wf.status === 'ACTIVE').length;
    const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
    const completedRequests = requests.filter((r) => r.status === 'DELIVERED').length;
    const avgProgress =
      workFronts.length > 0
        ? Math.round(
            workFronts.reduce((acc, wf) => acc + (wf.progress ?? 0), 0) / workFronts.length
          )
        : 0;

    return {
      activeWorkFronts,
      totalWorkFronts: workFronts.length,
      pendingRequests,
      completedRequests,
      totalRequests: requests.length,
      avgProgress,
    };
  }, [workFronts, requests]);

  // Handlers
  const handleBack = () => navigate('/enterprise/contracts');
  const handleEdit = () => navigate(`/enterprise/contracts/${id}/edit`);
  const handleNewWorkFront = () => navigate(`/enterprise/work-fronts/new?contractId=${id}`);
  const handleNewRequest = () => navigate(`/enterprise/requests/new?contractId=${id}`);
  const handleViewWorkFront = (wfId: string) => navigate(`/enterprise/work-fronts/${wfId}`);
  const handleViewRequest = (reqId: string) => navigate(`/enterprise/requests/${reqId}`);

  const handleSuspend = async () => {
    if (!contract) return;
    await updateContract.mutateAsync({
      id: contract.id,
      input: { status: 'SUSPENDED' },
    });
    refetch();
  };

  const handleResume = async () => {
    if (!contract) return;
    await updateContract.mutateAsync({
      id: contract.id,
      input: { status: 'ACTIVE' },
    });
    refetch();
  };

  // Loading state
  if (isLoadingContract || !id) {
    return <ContractDetailSkeleton />;
  }

  // Not found
  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <XCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Contrato não encontrado</h2>
        <Button onClick={handleBack}>Voltar para Contratos</Button>
      </div>
    );
  }

  const statusInfo =
    contractStatusConfig[contract.status as ContractStatus] || contractStatusConfig.ACTIVE;
  const isSuspended = contract.status === 'SUSPENDED';
  const isActive = contract.status === 'ACTIVE';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{contract.code}</h1>
              <Badge className={cn('font-normal', statusInfo.color)}>{statusInfo.label}</Badge>
            </div>
            <p className="text-muted-foreground">{contract.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isActive && (
            <Button variant="outline" onClick={handleSuspend}>
              <Pause className="mr-2 h-4 w-4" />
              Suspender
            </Button>
          )}
          {isSuspended && (
            <Button variant="outline" onClick={handleResume}>
              <Play className="mr-2 h-4 w-4" />
              Retomar
            </Button>
          )}
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Frentes Ativas"
          value={`${stats.activeWorkFronts}/${stats.totalWorkFronts}`}
          icon={HardHat}
        />
        <StatCard
          title="Progresso Médio"
          value={`${stats.avgProgress}%`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Requisições Pendentes"
          value={stats.pendingRequests}
          icon={Clock}
          variant={stats.pendingRequests > 0 ? 'warning' : 'default'}
        />
        <StatCard title="Total Requisições" value={stats.totalRequests} icon={Package} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="work-fronts">Frentes ({workFronts.length})</TabsTrigger>
          <TabsTrigger value="requests">Requisições ({requests.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Contract Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{contract.clientName}</span>
                    </div>
                  </div>
                  {contract.clientCnpj && (
                    <div>
                      <p className="text-sm text-muted-foreground">CNPJ</p>
                      <p className="font-medium mt-1">{contract.clientCnpj}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Centro de Custo</p>
                    <p className="font-medium mt-1">{contract.costCenter}</p>
                  </div>
                  {contract.budget && (
                    <div>
                      <p className="text-sm text-muted-foreground">Orçamento</p>
                      <p className="font-medium mt-1">{formatCurrency(contract.budget)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location & Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Local e Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(contract.city || contract.address) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {contract.address && `${contract.address}, `}
                        {contract.city}
                        {contract.state && `, ${contract.state}`}
                      </span>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Início</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(contract.startDate)}</span>
                    </div>
                  </div>
                  {contract.endDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Previsão de Término</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(contract.endDate)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gerente Responsável</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contract.managerName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {contract.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{contract.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Work Fronts Tab */}
        <TabsContent value="work-fronts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{workFronts.length} frente(s) de trabalho</p>
            <Button onClick={handleNewWorkFront}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Frente
            </Button>
          </div>

          {isLoadingWorkFronts ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : workFronts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <HardHat className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma frente cadastrada</h3>
                <p className="mt-2 text-center text-muted-foreground">
                  Crie a primeira frente de trabalho para este contrato.
                </p>
                <Button onClick={handleNewWorkFront} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Frente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workFronts.map((wf) => (
                <WorkFrontCard
                  key={wf.id}
                  workFront={wf}
                  onClick={() => handleViewWorkFront(wf.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{requests.length} requisição(ões)</p>
            <Button onClick={handleNewRequest}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Requisição
            </Button>
          </div>

          {isLoadingRequests ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma requisição</h3>
                <p className="mt-2 text-center text-muted-foreground">
                  Crie a primeira requisição de material para este contrato.
                </p>
                <Button onClick={handleNewRequest} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Requisição
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <RequestRow key={req.id} request={req} onClick={() => handleViewRequest(req.id)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractDetailPage;
