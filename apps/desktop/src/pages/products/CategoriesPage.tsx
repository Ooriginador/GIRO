/**
 * @file CategoriesPage - Gerenciamento de categorias
 * @description Listagem, busca e edição completa de categorias de produtos
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAllCategories,
  useBatchDeactivateCategories,
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useDeleteCategory,
  useInactiveCategories,
  useReactivateCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import {
  ArrowLeft,
  CheckSquare,
  ChevronRight,
  Edit2,
  FolderTree,
  MoreVertical,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryForm } from './components/CategoryForm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StatusFilter = 'active' | 'inactive' | 'all';

export const CategoriesPage: FC = () => {
  const navigate = useNavigate();

  // Estados de UI
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Multi-select mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Queries
  const { data: activeCategories = [], isLoading: loadingActive } = useCategories();
  const { data: inactiveCategories = [], isLoading: loadingInactive } = useInactiveCategories();
  const { data: allCategories = [], isLoading: loadingAll } = useAllCategories();

  // Mutations
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deactivateCategory = useDeactivateCategory();
  const reactivateCategory = useReactivateCategory();
  const deleteCategory = useDeleteCategory();
  const batchDeactivate = useBatchDeactivateCategories();

  // Filtragem local
  const filteredCategories = useMemo(() => {
    const list =
      statusFilter === 'active'
        ? activeCategories
        : statusFilter === 'inactive'
        ? inactiveCategories
        : allCategories;

    return list.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase()));
  }, [statusFilter, search, activeCategories, inactiveCategories, allCategories]);

  // Build parent name map for hierarchy display
  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [allCategories]);

  const isLoading = loadingActive || loadingInactive || loadingAll;

  // Handlers
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (data: {
    name: string;
    description?: string;
    color: string;
    parentId?: string | null;
  }) => {
    // Convert null to undefined for mutation compatibility
    const mutationData = {
      ...data,
      parentId: data.parentId ?? undefined,
    };

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data: mutationData });
      } else {
        await createCategory.mutateAsync(mutationData);
      }
      setIsFormOpen(false);
    } catch {
      // Erro tratado pelo hook/toast
    }
  };

  const toggleStatus = async (category: Category) => {
    if (category.isActive) {
      await deactivateCategory.mutateAsync(category.id);
    } else {
      await reactivateCategory.mutateAsync(category.id);
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir permanentemente a categoria "${category.name}"?`
      )
    ) {
      await deleteCategory.mutateAsync(category.id);
    }
  };

  // Multi-select handlers
  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredCategories.filter((c) => c.isActive).map((c) => c.id)));
  }, [filteredCategories]);

  const handleBatchDeactivate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await batchDeactivate.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  }, [selectedIds, batchDeactivate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelectMode) return;

      if (e.key === 'Escape') {
        toggleSelectMode();
      } else if (e.key === 'Delete' && selectedIds.size > 0) {
        handleBatchDeactivate();
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode, selectedIds, toggleSelectMode, handleBatchDeactivate, selectAll]);

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Selection Toolbar */}
      {isSelectMode && (
        <div
          className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20 animate-in slide-in-from-top-2"
          role="region"
          aria-label="Barra de seleção múltipla"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-medium">
              {selectedIds.size} categoria{selectedIds.size !== 1 ? 's' : ''} selecionada
              {selectedIds.size !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar todas
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDeactivate}
              disabled={selectedIds.size === 0 || batchDeactivate.isPending}
              aria-label={`Desativar ${selectedIds.size} categorias selecionadas`}
            >
              <PowerOff className="h-4 w-4 mr-2" aria-hidden="true" />
              Desativar selecionadas
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSelectMode}
              aria-label="Sair do modo seleção"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
            aria-label="Voltar para página anterior"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <FolderTree className="h-4 w-4" aria-hidden="true" />
              Organize seus produtos em grupos lógicos
            </p>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="search"
          aria-label="Filtros de categorias"
        >
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Buscar categoria..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar categoria por nome"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger
              className="w-36"
              aria-label="Filtrar por status"
              data-testid="status-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleSelectMode}
            aria-label={isSelectMode ? 'Sair do modo seleção' : 'Entrar no modo seleção múltipla'}
            aria-pressed={isSelectMode}
          >
            <CheckSquare
              className={cn('h-4 w-4', isSelectMode && 'text-primary')}
              aria-hidden="true"
            />
          </Button>

          <Button onClick={handleOpenCreate} className="shadow-md">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="status"
          aria-label="Carregando categorias"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" aria-hidden="true" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card
          className="flex flex-col items-center justify-center py-24 text-center border-dashed"
          role="status"
        >
          <div
            className="p-4 rounded-full bg-muted mb-4 text-muted-foreground/50"
            aria-hidden="true"
          >
            <FolderTree className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-semibold">Nenhuma categoria encontrada</h3>
          <p className="text-muted-foreground max-w-sm px-4">
            {search
              ? `Não encontramos resultados para "${search}" com o filtro atual.`
              : 'Comece criando uma categoria para organizar seu catálogo.'}
          </p>
          {search && (
            <Button variant="link" onClick={() => setSearch('')}>
              Limpar busca
            </Button>
          )}
          {!search && (
            <Button className="mt-6" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nova Categoria
            </Button>
          )}
        </Card>
      ) : (
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
          aria-label={`${filteredCategories.length} categorias encontradas`}
        >
          {filteredCategories.map((category) => (
            <Card
              key={category.id}
              onClick={() => isSelectMode && category.isActive && toggleSelection(category.id)}
              onKeyDown={(e) => {
                if (isSelectMode && category.isActive && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  toggleSelection(category.id);
                }
              }}
              tabIndex={isSelectMode && category.isActive ? 0 : undefined}
              role="listitem"
              aria-label={`Categoria ${category.name}${
                category.parentId ? `, subcategoria de ${parentNameMap.get(category.parentId)}` : ''
              }, ${category.productCount ?? 0} produtos${!category.isActive ? ', inativa' : ''}${
                selectedIds.has(category.id) ? ', selecionada' : ''
              }`}
              className={cn(
                'group relative border-l-[6px] transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                !category.isActive && 'opacity-60 grayscale-[0.5] cursor-default',
                isSelectMode && selectedIds.has(category.id) && 'ring-2 ring-primary ring-offset-2'
              )}
              style={{ borderLeftColor: category.color || '#64748b' }}
            >
              {/* Selection indicator */}
              {isSelectMode && category.isActive && (
                <div className="absolute top-3 left-3 z-10" aria-hidden="true">
                  <div
                    className={cn(
                      'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
                      selectedIds.has(category.id)
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-background border-muted-foreground/40'
                    )}
                  >
                    {selectedIds.has(category.id) && <CheckSquare className="h-3 w-3" />}
                  </div>
                </div>
              )}
              <CardHeader
                className={cn(
                  'pb-3 flex flex-row items-center justify-between space-y-0',
                  isSelectMode && 'pl-10'
                )}
              >
                <CardTitle className="text-lg font-bold truncate leading-tight pr-8">
                  {category.name}
                  {category.parentId && (
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center mt-0.5">
                      <ChevronRight className="h-2 w-2 mr-0.5" aria-hidden="true" />
                      {parentNameMap.get(category.parentId) || 'Sub-categoria'}
                    </div>
                  )}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 absolute right-2 top-4"
                      aria-label={`Ações para categoria ${category.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleOpenEdit(category)}>
                      <Edit2 className="h-4 w-4 mr-2" aria-hidden="true" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleStatus(category)}>
                      {category.isActive ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2 text-destructive" aria-hidden="true" />{' '}
                          Desativar
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" />{' '}
                          Reativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(category)}
                      className="text-destructive focus:bg-destructive/10"
                      disabled={(category.productCount ?? 0) > 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" /> Excluir permanentemente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {category.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {category.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <Badge variant="secondary" className="font-semibold px-2 py-0">
                      {category.productCount ?? 0} produtos
                    </Badge>
                    {!category.isActive && (
                      <Badge
                        variant="outline"
                        className="text-destructive border-destructive/20 bg-destructive/5 uppercase text-[9px]"
                      >
                        Inativa
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Unificado de Form (Criar/Editar) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0">
          <div
            className="h-2 w-full"
            style={{ backgroundColor: editingCategory?.color || '#3b82f6' }}
          />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? 'Atualize as informações visuais e organizacionais da categoria.'
                  : 'Defina o nome, cor e opcionalmente uma hierarquia para a nova categoria.'}
              </DialogDescription>
            </DialogHeader>

            <CategoryForm
              initialData={editingCategory}
              onSubmit={handleSubmitForm}
              onCancel={() => setIsFormOpen(false)}
              isLoading={createCategory.isPending || updateCategory.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
