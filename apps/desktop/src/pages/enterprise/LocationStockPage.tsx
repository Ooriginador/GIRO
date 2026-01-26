import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Search,
  Package,
  MapPin,
  AlertTriangle,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StockLocation, StockBalance } from '@/types/enterprise';

// Type badge colors
const typeColors: Record<string, string> = {
  CENTRAL: 'bg-blue-100 text-blue-800',
  FIELD: 'bg-green-100 text-green-800',
  TRANSIT: 'bg-yellow-100 text-yellow-800',
};

const typeLabels: Record<string, string> = {
  CENTRAL: 'Central',
  FIELD: 'Campo',
  TRANSIT: 'Trânsito',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function LocationStockPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [location, setLocation] = useState<StockLocation | null>(null);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<StockBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadLocationStock = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // TODO: Replace with actual Tauri invoke
      // const locationData = await invoke<StockLocation>('get_stock_location', { id });
      // const balancesData = await invoke<StockBalance[]>('get_location_balances', { locationId: id });

      // Mock data for development
      const mockLocation: StockLocation = {
        id,
        code: 'ALM-CENTRAL',
        name: 'Almoxarifado Central',
        type: 'CENTRAL',
        description: 'Almoxarifado central da empresa',
        address: 'Rua das Indústrias, 500 - Distrito Industrial',
        managerId: 'user-1',
        contractId: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        manager: {
          id: 'user-1',
          name: 'José Almoxarife',
          role: 'WAREHOUSE',
        } as StockLocation['manager'],
      };

      const mockBalances: StockBalance[] = [
        {
          id: 'bal-1',
          locationId: id,
          productId: 'prod-1',
          quantity: 150,
          reservedQuantity: 0,
          availableQuantity: 150,
          updatedAt: new Date().toISOString(),
          product: {
            id: 'prod-1',
            name: 'Cimento Portland CP-II 50kg',
            sku: 'CIM-001',
            unit: 'SC',
          },
        },
        {
          id: 'bal-2',
          locationId: id,
          productId: 'prod-2',
          quantity: 25,
          reservedQuantity: 0,
          availableQuantity: 25,
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          product: {
            id: 'prod-2',
            name: 'Areia Média Lavada M³',
            sku: 'ARE-001',
            unit: 'M³',
          },
        },
        {
          id: 'bal-3',
          locationId: id,
          productId: 'prod-3',
          quantity: 500,
          reservedQuantity: 0,
          availableQuantity: 500,
          updatedAt: new Date(Date.now() - 172800000).toISOString(),
          product: {
            id: 'prod-3',
            name: 'Vergalhão CA-50 10mm 12m',
            sku: 'VER-001',
            unit: 'BR',
          },
        },
        {
          id: 'bal-4',
          locationId: id,
          productId: 'prod-4',
          quantity: 80,
          reservedQuantity: 0,
          availableQuantity: 80,
          updatedAt: new Date(Date.now() - 259200000).toISOString(),
          product: {
            id: 'prod-4',
            name: 'Tinta Acrílica Premium 18L',
            sku: 'TIN-001',
            unit: 'GL',
          },
        },
        {
          id: 'bal-5',
          locationId: id,
          productId: 'prod-5',
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          updatedAt: new Date(Date.now() - 432000000).toISOString(),
          product: {
            id: 'prod-5',
            name: 'Tijolo Cerâmico 6 Furos',
            sku: 'TIJ-001',
            unit: 'UN',
          },
        },
      ];

      setLocation(mockLocation);
      setBalances(mockBalances);
    } catch (error) {
      console.error('Failed to load location stock:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLocationStock();
  }, [loadLocationStock]);

  const filterAndSortBalances = useCallback(() => {
    let filtered = [...balances];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.product?.name.toLowerCase().includes(searchLower) ||
          (b.product?.sku || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter - TODO: Add category to Product type
    if (categoryFilter !== 'all') {
      // Category filter disabled until Product type includes category
      // filtered = filtered.filter((b) => b.product?.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.product?.name || '').localeCompare(b.product?.name || '');
          break;
        case 'code':
          comparison = (a.product?.sku || '').localeCompare(b.product?.sku || '');
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'value':
          comparison = a.quantity * (a.averageCost || 0) - b.quantity * (b.averageCost || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredBalances(filtered);
  }, [balances, search, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    filterAndSortBalances();
  }, [filterAndSortBalances]);

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  async function handleExport() {
    // TODO: Implement export functionality
    console.log('Exporting stock balances...');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Local não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/enterprise/locations')}>
          Voltar para Locais
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalItems = balances.length;
  const totalQuantity = balances.reduce((sum, b) => sum + b.quantity, 0);
  const totalValue = balances.reduce((sum, b) => sum + b.quantity * (b.averageCost || 0), 0);
  const lowStockCount = balances.filter((b) => b.minQuantity && b.quantity < b.minQuantity).length;
  const outOfStockCount = balances.filter((b) => b.quantity === 0).length;

  // Get unique categories for filter - TODO: Add category to Product type
  const categories: string[] = [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enterprise/locations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Estoque - {location.name}</h1>
              <Badge className={typeColors[location.type]}>{typeLabels[location.type]}</Badge>
            </div>
            <p className="text-muted-foreground">
              {location.code} • {location.address}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/enterprise/locations/${id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Detalhes do Local
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Itens</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unidades</p>
                <p className="text-2xl font-bold">{totalQuantity.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sem Estoque</p>
                <p className="text-2xl font-bold">{outOfStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Saldos de Estoque</CardTitle>
          <CardDescription>
            {filteredBalances.length} de {balances.length} itens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3"
                    onClick={() => toggleSort('code')}
                  >
                    Código
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3"
                    onClick={() => toggleSort('name')}
                  >
                    Produto
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('quantity')}>
                    Quantidade
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Mín / Máx</TableHead>
                <TableHead className="text-right">Custo Médio</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('value')}>
                    Valor Total
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBalances.map((balance) => {
                const value = balance.quantity * (balance.averageCost || 0);
                const isLowStock =
                  balance.minQuantity &&
                  balance.quantity < balance.minQuantity &&
                  balance.quantity > 0;
                const isOutOfStock = balance.quantity === 0;

                return (
                  <TableRow
                    key={balance.id}
                    className={isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-yellow-50' : ''}
                  >
                    <TableCell className="font-mono text-sm">{balance.product?.sku}</TableCell>
                    <TableCell className="font-medium">{balance.product?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">-</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={isOutOfStock ? 'text-red-600 font-semibold' : ''}>
                        {balance.quantity.toLocaleString('pt-BR')} {balance.product?.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balance.minQuantity || '-'} / {balance.maxQuantity || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balance.averageCost || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(value)}
                    </TableCell>
                    <TableCell className="text-center">
                      {isOutOfStock ? (
                        <Badge variant="destructive">Sem Estoque</Badge>
                      ) : isLowStock ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Baixo</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredBalances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
