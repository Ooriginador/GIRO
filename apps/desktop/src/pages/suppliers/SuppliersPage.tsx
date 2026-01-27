/**
 * @file SuppliersPage - Gestão de fornecedores
 * @description Lista e gerenciamento de fornecedores com validação completa
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  DropdownMenuSeparator,
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
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useCreateSupplier,
  useDeactivateSupplier,
  useInactiveSuppliers,
  useReactivateSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '@/hooks/useSuppliers';
import { formatCNPJ, formatPhone } from '@/lib/formatters';
import { validateCNPJ } from '@/lib/validators';
import type { Supplier } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Edit,
  FileText,
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
import { useState, useMemo, useEffect, useCallback, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { ExportButtons } from '@/components/shared';
import { type ExportColumn, type ExportSummaryItem, exportFormatters } from '@/lib/export';

// Schema de validação com Zod - com validação real de CNPJ
const supplierFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  tradeName: z.string().max(100, 'Nome fantasia muito longo').optional(),
  cnpj: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.replace(/\D/g, '').length === 0) return true; // Vazio é ok
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length !== 14) return false;
        return validateCNPJ(cleaned);
      },
      { message: 'CNPJ inválido - verifique os dígitos' }
    ),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.replace(/\D/g, '').length === 0) return true;
        const cleaned = val.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
      },
      { message: 'Telefone deve ter 10 ou 11 dígitos' }
    ),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().max(200, 'Endereço muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z
    .string()
    .max(2, 'Use a sigla do estado (ex: SP)')
    .regex(/^[A-Z]{0,2}$/, 'Use sigla maiúscula (ex: SP)')
    .optional(),
  notes: z.string().max(500, 'Observações muito longas').optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

type StatusFilter = 'active' | 'inactive' | 'all';

// Funções de formatação de input
function handleCnpjInput(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8)
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12)
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(
      8
    )}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(
    8,
    12
  )}-${cleaned.slice(12)}`;
}

function handlePhoneInput(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10)
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER CARD COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface SupplierCardProps {
  supplier: Supplier;
  onEdit: (supplier: Supplier) => void;
  onDeactivate: (supplier: Supplier) => void;
  onReactivate: (supplier: Supplier) => void;
}

const SupplierCard: FC<SupplierCardProps> = ({ supplier, onEdit, onDeactivate, onReactivate }) => {
  // Monta a localização (cidade - estado)
  const location = [supplier.city, supplier.state].filter(Boolean).join(' - ');

  return (
    <Card
      className={cn(
        'border-none bg-card/50 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow',
        !supplier.isActive && 'opacity-60'
      )}
    >
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
          {supplier.notes && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FileText className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[300px]">
                  <p className="text-sm">{supplier.notes}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
              <DropdownMenuSeparator />
              {supplier.isActive ? (
                <DropdownMenuItem
                  onClick={() => onDeactivate(supplier)}
                  className="text-destructive focus:text-destructive"
                >
                  <Power className="mr-2 h-4 w-4" />
                  Desativar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onReactivate(supplier)}
                  className="text-green-600 focus:text-green-600"
                >
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
              <Building2 className="h-4 w-4 shrink-0" />
              <span>{formatCNPJ(supplier.cnpj)}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{formatPhone(supplier.phone)}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{supplier.email}</span>
            </div>
          )}
          {(supplier.address || location) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {[supplier.address, location].filter(Boolean).join(' • ')}
              </span>
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
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deactivateSupplierMutation = useDeactivateSupplier();
  const reactivateSupplierMutation = useReactivateSupplier();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Estado para confirmação de ações
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'reactivate';
    supplier: Supplier;
  } | null>(null);

  // Combine suppliers based on filter
  const allSuppliers = [...activeSuppliers, ...inactiveSuppliers];
  const suppliers =
    statusFilter === 'active'
      ? activeSuppliers
      : statusFilter === 'inactive'
      ? inactiveSuppliers
      : allSuppliers;
  const isLoading = loadingActive || loadingInactive;

  // Colunas para exportação (incluindo novos campos)
  const exportColumns: ExportColumn<Supplier>[] = [
    { key: 'name', header: 'Razão Social', width: 200 },
    { key: 'tradeName', header: 'Nome Fantasia', width: 150 },
    { key: 'cnpj', header: 'CNPJ', width: 140 },
    { key: 'phone', header: 'Telefone', width: 120 },
    { key: 'email', header: 'E-mail', width: 180 },
    { key: 'address', header: 'Endereço', width: 200 },
    { key: 'city', header: 'Cidade', width: 120 },
    { key: 'state', header: 'UF', width: 40 },
    { key: 'notes', header: 'Observações', width: 200 },
    { key: 'isActive', header: 'Status', width: 70, formatter: exportFormatters.activeInactive },
  ];

  // Filtrar suppliers primeiro (incluindo cidade)
  const filteredSuppliers = suppliers.filter((sup) => {
    if (!search.trim()) return true; // Se busca vazia, mostrar todos
    const searchLower = search.toLowerCase();
    const searchDigits = search.replace(/\D/g, '');

    return (
      sup.name.toLowerCase().includes(searchLower) ||
      sup.tradeName?.toLowerCase().includes(searchLower) ||
      (searchDigits.length > 0 && sup.cnpj?.replace(/\D/g, '').includes(searchDigits)) ||
      sup.city?.toLowerCase().includes(searchLower)
    );
  });

  // Summary para exportação profissional
  const exportSummary: ExportSummaryItem[] = useMemo(() => {
    const activeCount = filteredSuppliers.filter((s) => s.isActive).length;
    const withCnpj = filteredSuppliers.filter((s) => s.cnpj).length;
    const uniqueCities = new Set(filteredSuppliers.map((s) => s.city).filter(Boolean)).size;
    return [
      {
        label: 'Total Fornecedores',
        value: String(filteredSuppliers.length),
        icon: '🚚',
        color: '#3b82f6',
      },
      { label: 'Ativos', value: String(activeCount), icon: '✅', color: '#10b981' },
      { label: 'Com CNPJ', value: String(withCnpj), icon: '🏢', color: '#8b5cf6' },
      { label: 'Cidades', value: String(uniqueCities || '-'), icon: '📍', color: '#f59e0b' },
    ];
  }, [filteredSuppliers]);

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
      city: '',
      state: '',
      notes: '',
    },
  });

  const onSubmit = async (data: SupplierFormData) => {
    try {
      // Limpa formatação do CNPJ e telefone antes de salvar
      const cleanedData = {
        name: data.name,
        tradeName: data.tradeName || undefined,
        cnpj: data.cnpj?.replace(/\D/g, '') || undefined,
        phone: data.phone?.replace(/\D/g, '') || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state?.toUpperCase() || undefined,
        notes: data.notes || undefined,
      };

      if (editingSupplier) {
        await updateSupplierMutation.mutateAsync({
          id: editingSupplier.id,
          data: cleanedData,
        });
      } else {
        await createSupplierMutation.mutateAsync({
          ...cleanedData,
          isActive: true,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      // Toast é tratado pelo hook
    }
  };

  const handleOpenDialog = useCallback(
    (supplier?: Supplier) => {
      if (supplier) {
        setEditingSupplier(supplier);
        form.reset({
          name: supplier.name,
          tradeName: supplier.tradeName ?? '',
          cnpj: supplier.cnpj ? formatCNPJ(supplier.cnpj) : '',
          phone: supplier.phone ? formatPhone(supplier.phone) : '',
          email: supplier.email ?? '',
          address: supplier.address ?? '',
          city: supplier.city ?? '',
          state: supplier.state ?? '',
          notes: supplier.notes ?? '',
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
          city: '',
          state: '',
          notes: '',
        });
      }
      setIsDialogOpen(true);
    },
    [form]
  );

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    form.reset();
  };

  const handleDeactivate = (supplier: Supplier) => {
    setConfirmAction({ type: 'deactivate', supplier });
  };

  const handleReactivate = (supplier: Supplier) => {
    setConfirmAction({ type: 'reactivate', supplier });
  };

  const confirmActionHandler = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'deactivate') {
      deactivateSupplierMutation.mutate(confirmAction.supplier.id);
    } else {
      reactivateSupplierMutation.mutate(confirmAction.supplier.id);
    }
    setConfirmAction(null);
  };

  // Atalho de teclado: Ctrl+N para novo fornecedor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isDialogOpen) {
        e.preventDefault();
        handleOpenDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDialogOpen, handleOpenDialog]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores e parceiros</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            data={filteredSuppliers}
            columns={exportColumns}
            filename="fornecedores"
            title="Cadastro de Fornecedores"
            variant="dropdown"
            summary={exportSummary}
            primaryColor="#8b5cf6"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </DialogTitle>
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
                          <Input
                            placeholder="00.000.000/0000-00"
                            {...field}
                            onChange={(e) => field.onChange(handleCnpjInput(e.target.value))}
                          />
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
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              onChange={(e) => field.onChange(handlePhoneInput(e.target.value))}
                            />
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
                          <Input placeholder="Rua, número, bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SP"
                              maxLength={2}
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informações adicionais sobre o fornecedor..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
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
                      disabled={
                        createSupplierMutation.isPending || updateSupplierMutation.isPending
                      }
                    >
                      {(createSupplierMutation.isPending || updateSupplierMutation.isPending) && (
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
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, fantasia, CNPJ ou cidade..."
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

      {/* Dialog de Confirmação para Desativar/Reativar */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'deactivate'
                ? 'Desativar fornecedor?'
                : 'Reativar fornecedor?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'deactivate' ? (
                <>
                  O fornecedor <strong>{confirmAction?.supplier.name}</strong> será desativado e não
                  aparecerá mais nas listagens padrão. Você poderá reativá-lo posteriormente.
                </>
              ) : (
                <>
                  O fornecedor <strong>{confirmAction?.supplier.name}</strong> será reativado e
                  voltará a aparecer nas listagens.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActionHandler}
              className={
                confirmAction?.type === 'deactivate'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }
            >
              {confirmAction?.type === 'deactivate' ? 'Desativar' : 'Reativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
