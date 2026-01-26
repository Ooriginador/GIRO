/**
 * @file ContractsPage - Listagem de Contratos/Obras
 * @description Grid de cards com contratos e filtros
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
import { useContracts } from '@/hooks/enterprise';
import { cn } from '@/lib/utils';
import type { ContractWithManager } from '@/lib/tauri';
import type { ContractStatus } from '@/types/enterprise';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// STATUS BADGES
// ────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<ContractStatus, { label: string; color: string }> = {
  PLANNING: { label: 'Planejamento', color: 'bg-blue-100 text-blue-800' },
  ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
  SUSPENDED: { label: 'Suspenso', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Concluído', color: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

// ────────────────────────────────────────────────────────────────────────────
// CONTRACT CARD
// ────────────────────────────────────────────────────────────────────────────

interface ContractCardProps {
  contract: ContractWithManager;
  onClick: () => void;
}

const ContractCard: FC<ContractCardProps> = ({ contract, onClick }) => {
  const statusInfo = statusConfig[contract.status as ContractStatus] || statusConfig.ACTIVE;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Contrato ${contract.code}: ${contract.name}, cliente ${contract.clientName}, status ${statusInfo.label}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">{contract.code}</CardTitle>
            <CardDescription className="line-clamp-1">{contract.name}</CardDescription>
          </div>
          <Badge
            className={cn('font-normal shrink-0', statusInfo.color)}
            role="status"
            aria-label={`Status: ${statusInfo.label}`}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cliente */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="truncate" title={contract.clientName}>
            {contract.clientName}
          </span>
        </div>

        {/* Localização */}
        {contract.city && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {contract.city}
              {contract.state && `, ${contract.state}`}
            </span>
          </div>
        )}

        {/* Período */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {new Date(contract.startDate).toLocaleDateString('pt-BR')}
            {contract.endDate && ` - ${new Date(contract.endDate).toLocaleDateString('pt-BR')}`}
          </span>
        </div>

        {/* Gerente */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{contract.managerName || 'Não definido'}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// CONTRACT CARD SKELETON
// ────────────────────────────────────────────────────────────────────────────

const ContractCardSkeleton: FC = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-4 w-24" />
    </CardContent>
  </Card>
);

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;

interface ContractFilters {
  search: string;
  status: ContractStatus | 'ALL';
  managerId: string;
}

const initialFilters: ContractFilters = {
  search: '',
  status: 'ALL',
  managerId: 'ALL',
};

export const ContractsPage: FC = () => {
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState<ContractFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Real data from backend
  const statusFilter = filters.status === 'ALL' ? undefined : filters.status;
  const managerFilter = filters.managerId === 'ALL' ? undefined : filters.managerId;
  const { data: contracts = [], isLoading } = useContracts(statusFilter, managerFilter);

  // Client-side search filter
  const filteredContracts = useMemo(() => {
    if (!filters.search) return contracts;
    const searchLower = filters.search.toLowerCase();
    return contracts.filter(
      (c) =>
        c.code.toLowerCase().includes(searchLower) ||
        c.name.toLowerCase().includes(searchLower) ||
        c.clientName.toLowerCase().includes(searchLower)
    );
  }, [contracts, filters.search]);

  // Paginação
  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
  const paginatedContracts = filteredContracts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const hasActiveFilters =
    filters.search !== '' || filters.status !== 'ALL' || filters.managerId !== 'ALL';

  const updateFilters = (updates: Partial<ContractFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Gerencie obras e contratos do almoxarifado</p>
        </div>
        <Button onClick={() => navigate('/enterprise/contracts/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Buscar por código, nome ou cliente..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                aria-label="Buscar contratos"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="contract-filters"
            >
              <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2" aria-label="Filtros ativos">
                  {
                    [filters.status !== 'ALL' && 1, filters.managerId !== 'ALL' && 1].filter(
                      Boolean
                    ).length
                  }
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} aria-label="Limpar filtros">
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Limpar
              </Button>
            )}
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div
              id="contract-filters"
              className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3"
              role="region"
              aria-label="Filtros avançados de contratos"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    updateFilters({ status: value as ContractStatus | 'ALL' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="PLANNING">Planejamento</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Gerente</label>
                <Select
                  value={filters.managerId}
                  onValueChange={(value) => updateFilters({ managerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os gerentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os gerentes</SelectItem>
                    {/* TODO: Carregar gerentes dinamicamente */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contracts Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ContractCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum contrato encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'Tente ajustar os filtros'
                : 'Crie seu primeiro contrato para começar'}
            </p>
            {!hasActiveFilters && (
              <Button className="mt-4" onClick={() => navigate('/enterprise/contracts/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Contrato
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedContracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onClick={() => navigate(`/enterprise/contracts/${contract.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between"
              aria-label="Navegação de páginas dos contratos"
            >
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Mostrando {(page - 1) * ITEMS_PER_PAGE + 1} -{' '}
                {Math.min(page * ITEMS_PER_PAGE, filteredContracts.length)} de{' '}
                {filteredContracts.length} contratos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  aria-label="Próxima página"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
};
