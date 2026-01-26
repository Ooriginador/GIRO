/**
 * @file ActivitiesPage - Lista de Atividades
 * @description Lista de atividades por frente/contrato com barra de progresso
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivitiesByWorkFront } from '@/hooks/enterprise/useActivities';
import { useWorkFronts } from '@/hooks/enterprise/useWorkFronts';
import { useContracts } from '@/hooks/enterprise/useContracts';
import { cn } from '@/lib/utils';
import type { ActivityWithDetails } from '@/lib/tauri';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  HardHat,
  Layers,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Target,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

// ────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<ActivityStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pendente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: Play },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspensa', color: 'bg-yellow-100 text-yellow-800', icon: Pause },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: Target },
};

// ────────────────────────────────────────────────────────────────────────────
// ACTIVITY CARD
// ────────────────────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: ActivityWithDetails;
  onClick: () => void;
}

const ActivityCard: FC<ActivityCardProps> = ({ activity, onClick }) => {
  const status = statusConfig[activity.status as ActivityStatus] || statusConfig.PENDING;
  const StatusIcon = status.icon;

  const progress =
    activity.plannedQty > 0 ? Math.round((activity.executedQty / activity.plannedQty) * 100) : 0;

  const progressColor =
    progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Atividade ${activity.name}, ${status.label}, ${progress}% concluído`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn('h-10 w-10 rounded-lg flex items-center justify-center', status.color)}
              aria-hidden="true"
            >
              <StatusIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">{activity.name}</CardTitle>
              <CardDescription>{activity.code}</CardDescription>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Work Front */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardHat className="h-4 w-4" aria-hidden="true" />
          <span>{activity.workFrontName}</span>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {activity.executedQty.toLocaleString('pt-BR')} /{' '}
              {activity.plannedQty.toLocaleString('pt-BR')} {activity.unit}
            </span>
          </div>
          <div
            className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={Math.min(progress, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso: ${progress}%`}
          >
            <div
              className={cn('h-full transition-all', progressColor)}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% concluído</span>
            {progress >= 100 && (
              <Badge variant="outline" className="h-5" role="status">
                Concluída
              </Badge>
            )}
          </div>
        </div>

        {/* Dates */}
        {(activity.plannedStartDate || activity.plannedEndDate) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>
              {activity.plannedStartDate
                ? new Date(activity.plannedStartDate).toLocaleDateString('pt-BR')
                : '—'}
              {' → '}
              {activity.plannedEndDate
                ? new Date(activity.plannedEndDate).toLocaleDateString('pt-BR')
                : '—'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ────────────────────────────────────────────────────────────────────────────

const ActivityCardSkeleton: FC = () => (
  <Card aria-hidden="true">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-4 w-32" />
    </CardContent>
  </Card>
);

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const ActivitiesPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initial filters from URL
  const initialWorkFrontId = searchParams.get('workFrontId') || '';
  const initialContractId = searchParams.get('contractId') || '';

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'ALL'>('ALL');
  const [contractFilter, setContractFilter] = useState(initialContractId);
  const [workFrontFilter, setWorkFrontFilter] = useState(initialWorkFrontId);

  // Data fetching
  const { data: contracts = [] } = useContracts();
  const { data: allWorkFronts = [] } = useWorkFronts(contractFilter || undefined);
  const { data: activities = [], isLoading, refetch } = useActivitiesByWorkFront(workFrontFilter);

  // Filter work fronts by selected contract
  const filteredWorkFronts = useMemo(() => {
    if (!contractFilter) return allWorkFronts;
    return allWorkFronts.filter((wf) => wf.contractId === contractFilter);
  }, [allWorkFronts, contractFilter]);

  // Client-side filtering
  const filteredActivities = useMemo(() => {
    let result = activities;

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.code.toLowerCase().includes(searchLower) ||
          a.workFrontName.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [activities, statusFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter((a) => a.status === 'COMPLETED').length;
    const inProgress = activities.filter((a) => a.status === 'IN_PROGRESS').length;
    const avgProgress =
      activities.length > 0
        ? Math.round(
            activities.reduce((acc, a) => {
              const progress = a.plannedQty > 0 ? (a.executedQty / a.plannedQty) * 100 : 0;
              return acc + progress;
            }, 0) / activities.length
          )
        : 0;

    return { total, completed, inProgress, avgProgress };
  }, [activities]);

  // Handlers
  const handleView = (id: string) => navigate(`/enterprise/activities/${id}`);
  const handleNew = () => {
    const params = new URLSearchParams();
    if (workFrontFilter) params.set('workFrontId', workFrontFilter);
    navigate(`/enterprise/activities/new?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setContractFilter('');
    setWorkFrontFilter('');
  };

  const hasActiveFilters =
    search !== '' || statusFilter !== 'ALL' || contractFilter !== '' || workFrontFilter !== '';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atividades</h1>
          <p className="text-muted-foreground">Gerencie atividades das frentes de trabalho</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            aria-label="Atualizar lista de atividades"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </Button>
          <Button onClick={handleNew} disabled={!workFrontFilter}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nova Atividade
          </Button>
        </div>
      </div>

      {/* Stats */}
      {workFrontFilter && (
        <div
          className="grid gap-4 md:grid-cols-4"
          role="region"
          aria-label="Estatísticas das atividades"
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <Layers className="h-5 w-5 text-blue-700" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground" id="stat-total-label">
                  Total
                </p>
                <p className="text-xl font-bold" aria-describedby="stat-total-label">
                  {stats.total}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <Play className="h-5 w-5 text-amber-700" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground" id="stat-progress-label">
                  Em Andamento
                </p>
                <p className="text-xl font-bold" aria-describedby="stat-progress-label">
                  {stats.inProgress}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <CheckCircle2 className="h-5 w-5 text-green-700" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground" id="stat-completed-label">
                  Concluídas
                </p>
                <p className="text-xl font-bold" aria-describedby="stat-completed-label">
                  {stats.completed}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <Target className="h-5 w-5 text-purple-700" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground" id="stat-avg-label">
                  Progresso Médio
                </p>
                <p className="text-xl font-bold" aria-describedby="stat-avg-label">
                  {stats.avgProgress}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card role="search" aria-label="Filtros de atividades">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" aria-hidden="true" />
            <CardTitle className="text-base">Filtros</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7">
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Contract Filter */}
            <Select
              value={contractFilter || 'ALL'}
              onValueChange={(value) => {
                setContractFilter(value === 'ALL' ? '' : value);
                setWorkFrontFilter(''); // Reset work front when contract changes
              }}
            >
              <SelectTrigger aria-label="Filtrar por contrato">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Contratos</SelectItem>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Work Front Filter */}
            <Select
              value={workFrontFilter || 'ALL'}
              onValueChange={(value) => setWorkFrontFilter(value === 'ALL' ? '' : value)}
            >
              <SelectTrigger aria-label="Filtrar por frente de trabalho">
                <SelectValue placeholder="Frente de Trabalho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Frentes</SelectItem>
                {filteredWorkFronts.map((wf) => (
                  <SelectItem key={wf.id} value={wf.id}>
                    {wf.code} - {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ActivityStatus | 'ALL')}
            >
              <SelectTrigger aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="COMPLETED">Concluída</SelectItem>
                <SelectItem value="SUSPENDED">Suspensa</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Buscar atividade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Buscar atividade por nome ou código"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!workFrontFilter ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12" role="status">
            <HardHat className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Selecione uma Frente de Trabalho</h3>
            <p className="mt-2 text-center text-muted-foreground">
              Use os filtros acima para selecionar uma frente e ver suas atividades.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="Carregando atividades"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <ActivityCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12" role="status">
            <Layers className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma atividade encontrada</h3>
            <p className="mt-2 text-center text-muted-foreground">
              {hasActiveFilters
                ? 'Tente ajustar os filtros para ver mais resultados.'
                : 'Crie uma nova atividade para esta frente.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={handleNew} className="mt-4">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nova Atividade
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="region"
          aria-label={`${filteredActivities.length} atividades encontradas`}
          aria-live="polite"
        >
          {filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => handleView(activity.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
