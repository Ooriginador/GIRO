/**
 * @file WorkFrontsPage - Página de Frentes de Trabalho
 * @description Lista frentes de trabalho com atividades e progresso
 */

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkFrontStatusBadge, PermissionGuard } from '@/components/enterprise';
import {
  Building,
  Filter,
  HardHat,
  ListTodo,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkFrontWithDetails, ContractWithManager } from '@/lib/tauri';
import { useWorkFronts, useContracts } from '@/hooks/useEnterpriseCommands';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

type WorkFrontStatus = 'PLANNING' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';

// ────────────────────────────────────────────────────────────────────────────
// WORK FRONT CARD
// ────────────────────────────────────────────────────────────────────────────

interface WorkFrontCardProps {
  workFront: WorkFrontWithDetails;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

const WorkFrontCard = ({ workFront, onView, onEdit }: WorkFrontCardProps) => {
  const progress = workFront.progress || 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView(workFront.id);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => onView(workFront.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Frente ${workFront.name}, código ${workFront.code}, ${Math.round(
        progress
      )}% concluído, status ${workFront.status}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2" aria-hidden="true">
              <HardHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{workFront.name}</CardTitle>
              <CardDescription className="font-mono text-xs">{workFront.code}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WorkFrontStatusBadge status={workFront.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(workFront.id)}>
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(workFront.id)}>Editar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract info */}
        {workFront.contractCode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4" aria-hidden="true" />
            <span>{workFront.contractCode}</span>
          </div>
        )}

        {/* Supervisor */}
        {workFront.supervisorName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>{workFront.supervisorName}</span>
          </div>
        )}

        {/* Activities count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListTodo className="h-4 w-4" aria-hidden="true" />
          <span>{workFront.activityCount || 0} atividades</span>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            aria-label={`Progresso: ${Math.round(progress)}%`}
          />
        </div>

        {/* Location */}
        {workFront.location && (
          <p className="text-xs text-muted-foreground">{workFront.location}</p>
        )}
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function WorkFrontsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<WorkFrontStatus | 'ALL'>(
    (searchParams.get('status') as WorkFrontStatus) || 'ALL'
  );
  const [contractFilter, setContractFilter] = useState(searchParams.get('contractId') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Real data from backend
  const statusQueryFilter = statusFilter === 'ALL' ? undefined : statusFilter;
  const {
    data: allWorkFronts = [],
    isLoading,
    refetch,
  } = useWorkFronts(contractFilter || undefined, statusQueryFilter);
  const { data: contracts = [] } = useContracts();

  // Client-side search filter
  const filteredWorkFronts = useMemo(() => {
    if (!search) return allWorkFronts;
    const searchLower = search.toLowerCase();
    return allWorkFronts.filter(
      (wf: WorkFrontWithDetails) =>
        wf.name.toLowerCase().includes(searchLower) ||
        wf.code.toLowerCase().includes(searchLower) ||
        (wf.contractCode && wf.contractCode.toLowerCase().includes(searchLower))
    );
  }, [allWorkFronts, search]);

  const handleView = (id: string) => {
    navigate(`/enterprise/work-fronts/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/enterprise/work-fronts/${id}/edit`);
  };

  const handleNewWorkFront = () => {
    navigate('/enterprise/work-fronts/new');
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setContractFilter('');
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'ALL' || contractFilter !== '' || search !== '';

  // Group by contract
  const workFrontsByContract = useMemo(() => {
    const grouped = filteredWorkFronts.reduce(
      (acc: Record<string, WorkFrontWithDetails[]>, wf: WorkFrontWithDetails) => {
        const contractCode = wf.contractCode || 'Sem Contrato';
        if (!acc[contractCode]) {
          acc[contractCode] = [];
        }
        acc[contractCode].push(wf);
        return acc;
      },
      {} as Record<string, WorkFrontWithDetails[]>
    );

    return Object.entries(grouped).map(([contractCode, workFronts]) => ({
      contractCode,
      workFronts,
    }));
  }, [filteredWorkFronts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Frentes de Trabalho</h1>
          <p className="text-muted-foreground">
            Gerencie as frentes de trabalho e atividades das obras
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            aria-label="Atualizar lista"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </Button>
          <PermissionGuard permission="workFronts.create">
            <Button onClick={handleNewWorkFront}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nova Frente
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filters */}
      <Card>
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
          <div
            className="grid gap-4 md:grid-cols-3"
            role="search"
            aria-label="Filtros de frentes de trabalho"
          >
            <div className="relative">
              <Search
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Buscar por nome ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                aria-label="Buscar frentes de trabalho"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as WorkFrontStatus | 'ALL')}
            >
              <SelectTrigger aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="PLANNING">Planejamento</SelectItem>
                <SelectItem value="ACTIVE">Ativa</SelectItem>
                <SelectItem value="SUSPENDED">Suspensa</SelectItem>
                <SelectItem value="COMPLETED">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={contractFilter || 'ALL'}
              onValueChange={(value) => setContractFilter(value === 'ALL' ? '' : value)}
            >
              <SelectTrigger aria-label="Filtrar por contrato">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Contratos</SelectItem>
                {contracts.map((contract: ContractWithManager) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.code} - {contract.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <p
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLoading
          ? 'Carregando frentes de trabalho...'
          : `${filteredWorkFronts.length} frente${
              filteredWorkFronts.length !== 1 ? 's' : ''
            } encontrada${filteredWorkFronts.length !== 1 ? 's' : ''}`}
      </p>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredWorkFronts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12" role="status">
            <HardHat className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma frente encontrada</h3>
            <p className="mt-2 text-center text-muted-foreground">
              {hasActiveFilters
                ? 'Tente ajustar os filtros para ver mais resultados.'
                : 'Crie uma nova frente de trabalho para começar.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Limpar filtros
              </Button>
            ) : (
              <PermissionGuard permission="workFronts.create">
                <Button onClick={handleNewWorkFront} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Nova Frente
                </Button>
              </PermissionGuard>
            )}
          </CardContent>
        </Card>
      ) : contractFilter ? (
        // Show flat list when filtering by contract
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Lista de frentes de trabalho"
        >
          {filteredWorkFronts.map((wf: WorkFrontWithDetails) => (
            <WorkFrontCard key={wf.id} workFront={wf} onView={handleView} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        // Group by contract when showing all
        <div className="space-y-8">
          {workFrontsByContract.map(({ contractCode, workFronts: groupWorkFronts }) => (
            <section
              key={contractCode || 'none'}
              aria-label={`Contrato ${contractCode || 'Sem contrato'}`}
            >
              <div className="mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-lg font-semibold">{contractCode || 'Sem contrato'}</h2>
                <Badge variant="secondary" aria-label={`${groupWorkFronts.length} frentes`}>
                  {groupWorkFronts.length}
                </Badge>
              </div>
              <div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                role="list"
                aria-label={`Frentes do contrato ${contractCode}`}
              >
                {groupWorkFronts.map((wf: WorkFrontWithDetails) => (
                  <WorkFrontCard
                    key={wf.id}
                    workFront={wf}
                    onView={handleView}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
