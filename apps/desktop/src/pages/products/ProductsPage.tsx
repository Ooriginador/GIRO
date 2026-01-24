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
import { Link, useNavigate } from 'react-router-dom';
import { useKeyboard } from '@/hooks/use-keyboard';
import { useCategories } from '@/hooks/useCategories';

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

  const products = paginatedResult?.data || [];
  const totalPages = paginatedResult?.totalPages || 1;
  const totalItems = paginatedResult?.total || 0;

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
          <Button variant="outline" asChild data-tutorial="categories-link">
            <Link to="/products/categories">Categorias</Link>
          </Button>
          <Button asChild data-tutorial="new-product-button">
            <Link to="/products/new">
              <Plus className="mr-2 h-4 w-4" />
              <span>Novo Produto</span>
              <span className="kbd ml-2 text-[10px] bg-primary-foreground/20 border-primary-foreground/30">
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
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nome, código ou código de barras... (F3)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-tutorial="products-search"
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
              <SelectTrigger className="w-[200px]">
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
              <SelectTrigger className="w-40">
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
            <Package className="h-5 w-5" />
            Lista de Produtos
            <Badge variant="secondary">{totalItems}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent data-tutorial="products-table">
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Máx.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Carregando produtos...
                    </TableCell>
                  </TableRow>
                ) : products?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
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
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {product.isActive ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setProductToDeactivate(product)}
                                  data-tutorial="product-status"
                                >
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Desativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-success"
                                  onClick={() => handleReactivate(product)}
                                  data-tutorial="product-status"
                                >
                                  <Power className="mr-2 h-4 w-4" />
                                  Reativar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setProductToDelete(product)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
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
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Página {page} de {totalPages} • Total: {totalItems} itens
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
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
                >
                  Próxima
                </Button>
              </div>
            </div>
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
              <PowerOff className="mr-2 h-4 w-4" />
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
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
