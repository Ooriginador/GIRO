/**
 * @file EmployeesPage - Gestão de funcionários
 * @description Lista e gerenciamento de funcionários/operadores
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateEmployee,
  useDeactivateEmployee,
  useEmployees,
  useInactiveEmployees,
  useReactivateEmployee,
  useUpdateEmployee,
} from '@/hooks/useEmployees';
import { type Employee, type EmployeeRole } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Mail, MoreHorizontal, Phone, Plus, Power, Search, Shield, User } from 'lucide-react';
import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema de validação com Zod
const employeeFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'VIEWER'] as const),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

const roleLabels: Record<EmployeeRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  CASHIER: 'Operador de Caixa',
  VIEWER: 'Visualizador',
};

const roleColors: Record<EmployeeRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CASHIER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  VIEWER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

type StatusFilter = 'active' | 'inactive' | 'all';

export const EmployeesPage: FC = () => {
  const { data: activeEmployees = [], isLoading: loadingActive } = useEmployees();
  const { data: inactiveEmployees = [], isLoading: loadingInactive } = useInactiveEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deactivateEmployee = useDeactivateEmployee();
  const reactivateEmployee = useReactivateEmployee();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Combine employees based on filter
  const allEmployees = [...activeEmployees, ...inactiveEmployees];
  const employees =
    statusFilter === 'active'
      ? activeEmployees
      : statusFilter === 'inactive'
      ? inactiveEmployees
      : allEmployees;
  const isLoading = loadingActive || loadingInactive;

  // React Hook Form com Zod resolver
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'CASHIER',
    },
  });

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(search.toLowerCase()))
  );

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          data: {
            name: data.name,
            email: data.email || undefined,
            phone: data.phone || undefined,
            role: data.role,
          },
        });
        toast({ title: 'Funcionário atualizado com sucesso' });
      } else {
        // Gera PIN aleatório de 4 dígitos
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        await createEmployee.mutateAsync({
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          role: data.role,
          isActive: true,
          pin: randomPin,
        });
        toast({
          title: 'Funcionário criado com sucesso',
          description: `PIN gerado: ${randomPin}`,
          duration: 10000, // 10 segundos para dar tempo de anotar
        });
      }
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar funcionário', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    form.reset({
      name: '',
      email: '',
      phone: '',
      role: 'CASHIER',
    });
    setEditingEmployee(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role,
    });
    setIsDialogOpen(true);
  };

  const toggleActive = async (employee: Employee) => {
    try {
      if (employee.isActive) {
        await deactivateEmployee.mutateAsync(employee.id);
        toast({ title: 'Funcionário desativado' });
      } else {
        await reactivateEmployee.mutateAsync(employee.id);
        toast({ title: 'Funcionário reativado' });
      }
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  // Soft delete: marca como inativo em vez de excluir definitivamente
  const handleSoftDelete = async (employee: Employee) => {
    const confirmMessage = employee.isActive
      ? `Deseja desativar "${employee.name}"?\n\nO funcionário será marcado como inativo e não poderá mais acessar o sistema, mas seu histórico será preservado.`
      : `Deseja reativar "${employee.name}"?`;

    if (confirm(confirmMessage)) {
      try {
        if (employee.isActive) {
          await deactivateEmployee.mutateAsync(employee.id);
        } else {
          await reactivateEmployee.mutateAsync(employee.id);
        }
        toast({
          title: employee.isActive ? 'Funcionário desativado' : 'Funcionário reativado',
          description: employee.isActive
            ? 'O funcionário foi marcado como inativo. O histórico foi preservado.'
            : 'O funcionário foi reativado e pode acessar o sistema novamente.',
        });
      } catch {
        toast({ title: 'Erro ao atualizar funcionário', variant: 'destructive' });
      }
    }
  };

  if (isLoading) {
    return <div>Carregando funcionários...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground">Gerencie os operadores e permissões do sistema</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingEmployee(null);
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                </DialogTitle>
                <DialogDescription>
                  {editingEmployee
                    ? 'Atualize as informações do funcionário'
                    : 'Cadastre um novo funcionário no sistema'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: João Silva" {...field} />
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
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Opcional. Usado para contato e recuperação de senha.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo/Permissão *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ADMIN">Administrador</SelectItem>
                            <SelectItem value="MANAGER">Gerente</SelectItem>
                            <SelectItem value="CASHIER">Operador de Caixa</SelectItem>
                            <SelectItem value="VIEWER">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Define as permissões de acesso no sistema.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      data-testid="submit-employee"
                    >
                      {editingEmployee ? 'Salvar' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="pl-10"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => (
          <Card
            key={employee.id}
            className={`relative overflow-hidden ${!employee.isActive ? 'opacity-60' : ''}`}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{employee.name}</CardTitle>
                  <Badge className={`mt-1 ${roleColors[employee.role]}`}>
                    {roleLabels[employee.role]}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    data-testid={`employee-actions-${employee.id}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleEdit(employee)}
                    data-testid="edit-employee"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => toggleActive(employee)}
                    data-testid="toggle-active"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {employee.isActive ? 'Desativar' : 'Ativar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleSoftDelete(employee)}
                    data-testid="soft-delete"
                  >
                    <Power className="mr-2 h-4 w-4" />
                    {employee.isActive ? 'Desativar' : 'Reativar'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{employee.email || '-'}</span>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{employee.phone}</span>
                  </div>
                )}
              </div>
              {!employee.isActive && (
                <Badge variant="secondary" className="mt-3">
                  Inativo
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">Nenhum funcionário encontrado</p>
          <p className="text-muted-foreground">
            {search ? 'Tente uma busca diferente' : 'Comece cadastrando um funcionário'}
          </p>
        </div>
      )}
    </div>
  );
};
