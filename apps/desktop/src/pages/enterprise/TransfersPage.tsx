/**
 * @file TransfersPage - Página de Transferências de Estoque
 * @description Lista transferências entre locais com filtros e ações
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
import { TransferStatusBadge, PermissionGuard } from '@/components/enterprise';
import {
  ArrowRight,
  Clock,
  Eye,
  Filter,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StockTransferWithDetails } from '@/lib/tauri';
import { useStockTransfers, useStockLocations } from '@/hooks/enterprise';
import { useCanDo } from '@/hooks/useEnterprisePermission';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

type TransferStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'CANCELLED';

// ────────────────────────────────────────────────────────────────────────────
// STATS CARDS
// ────────────────────────────────────────────────────────────────────────────

interface TransferStats {
  pending: number;
  inTransit: number;
  todayReceived: number;
  totalThisWeek: number;
}

const StatsCards = ({ stats }: { stats: TransferStats }) => {
  return (
    <div
      className="grid gap-4 md:grid-cols-4"
      role="region"
      aria-label="Estatísticas de transferências"
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
          <div className="rounded-full bg-blue-100 p-3" aria-hidden="true">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-transit">
              {stats.inTransit}
            </p>
            <p id="stat-transit" className="text-sm text-muted-foreground">
              Em Trânsito
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-green-100 p-3" aria-hidden="true">
            <Package className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-received">
              {stats.todayReceived}
            </p>
            <p id="stat-received" className="text-sm text-muted-foreground">
              Recebidas Hoje
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-purple-100 p-3" aria-hidden="true">
            <MapPin className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-week">
              {stats.totalThisWeek}
            </p>
            <p id="stat-week" className="text-sm text-muted-foreground">
              Esta Semana
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

interface TransferRowProps {
  transfer: StockTransferWithDetails;
  onView: (id: string) => void;
}

const TransferRow = ({ transfer, onView }: TransferRowProps) => {
  const canDo = useCanDo();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView(transfer.id);
    }
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      onClick={() => onView(transfer.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Transferência ${transfer.transferNumber}, de ${
        transfer.sourceLocationName
      } para ${transfer.destinationLocationName}, status ${transfer.status}, ${
        transfer.itemCount || 0
      } itens`}
    >
      <TableCell className="font-mono text-sm">{transfer.transferNumber}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{transfer.sourceLocationName}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{transfer.destinationLocationName}</span>
        </div>
      </TableCell>
      <TableCell>
        <TransferStatusBadge status={transfer.status} />
      </TableCell>
      <TableCell>
        <Badge variant="outline" role="status" aria-label={`${transfer.itemCount || 0} itens`}>
          {transfer.itemCount || 0} itens
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {transfer.requesterName || 'Não informado'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(new Date(transfer.createdAt), {
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
            <DropdownMenuItem onClick={() => onView(transfer.id)}>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              Ver Detalhes
            </DropdownMenuItem>
            {transfer.status === 'PENDING' && canDo.approveTransfer && (
              <DropdownMenuItem>Aprovar</DropdownMenuItem>
            )}
            {transfer.status === 'APPROVED' && canDo.shipTransfer && (
              <DropdownMenuItem>Iniciar Transporte</DropdownMenuItem>
            )}
            {transfer.status === 'IN_TRANSIT' && canDo.receiveTransfer && (
              <DropdownMenuItem>Confirmar Recebimento</DropdownMenuItem>
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

export function TransfersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'ALL'>(
    (searchParams.get('status') as TransferStatus) || 'ALL'
  );
  const [originFilter, setOriginFilter] = useState(searchParams.get('originId') || '');
  const [destinationFilter, setDestinationFilter] = useState(
    searchParams.get('destinationId') || ''
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Real data from backend
  const statusQueryFilter = statusFilter === 'ALL' ? undefined : statusFilter;
  const {
    data: allTransfers = [],
    isLoading,
    refetch,
  } = useStockTransfers(
    originFilter || undefined,
    destinationFilter || undefined,
    statusQueryFilter
  );
  const { data: locations = [] } = useStockLocations();

  // Compute stats from real data
  const stats = useMemo(() => {
    const pending = allTransfers.filter((t) => t.status === 'PENDING').length;
    const inTransit = allTransfers.filter((t) => t.status === 'IN_TRANSIT').length;
    const today = new Date().toISOString().split('T')[0] ?? '';
    const todayReceived = allTransfers.filter(
      (t) => t.status === 'RECEIVED' && t.receivedAt?.startsWith(today)
    ).length;
    return { pending, inTransit, todayReceived, totalThisWeek: allTransfers.length };
  }, [allTransfers]);

  // Client-side search filter
  const filteredTransfers = useMemo(() => {
    if (!search) return allTransfers;
    const searchLower = search.toLowerCase();
    return allTransfers.filter(
      (t) =>
        t.transferNumber.toLowerCase().includes(searchLower) ||
        t.sourceLocationName.toLowerCase().includes(searchLower) ||
        t.destinationLocationName.toLowerCase().includes(searchLower) ||
        t.requesterName.toLowerCase().includes(searchLower)
    );
  }, [allTransfers, search]);

  const handleView = (id: string) => {
    navigate(`/enterprise/transfers/${id}`);
  };

  const handleNewTransfer = () => {
    navigate('/enterprise/transfers/new');
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setOriginFilter('');
    setDestinationFilter('');
    setSearch('');
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' || originFilter !== '' || destinationFilter !== '' || search !== '';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transferências de Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie movimentações entre almoxarifados e obras
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
          <PermissionGuard permission="transfers.create">
            <Button onClick={handleNewTransfer}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nova Transferência
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
            aria-label="Filtros de transferências"
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
                aria-label="Buscar transferências por código"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as TransferStatus | 'ALL')}
            >
              <SelectTrigger aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="APPROVED">Aprovada</SelectItem>
                <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                <SelectItem value="RECEIVED">Recebida</SelectItem>
                <SelectItem value="REJECTED">Rejeitada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={originFilter || 'ALL'}
              onValueChange={(value) => setOriginFilter(value === 'ALL' ? '' : value)}
            >
              <SelectTrigger aria-label="Filtrar por local de origem">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Locais</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.code} - {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={destinationFilter || 'ALL'}
              onValueChange={(value) => setDestinationFilter(value === 'ALL' ? '' : value)}
            >
              <SelectTrigger aria-label="Filtrar por local de destino">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Locais</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.code} - {location.name}
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
              ? 'Carregando transferências...'
              : `${filteredTransfers.length} transferência${
                  filteredTransfers.length !== 1 ? 's' : ''
                } encontrada${filteredTransfers.length !== 1 ? 's' : ''}`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table aria-label="Lista de transferências de estoque">
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Código</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead className="w-28">Status</TableHead>
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
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
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
              ) : filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2" role="status">
                      <Truck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                      <p className="text-muted-foreground">Nenhuma transferência encontrada</p>
                      {hasActiveFilters && (
                        <Button variant="link" onClick={clearFilters}>
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransfers.map((transfer) => (
                  <TransferRow key={transfer.id} transfer={transfer} onView={handleView} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
