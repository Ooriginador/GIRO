/**
 * @file SuppliersPage - Gestão de fornecedores
 * @description Lista e gerenciamento de fornecedores
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  useCreateSupplier,
  useDeactivateSupplier,
  useInactiveSuppliers,
  useReactivateSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '@/hooks/useSuppliers';
import type { Supplier } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Edit,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Power,
  Search,
  Truck,
} from 'lucide-react';
import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema de validação com Zod
const supplierFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  tradeName: z.string().optional(),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^$/, 'CNPJ inválido')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

type StatusFilter = 'active' | 'inactive' | 'all';

// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER CARD COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface SupplierCardProps {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}

const SupplierCard: FC<SupplierCardProps> = ({ supplier, onEdit, onDeactivate, onReactivate }) => {
  return (
    <Card className={!supplier.isActive ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{supplier.name}</CardTitle>
            {supplier.tradeName && (
              <p className="text-sm text-muted-foreground">{supplier.tradeName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
            {supplier.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(supplier)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {supplier.isActive ? (
                <DropdownMenuItem
                  onClick={() => onDeactivate(supplier.id)}
                  className="text-destructive"
                >
                  <Power className="mr-2 h-4 w-4" />
                  Desativar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onReactivate(supplier.id)}>
                  <Power className="mr-2 h-4 w-4" />
                  Reativar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          {supplier.cnpj && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{supplier.cnpj}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{supplier.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const SuppliersPage: FC = () => {
  const { data: activeSuppliers = [], isLoading: loadingActive } = useSuppliers();
  const { data: inactiveSuppliers = [], isLoading: loadingInactive } = useInactiveSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deactivateSupplier = useDeactivateSupplier();
  const reactivateSupplier = useReactivateSupplier();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Combine suppliers based on filter
  const allSuppliers = [...activeSuppliers, ...inactiveSuppliers];
  const suppliers =
    statusFilter === 'active'
      ? activeSuppliers
      : statusFilter === 'inactive'
      ? inactiveSuppliers
      : allSuppliers;
  const isLoading = loadingActive || loadingInactive;

  // React Hook Form com Zod resolver
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      tradeName: '',
      cnpj: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  const filteredSuppliers = suppliers.filter(
    (sup) =>
      sup.name.toLowerCase().includes(search.toLowerCase()) ||
      (sup.tradeName && sup.tradeName.toLowerCase().includes(search.toLowerCase())) ||
      (sup.cnpj && sup.cnpj.includes(search))
  );

  const onSubmit = async (data: SupplierFormData) => {
    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({
          id: editingSupplier.id,
          data: {
            name: data.name,
            tradeName: data.tradeName || undefined,
            cnpj: data.cnpj || undefined,
            phone: data.phone || undefined,
            email: data.email || undefined,
            address: data.address || undefined,
          },
        });
      } else {
        await createSupplier.mutateAsync({
          name: data.name,
          tradeName: data.tradeName || undefined,
          cnpj: data.cnpj || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          isActive: true,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      // Toast é tratado pelo hook
    }
  };

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      form.reset({
        name: supplier.name,
        tradeName: supplier.tradeName ?? '',
        cnpj: supplier.cnpj ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
      });
    } else {
      setEditingSupplier(null);
      form.reset({
        name: '',
        tradeName: '',
        cnpj: '',
        phone: '',
        email: '',
        address: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    form.reset();
  };

  const handleDeactivate = (id: string) => {
    deactivateSupplier.mutate(id);
  };

  const handleReactivate = (id: string) => {
    reactivateSupplier.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores e parceiros</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
              <DialogDescription>
                {editingSupplier
                  ? 'Atualize os dados do fornecedor'
                  : 'Preencha os dados para cadastrar um novo fornecedor'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome comercial" {...field} />
                      </FormControl>
                      <FormDescription>Nome pelo qual a empresa é conhecida</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input placeholder="contato@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, bairro, cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSupplier.isPending || updateSupplier.isPending}
                  >
                    {(createSupplier.isPending || updateSupplier.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingSupplier ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, nome fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Ativos ({activeSuppliers.length})
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
          >
            Inativos ({inactiveSuppliers.length})
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            Todos ({allSuppliers.length})
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredSuppliers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum fornecedor encontrado</h3>
          <p className="mt-2 text-muted-foreground">
            {search
              ? 'Nenhum fornecedor corresponde à sua busca'
              : 'Comece cadastrando seu primeiro fornecedor'}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Fornecedor
            </Button>
          )}
        </div>
      )}

      {/* Suppliers Grid */}
      {!isLoading && filteredSuppliers.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onEdit={handleOpenDialog}
              onDeactivate={handleDeactivate}
              onReactivate={handleReactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
