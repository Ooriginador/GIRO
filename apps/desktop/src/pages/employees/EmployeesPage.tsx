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
import { Label } from '@/components/ui/label';
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
import {
  Edit,
  Mail,
  MoreHorizontal,
  Phone,
  Power,
  Search,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema de validação com Zod
const employeeFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'VIEWER'] as const),
  pin: z
    .string()
    .length(4, 'PIN deve ter 4 dígitos')
    .regex(/^\d+$/, 'Apenas números')
    .optional()
    .or(z.literal('')),
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

  // New state for PIN Reset Dialog
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [employeeToResetPin, setEmployeeToResetPin] = useState<Employee | null>(null);
  const [newPin, setNewPin] = useState('');

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
      pin: '',
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
        // Usa PIN fornecido ou gera aleatório
        const finalPin =
          data.pin && data.pin.length === 4
            ? data.pin
            : Math.floor(1000 + Math.random() * 9000).toString();

        await createEmployee.mutateAsync({
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          role: data.role,
          isActive: true,
          pin: finalPin,
        });
        toast({
          title: 'Funcionário criado com sucesso',
          description: `PIN definido: ${finalPin}`,
          duration: 10000,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar funcionário', variant: 'destructive' });
    }
  };

  const handleResetPin = async () => {
    if (!employeeToResetPin || newPin.length !== 4) return;
    try {
      await updateEmployee.mutateAsync({
        id: employeeToResetPin.id,
        data: { pin: newPin },
      });
      toast({ title: 'PIN alterado com sucesso' });
      setIsPinDialogOpen(false);
      setNewPin('');
      setEmployeeToResetPin(null);
    } catch {
      toast({ title: 'Erro ao alterar PIN', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    form.reset({
      name: '',
      email: '',
      phone: '',
      role: 'CASHIER',
      pin: '',
    });
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role,
      pin: '', // PIN não é editado aqui
    });
    setIsDialogOpen(true);
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
        toast({
          title: 'Erro ao atualizar funcionário',
          variant: 'destructive',
        });
      }
    }
  };

  const openPinDialog = (employee: Employee) => {
    setEmployeeToResetPin(employee);
    setNewPin('');
    setIsPinDialogOpen(true);
  };

  if (isLoading) {
    return <div>Carregando funcionários...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
          <p className="text-muted-foreground">Gerencie quem tem acesso ao sistema</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            <User className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            Nenhum funcionário encontrado.
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{employee.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      data-testid={`employee-actions-${employee.id}`}
                    >
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      data-testid="edit-employee"
                      onClick={() => handleEdit(employee)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid="reset-pin"
                      onClick={() => openPinDialog(employee)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Alterar PIN
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-testid="toggle-active"
                      className={employee.isActive ? 'text-red-600' : 'text-green-600'}
                      onClick={() => handleSoftDelete(employee)}
                    >
                      {employee.isActive ? (
                        <Trash2 data-testid="soft-delete" className="mr-2 h-4 w-4" />
                      ) : (
                        <Power data-testid="soft-delete" className="mr-2 h-4 w-4" />
                      )}
                      {employee.isActive ? 'Desativar' : 'Reativar'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={roleColors[employee.role]}>
                      {roleLabels[employee.role]}
                    </Badge>
                    {!employee.isActive && <Badge variant="destructive">Inativo</Badge>}
                  </div>

                  {employee.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-2 h-4 w-4" />
                      {employee.email}
                    </div>
                  )}

                  {employee.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="mr-2 h-4 w-4" />
                      {employee.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
            <DialogDescription>Preencha os dados abaixo.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} autoComplete="off" />
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
                    <FormLabel>E-mail (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} autoComplete="off" />
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
                    <FormLabel>Cargo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASHIER">Operador de Caixa</SelectItem>
                        <SelectItem value="MANAGER">Gerente</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="VIEWER">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!editingEmployee && (
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN Inicial (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 1234 (Deixe vazio para gerar aleatório)"
                          maxLength={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Se vazio, um PIN aleatório será gerado.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="submit" data-testid="submit-employee">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Alterar PIN</DialogTitle>
            <DialogDescription>
              Defina um novo PIN de 4 dígitos para {employeeToResetPin?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-pin" className="text-right">
                Novo PIN
              </Label>
              <Input
                id="new-pin"
                value={newPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNewPin(val);
                }}
                className="col-span-3"
                placeholder="0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPinDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPin} disabled={newPin.length !== 4}>
              Salvar PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
