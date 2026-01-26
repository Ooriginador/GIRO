/**
 * @file LocationsPage - Página de Locais de Estoque
 * @description Lista almoxarifados e locais de armazenamento com saldos
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
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/components/enterprise';
import {
  Box,
  Building,
  Filter,
  MapPin,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  Warehouse,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { StockLocationWithDetails } from '@/lib/tauri';
import { useStockLocations, useContracts } from '@/hooks/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

type StockLocationType = 'CENTRAL' | 'FIELD' | 'TRANSIT';

// ────────────────────────────────────────────────────────────────────────────
// STATS CARDS
// ────────────────────────────────────────────────────────────────────────────

interface LocationStats {
  central: number;
  field: number;
  totalItems: number;
  totalValue: number;
}

const StatsCards = ({ stats }: { stats: LocationStats }) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div
      className="grid gap-4 md:grid-cols-4"
      role="region"
      aria-label="Estatísticas de locais de estoque"
    >
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-blue-100 p-3" aria-hidden="true">
            <Warehouse className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-central">
              {stats.central}
            </p>
            <p id="stat-central" className="text-sm text-muted-foreground">
              Almoxarifados Centrais
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-green-100 p-3" aria-hidden="true">
            <MapPin className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-field">
              {stats.field}
            </p>
            <p id="stat-field" className="text-sm text-muted-foreground">
              Almoxarifados de Campo
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
            <p className="text-2xl font-bold" aria-describedby="stat-items">
              {stats.totalItems.toLocaleString()}
            </p>
            <p id="stat-items" className="text-sm text-muted-foreground">
              Total de Itens
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="rounded-full bg-yellow-100 p-3" aria-hidden="true">
            <Box className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold" aria-describedby="stat-value">
              {formatCurrency(stats.totalValue)}
            </p>
            <p id="stat-value" className="text-sm text-muted-foreground">
              Valor em Estoque
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// LOCATION CARD
// ────────────────────────────────────────────────────────────────────────────

interface LocationCardProps {
  location: StockLocationWithDetails;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onViewStock: (id: string) => void;
}

const LocationCard = ({ location, onView, onEdit, onViewStock }: LocationCardProps) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const locationType = location.locationType as StockLocationType;
  const typeConfig: Record<
    StockLocationType,
    { label: string; color: string; icon: typeof Warehouse }
  > = {
    CENTRAL: { label: 'Central', color: 'bg-blue-100 text-blue-700', icon: Warehouse },
    FIELD: { label: 'Campo', color: 'bg-green-100 text-green-700', icon: MapPin },
    TRANSIT: { label: 'Trânsito', color: 'bg-yellow-100 text-yellow-700', icon: Package },
  };

  const config = typeConfig[locationType];
  const Icon = config.icon;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView(location.id);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => onView(location.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${config.label} ${location.name}, código ${location.code}, ${
        location.itemCount?.toLocaleString() || 0
      } itens, ${location.isActive ? 'ativo' : 'inativo'}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-lg p-2',
                config.color.replace('text-', 'bg-').replace('-700', '-100')
              )}
              aria-hidden="true"
            >
              <Icon className={cn('h-5 w-5', config.color.split(' ')[1])} />
            </div>
            <div>
              <CardTitle className="text-base">{location.name}</CardTitle>
              <CardDescription className="font-mono text-xs">{location.code}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={cn('font-normal', config.color)}
              role="status"
              aria-label={`Tipo: ${config.label}`}
            >
              {config.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(location.id)}>
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewStock(location.id)}>
                  Ver estoque
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(location.id)}>Editar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Contract */}
        {location.contractCode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{location.contractCode}</span>
          </div>
        )}

        {/* Address */}
        {location.address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{location.address}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="text-center">
            <p className="text-lg font-semibold">{location.itemCount?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Itens</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{formatCurrency(location.totalValue || 0)}</p>
            <p className="text-xs text-muted-foreground">Valor</p>
          </div>
        </div>

        {/* Active status */}
        <div
          className="flex items-center gap-2"
          role="status"
          aria-label={location.isActive ? 'Local ativo' : 'Local inativo'}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              location.isActive ? 'bg-green-500' : 'bg-gray-400'
            )}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">
            {location.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function LocationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filter state
  const [typeFilter, setTypeFilter] = useState<StockLocationType | 'ALL'>(
    (searchParams.get('type') as StockLocationType) || 'ALL'
  );
  const [contractFilter, setContractFilter] = useState(searchParams.get('contractId') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Real data from backend
  const typeQueryFilter = typeFilter === 'ALL' ? undefined : typeFilter;
  const {
    data: allLocations = [],
    isLoading,
    refetch,
  } = useStockLocations(contractFilter || undefined, typeQueryFilter);
  const { data: contracts = [] } = useContracts();

  // Compute stats from real data
  const stats = useMemo(() => {
    const central = allLocations.filter((l) => l.locationType === 'CENTRAL').length;
    const field = allLocations.filter((l) => l.locationType === 'FIELD').length;
    const totalItems = allLocations.reduce((sum, l) => sum + (l.itemCount || 0), 0);
    const totalValue = allLocations.reduce((sum, l) => sum + (l.totalValue || 0), 0);
    return { central, field, totalItems, totalValue };
  }, [allLocations]);

  // Client-side search filter
  const filteredLocations = useMemo(() => {
    if (!search) return allLocations;
    const searchLower = search.toLowerCase();
    return allLocations.filter(
      (l) =>
        l.name.toLowerCase().includes(searchLower) || l.code.toLowerCase().includes(searchLower)
    );
  }, [allLocations, search]);

  // Group by type
  const centralLocations = filteredLocations.filter((l) => l.locationType === 'CENTRAL');
  const fieldLocations = filteredLocations.filter((l) => l.locationType === 'FIELD');
  const transitLocations = filteredLocations.filter((l) => l.locationType === 'TRANSIT');

  const handleView = (id: string) => {
    navigate(`/enterprise/locations/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/enterprise/locations/${id}/edit`);
  };

  const handleViewStock = (id: string) => {
    navigate(`/enterprise/locations/${id}/stock`);
  };

  const handleNewLocation = () => {
    navigate('/enterprise/locations/new');
  };

  const clearFilters = () => {
    setTypeFilter('ALL');
    setContractFilter('');
    setSearch('');
  };

  const hasActiveFilters = typeFilter !== 'ALL' || contractFilter !== '' || search !== '';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locais de Estoque</h1>
          <p className="text-muted-foreground">Gerencie almoxarifados centrais e de campo</p>
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
          <PermissionGuard permission="locations.create">
            <Button onClick={handleNewLocation}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo Local
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
            className="grid gap-4 md:grid-cols-3"
            role="search"
            aria-label="Filtros de locais de estoque"
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
                aria-label="Buscar locais de estoque"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as StockLocationType | 'ALL')}
            >
              <SelectTrigger aria-label="Filtrar por tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Tipos</SelectItem>
                <SelectItem value="CENTRAL">Central</SelectItem>
                <SelectItem value="FIELD">Campo</SelectItem>
                <SelectItem value="TRANSIT">Trânsito</SelectItem>
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

      {/* Results count */}
      <p
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLoading
          ? 'Carregando locais...'
          : `${filteredLocations.length} loca${
              filteredLocations.length !== 1 ? 'is' : 'l'
            } encontrado${filteredLocations.length !== 1 ? 's' : ''}`}
      </p>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12" role="status">
            <Warehouse className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum local encontrado</h3>
            <p className="mt-2 text-center text-muted-foreground">
              {hasActiveFilters
                ? 'Tente ajustar os filtros para ver mais resultados.'
                : 'Crie um novo local de estoque para começar.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Limpar filtros
              </Button>
            ) : (
              <PermissionGuard permission="locations.create">
                <Button onClick={handleNewLocation} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Novo Local
                </Button>
              </PermissionGuard>
            )}
          </CardContent>
        </Card>
      ) : typeFilter !== 'ALL' ? (
        // Show flat list when filtering by type
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Lista de locais de estoque"
        >
          {filteredLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onView={handleView}
              onEdit={handleEdit}
              onViewStock={handleViewStock}
            />
          ))}
        </div>
      ) : (
        // Group by type when showing all
        <div className="space-y-8">
          {/* Central */}
          {centralLocations.length > 0 && (
            <section aria-label="Almoxarifados Centrais">
              <div className="mb-4 flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Almoxarifados Centrais</h2>
                <Badge variant="secondary" aria-label={`${centralLocations.length} locais`}>
                  {centralLocations.length}
                </Badge>
              </div>
              <div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                role="list"
                aria-label="Lista de almoxarifados centrais"
              >
                {centralLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onView={handleView}
                    onEdit={handleEdit}
                    onViewStock={handleViewStock}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Field */}
          {fieldLocations.length > 0 && (
            <section aria-label="Almoxarifados de Campo">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Almoxarifados de Campo</h2>
                <Badge variant="secondary" aria-label={`${fieldLocations.length} locais`}>
                  {fieldLocations.length}
                </Badge>
              </div>
              <div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                role="list"
                aria-label="Lista de almoxarifados de campo"
              >
                {fieldLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onView={handleView}
                    onEdit={handleEdit}
                    onViewStock={handleViewStock}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Transit */}
          {transitLocations.length > 0 && (
            <section aria-label="Locais de Trânsito">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Locais de Trânsito</h2>
                <Badge variant="secondary" aria-label={`${transitLocations.length} locais`}>
                  {transitLocations.length}
                </Badge>
              </div>
              <div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                role="list"
                aria-label="Lista de locais de trânsito"
              >
                {transitLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onView={handleView}
                    onEdit={handleEdit}
                    onViewStock={handleViewStock}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
