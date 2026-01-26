/**
 * @file ProductsPage - Listagem de produtos
 * @description Tabela com todos os produtos cadastrados
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import {
  useCreateProduct,
  useDeactivateProduct,
  useDeleteProduct,
  useProductsPaginated,
  useReactivateProduct,
} from '@/hooks/use-products';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';
import {
  Copy,
  Edit,
  MoreHorizontal,
  Package,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
} from 'lucide-react';
import { type FC, useEffect, useState, useRef, useMemo } from 'react';
import { type ExportSummaryItem } from '@/lib/export';
import { Link, useNavigate } from 'react-router-dom';
import { useKeyboard } from '@/hooks/use-keyboard';
import { useCategories } from '@/hooks/useCategories';
import { ExportButtons } from '@/components/shared';
import { type ExportColumn } from '@/lib/export';

type StatusFilter = 'all' | 'active' | 'inactive';

export const ProductsPage: FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Categories Data
  const { data: categories = [] } = useCategories();

  // Create map for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  // Keyboard Shortcuts
  useKeyboard([
    {
      key: 'F1',
      action: () => navigate('/tutorials'),
      description: 'Ajuda',
    },
    {
      key: 'F2',
      action: () => navigate('/products/new'),
      description: 'Novo Produto',
    },
    {
      key: 'F3',
      action: () => searchInputRef.current?.focus(),
      description: 'Buscar',
    },
    {
      key: 'Escape',
      action: () => {
        if (searchQuery) setSearchQuery('');
      },
      description: 'Limpar busca',
    },
  ]);

  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const deactivateProduct = useDeactivateProduct();
  const reactivateProduct = useReactivateProduct();

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Backend Pagination Hook
  const { data: paginatedResult, isLoading } = useProductsPaginated(
    page,
    perPage,
    debouncedSearch || undefined,
    categoryId, // categoryId
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined
  );

  const products = useMemo(() => paginatedResult?.data || [], [paginatedResult?.data]);
  const totalPages = paginatedResult?.totalPages || 1;
  const totalItems = paginatedResult?.total || 0;

  // Colunas para exportação
  const exportColumns: ExportColumn<Product>[] = useMemo(
    () => [
      { key: 'code', header: 'Código', width: 80 },
      { key: 'barcode', header: 'Código de Barras', width: 120 },
      { key: 'name', header: 'Nome', width: 200 },
      {
        key: 'categoryId',
        header: 'Categoria',
        width: 120,
        formatter: (value) => categoryMap.get(String(value)) || '-',
      },
      { key: 'unit', header: 'Unidade', width: 60, align: 'center' },
      {
        key: 'salePrice',
        header: 'Preço Venda',
        align: 'right',
        width: 100,
        type: 'currency',
        totalizable: true,
        formatter: (value) => formatCurrency(Number(value) || 0),
      },
      {
        key: 'costPrice',
        header: 'Preço Custo',
        align: 'right',
        width: 100,
        type: 'currency',
        totalizable: true,
        formatter: (value) => formatCurrency(Number(value) || 0),
      },
      {
        key: 'stock',
        header: 'Estoque',
        align: 'right',
        width: 80,
        type: 'number',
        totalizable: true,
        formatter: (value) => String(Number(value) || 0),
      },
      { key: 'minStock', header: 'Estoque Mín.', align: 'right', width: 80, type: 'number' },
      {
        key: 'isActive',
        header: 'Status',
        width: 70,
        formatter: (value) => (value ? 'Ativo' : 'Inativo'),
      },
    ],
    [categoryMap]
  );

  // Summary para exportação profissional
  const exportSummary: ExportSummaryItem[] = useMemo(() => {
    const activeCount = products.filter((p) => p.isActive).length;
    const uniqueCategories = new Set(products.map((p) => p.categoryId).filter(Boolean)).size;
    const totalStockValue = products.reduce(
      (sum, p) => sum + (p.salePrice || 0) * (p.stock || 0),
      0
    );
    return [
      { label: 'Total Produtos', value: String(products.length), icon: '📦', color: '#3b82f6' },
      { label: 'Ativos', value: String(activeCount), icon: '✅', color: '#10b981' },
      { label: 'Categorias', value: String(uniqueCategories), icon: '🏷️', color: '#8b5cf6' },
      {
        label: 'Valor em Estoque',
        value: formatCurrency(totalStockValue),
        icon: '💰',
        color: '#f59e0b',
      },
    ];
  }, [products]);

  const handleDeactivate = async () => {
    if (!productToDeactivate) return;

    try {
      await deactivateProduct.mutateAsync(productToDeactivate.id);
      toast({
        title: 'Produto desativado',
        description: `${productToDeactivate.name} foi desativado com sucesso.`,
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar o produto.',
        variant: 'destructive',
      });
    } finally {
      setProductToDeactivate(null);
    }
  };

  const handleReactivate = async (product: Product) => {
    try {
      await reactivateProduct.mutateAsync(product.id);
      toast({
        title: 'Produto reativado',
        description: `${product.name} foi reativado com sucesso.`,
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível reativar o produto.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await createProduct.mutateAsync({
        name: `${product.name} (Cópia)`,
        barcode: undefined, // Não duplicar código de barras
        categoryId: product.categoryId,
        unit: product.unit,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        minStock: product.minStock,
        isWeighted: product.isWeighted,
      });
      toast({
        title: 'Produto duplicado',
        description: `Cópia de ${product.name} criada com sucesso.`,
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível duplicar o produto.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      toast({
        title: 'Produto excluído',
        description: `${productToDelete.name} foi excluído permanentemente.`,
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o produto.',
        variant: 'destructive',
      });
    } finally {
      setProductToDelete(null);
    }
  };

  const handleEdit = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            data={products}
            columns={exportColumns}
            filename="produtos"
            title="Catálogo de Produtos"
            variant="dropdown"
            disabled={isLoading || products.length === 0}
            summary={exportSummary}
            showTotals={true}
            primaryColor="#10b981"
          />
          <Button variant="outline" asChild data-tutorial="categories-link">
            <Link to="/products/categories">Categorias</Link>
          </Button>
          <Button asChild data-tutorial="new-product-button">
            <Link to="/products/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Novo Produto</span>
              <span
                className="kbd ml-2 text-[10px] bg-primary-foreground/20 border-primary-foreground/30"
                aria-hidden="true"
              >
                F2
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card
        className="border-none bg-card/50 backdrop-blur-sm shadow-md"
        data-tutorial="products-filters"
        role="search"
        aria-label="Filtros de produtos"
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nome, código ou código de barras... (F3)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-tutorial="products-search"
                aria-label="Buscar produto por nome, código ou código de barras"
              />
            </div>

            {/* Filtro de Categoria */}
            <Select
              value={categoryId || 'all'}
              onValueChange={(v) => {
                setCategoryId(v === 'all' ? undefined : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]" aria-label="Filtrar por categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" aria-hidden="true" />
            Lista de Produtos
            <Badge variant="secondary" aria-label={`Total: ${totalItems} produtos`}>
              {totalItems}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent data-tutorial="products-table">
          <div className="space-y-4">
            <Table aria-label="Lista de produtos">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Máx.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center" role="status">
                      Carregando produtos...
                    </TableCell>
                  </TableRow>
                ) : products?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                      role="status"
                    >
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  products?.map((product) => {
                    const categoryName = categoryMap.get(product.categoryId) || 'Sem Categoria';
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-mono text-sm">{product.internalCode}</div>
                          {product.barcode && (
                            <div className="text-xs text-muted-foreground">{product.barcode}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{categoryName}</TableCell>
                        <TableCell className="text-right text-money">
                          {formatCurrency(product.salePrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              product.currentStock <= 0 && 'text-destructive font-medium',
                              product.currentStock > 0 &&
                                product.currentStock <= product.minStock &&
                                'text-warning font-medium',
                              product.maxStock &&
                                product.currentStock > product.maxStock &&
                                'text-blue-500 font-medium'
                            )}
                          >
                            {product.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {product.maxStock || '-'}
                        </TableCell>
                        <TableCell>
                          {product.isActive ? (
                            <Badge variant="success">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                data-testid={`product-menu-${product.id}`}
                                data-tutorial="product-edit"
                                aria-label={`Ações para ${product.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {product.isActive ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setProductToDeactivate(product)}
                                  data-tutorial="product-status"
                                >
                                  <PowerOff className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Desativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-success"
                                  onClick={() => handleReactivate(product)}
                                  data-tutorial="product-status"
                                >
                                  <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Reativar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setProductToDelete(product)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Paginação UI */}
            <nav
              className="flex items-center justify-between border-t pt-4"
              role="navigation"
              aria-label="Paginação de produtos"
            >
              <div className="text-sm text-muted-foreground" aria-live="polite">
                Página {page} de {totalPages} • Total: {totalItems} itens
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  aria-label="Página anterior"
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1" role="group" aria-label="Páginas">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 5 && page > 3) {
                      p = page - 2 + i;
                    }
                    if (p > totalPages) return null;
                    if (p < 1) return null;

                    return (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'ghost'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(p)}
                        aria-label={`Página ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                  aria-label="Próxima página"
                >
                  Próxima
                </Button>
              </div>
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs mantidos igual */}
      <Dialog open={!!productToDeactivate} onOpenChange={() => setProductToDeactivate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar produto?</DialogTitle>
            <DialogDescription>
              O produto <strong>{productToDeactivate?.name}</strong> será desativado e não aparecerá
              mais na busca do PDV. Você poderá reativá-lo a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDeactivate(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              <PowerOff className="mr-2 h-4 w-4" aria-hidden="true" />
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto permanentemente?</DialogTitle>
            <DialogDescription>
              O produto <strong>{productToDelete?.name}</strong> será excluído permanentemente. Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
