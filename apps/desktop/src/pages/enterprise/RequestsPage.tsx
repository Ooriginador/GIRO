/**
 * @file RequestsPage - Página de Requisições de Material
 * @description Lista requisições com filtros e ações de workflow
 */

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RequestStatusBadge, PriorityBadge, PermissionGuard } from '@/components/enterprise';
import {
  AlertCircle,
  Clock,
  Eye,
  Filter,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MaterialRequestWithDetails } from '@/lib/tauri';
import { useMaterialRequests, usePendingRequests, useContracts } from '@/hooks/enterprise';
import { useCanDo } from '@/hooks/useEnterprisePermission';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

type MaterialRequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'SEPARATING'
  | 'SEPARATED'
  | 'DELIVERED'
  | 'CANCELLED';
type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// ────────────────────────────────────────────────────────────────────────────
// STATS CARDS
// ────────────────────────────────────────────────────────────────────────────

interface RequestStats {
  pending: number;
  separating: number;
  urgent: number;
  todayCount: number;
}

const StatsCards = ({ stats }: { stats: RequestStats }) => {
  return (
    <div
      className="grid gap-4 md:grid-cols-4"
      role="region"
      aria-label="Estatísticas de requisições"
    >
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-yellow-100 p-3" aria-hidden="true">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-pending">
              {stats.pending}
            </p>
            <p id="stat-pending" className="text-sm text-muted-foreground">
              Aguardando Aprovação
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-purple-100 p-3" aria-hidden="true">
            <Package className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-separating">
              {stats.separating}
            </p>
            <p id="stat-separating" className="text-sm text-muted-foreground">
              Em Separação
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-red-100 p-3" aria-hidden="true">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-urgent">
              {stats.urgent}
            </p>
            <p id="stat-urgent" className="text-sm text-muted-foreground">
              Urgentes
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-blue-100 p-3" aria-hidden="true">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-today">
              {stats.todayCount}
            </p>
            <p id="stat-today" className="text-sm text-muted-foreground">
              Criadas Hoje
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// TABLE ROW
// ────────────────────────────────────────────────────────────────────────────

interface RequestRowProps {
  request: MaterialRequestWithDetails;
  onView: (id: string) => void;
}

const RequestRow = ({ request, onView }: RequestRowProps) => {
  const canDo = useCanDo();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView(request.id);
    }
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      onClick={() => onView(request.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="request-row"
      aria-label={`Requisição ${request.code}, contrato ${request.contractCode}, status ${
        request.status
      }, prioridade ${request.priority}, ${request.itemCount || 0} itens`}
    >
      <TableCell className="font-mono text-sm">{request.code}</TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{request.contractCode}</p>
          {request.destinationName && (
            <p className="text-xs text-muted-foreground">{request.destinationName}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <RequestStatusBadge status={request.status} />
      </TableCell>
      <TableCell>
        <PriorityBadge priority={request.priority} />
      </TableCell>
      <TableCell>
        <Badge variant="outline" role="status" aria-label={`${request.itemCount || 0} itens`}>
          {request.itemCount || 0} itens
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {request.requesterName || 'Não informado'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(new Date(request.createdAt), {
          addSuffix: true,
          locale: ptBR,
        })}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mais ações">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(request.id)}>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              Ver Detalhes
            </DropdownMenuItem>
            {request.status === 'PENDING' && canDo.approveRequest && (
              <DropdownMenuItem>Aprovar</DropdownMenuItem>
            )}
            {request.status === 'APPROVED' && canDo.separateRequest && (
              <DropdownMenuItem>Iniciar Separação</DropdownMenuItem>
            )}
            {request.status === 'SEPARATING' && canDo.deliverRequest && (
              <DropdownMenuItem>Registrar Entrega</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function RequestsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<MaterialRequestStatus | 'ALL'>(
    (searchParams.get('status') as MaterialRequestStatus) || 'ALL'
  );
  const [priorityFilter, setPriorityFilter] = useState<RequestPriority | 'ALL'>(
    (searchParams.get('priority') as RequestPriority) || 'ALL'
  );
  const [contractFilter, setContractFilter] = useState(searchParams.get('contractId') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Real data from backend
  const statusQueryFilter = statusFilter === 'ALL' ? undefined : statusFilter;
  const {
    data: allRequests = [],
    isLoading,
    refetch,
  } = useMaterialRequests(contractFilter || undefined, statusQueryFilter);
  // Note: pendingRequests hook is available for separate pending list if needed
  usePendingRequests();
  const { data: contracts = [] } = useContracts();

  // Compute stats from real data
  const stats = useMemo(() => {
    const pending = allRequests.filter((r) => r.status === 'PENDING').length;
    const separating = allRequests.filter((r) => r.status === 'SEPARATING').length;
    const urgent = allRequests.filter((r) => r.priority === 'URGENT').length;
    const today = new Date().toISOString().split('T')[0] ?? '';
    const todayCount = allRequests.filter((r) => r.createdAt?.startsWith(today)).length;
    return { pending, separating, urgent, todayCount };
  }, [allRequests]);

  // Client-side filtering by search and priority
  const filteredRequests = useMemo(() => {
    let result = allRequests;

    // Filter by priority
    if (priorityFilter !== 'ALL') {
      result = result.filter((r) => r.priority === priorityFilter);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.code.toLowerCase().includes(searchLower) ||
          r.contractCode.toLowerCase().includes(searchLower) ||
          r.requesterName.toLowerCase().includes(searchLower) ||
          r.destinationName.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [allRequests, priorityFilter, search]);

  const handleView = (id: string) => {
    navigate(`/enterprise/requests/${id}`);
  };

  const handleNewRequest = () => {
    navigate('/enterprise/requests/new');
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setContractFilter('');
    setSearch('');
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' || priorityFilter !== 'ALL' || contractFilter !== '' || search !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requisições de Material</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de materiais para obras e frentes
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
          <PermissionGuard permission="requests.create">
            <Button onClick={handleNewRequest} data-testid="new-request-btn">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nova Requisição
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

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
            className="grid gap-4 md:grid-cols-4"
            role="search"
            aria-label="Filtros de requisições"
          >
            <div className="relative">
              <Search
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Buscar por código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                aria-label="Buscar requisições por código"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as MaterialRequestStatus | 'ALL')}
            >
              <SelectTrigger aria-label="Filtrar por status" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="APPROVED">Aprovada</SelectItem>
                <SelectItem value="SEPARATING">Em Separação</SelectItem>
                <SelectItem value="DELIVERED">Entregue</SelectItem>
                <SelectItem value="REJECTED">Rejeitada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(value) => setPriorityFilter(value as RequestPriority | 'ALL')}
            >
              <SelectTrigger aria-label="Filtrar por prioridade">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Prioridades</SelectItem>
                <SelectItem value="LOW">Baixa</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
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
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.code} - {contract.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading
              ? 'Carregando requisições...'
              : `${filteredRequests.length} requisição${
                  filteredRequests.length !== 1 ? 'ões' : ''
                } encontrada${filteredRequests.length !== 1 ? 's' : ''}`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table aria-label="Lista de requisições de material">
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Código</TableHead>
                <TableHead>Contrato / Frente</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24">Prioridade</TableHead>
                <TableHead className="w-24">Itens</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead className="w-36">Criada</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} aria-hidden="true">
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2" role="status">
                      <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                      <p className="text-muted-foreground">Nenhuma requisição encontrada</p>
                      {hasActiveFilters && (
                        <Button variant="link" onClick={clearFilters}>
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <RequestRow key={request.id} request={request} onView={handleView} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
