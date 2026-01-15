/**
 * @file CategoriesPage - Gerenciamento de categorias
 * @description Listagem e edição de categorias de produtos
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CATEGORY_COLORS,
  useAllCategories,
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useInactiveCategories,
  useReactivateCategory,
} from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import { ArrowLeft, Edit, FolderTree, Plus, Power, PowerOff } from 'lucide-react';
import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

type StatusFilter = 'active' | 'inactive' | 'all';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const CategoriesPage: FC = () => {
  const navigate = useNavigate();

  // Status filter
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Queries based on filter
  const { data: activeCategories = [], isLoading: loadingActive } = useCategories();
  const { data: inactiveCategories = [], isLoading: loadingInactive } = useInactiveCategories();
  const { data: allCategories = [], isLoading: loadingAll } = useAllCategories();

  // Get categories based on filter
  const categories =
    statusFilter === 'active'
      ? activeCategories
      : statusFilter === 'inactive'
      ? inactiveCategories
      : allCategories;
  const isLoading =
    statusFilter === 'active'
      ? loadingActive
      : statusFilter === 'inactive'
      ? loadingInactive
      : loadingAll;

  // Mutations
  const createCategory = useCreateCategory();
  const deactivateCategory = useDeactivateCategory();
  const reactivateCategory = useReactivateCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]!.value);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'deactivate' | 'reactivate';
    categoryId: string;
    categoryName: string;
  }>({ open: false, type: 'deactivate', categoryId: '', categoryName: '' });

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createCategory.mutateAsync({
        name: newCategoryName,
        color: selectedColor,
      });

      setNewCategoryName('');
      setSelectedColor(CATEGORY_COLORS[0]!.value);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      // O erro é tratado pelo toast no hook, mas capturamos aqui para evitar unhandled rejection
    }
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmDialog.type === 'deactivate') {
        await deactivateCategory.mutateAsync(confirmDialog.categoryId);
      } else {
        await reactivateCategory.mutateAsync(confirmDialog.categoryId);
      }
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error) {
      console.error('Erro ao processar ação na categoria:', error);
      // Capturamos para evitar unhandled rejection, o toast já é exibido pelo hook
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-button">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Organize seus produtos em categorias</p>
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Categoria</DialogTitle>
              <DialogDescription>
                Crie uma nova categoria para organizar seus produtos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  placeholder="Ex: Bebidas"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn(
                        'h-8 w-8 rounded-full transition-transform hover:scale-110',
                        selectedColor === color.value && 'ring-2 ring-ring ring-offset-2'
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setSelectedColor(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!newCategoryName.trim()}>
                Criar Categoria
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Categorias */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-20 rounded bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full">
            <Card className="flex flex-col items-center justify-center py-12">
              <FolderTree className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Nenhuma categoria</h3>
              <p className="text-sm text-muted-foreground">
                Crie sua primeira categoria para organizar os produtos
              </p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Categoria
              </Button>
            </Card>
          </div>
        ) : (
          categories.map((category) => (
            <Card
              key={category.id}
              className={cn('group relative', !category.isActive && 'opacity-60')}
            >
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-lg"
                style={{ backgroundColor: category.color || '#6b7280' }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color || '#6b7280' }}
                    />
                    {category.name}
                    {!category.isActive && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Inativa
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {category.isActive ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            type: 'deactivate',
                            categoryId: category.id,
                            categoryName: category.name,
                          })
                        }
                      >
                        <PowerOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-green-600"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            type: 'reactivate',
                            categoryId: category.id,
                            categoryName: category.name,
                          })
                        }
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{category.productCount ?? 0} produtos</Badge>
                {category.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'deactivate' ? 'Desativar Categoria' : 'Reativar Categoria'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'deactivate'
                ? `Tem certeza que deseja desativar a categoria "${confirmDialog.categoryName}"? Os produtos desta categoria não serão afetados.`
                : `Tem certeza que deseja reativar a categoria "${confirmDialog.categoryName}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.type === 'deactivate' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
            >
              {confirmDialog.type === 'deactivate' ? 'Desativar' : 'Reativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
