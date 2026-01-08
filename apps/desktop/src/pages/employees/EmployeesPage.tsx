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
import { useCreateEmployee, useEmployees, useUpdateEmployee } from '@/hooks/useEmployees';
import { type Employee, type EmployeeRole } from '@/types';
import {
  Edit,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { useState, type FC } from 'react';

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

export const EmployeesPage: FC = () => {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  // TODO: Use React Hook Form for better validation handling
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<EmployeeRole>('CASHIER');

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async () => {
    if (!formName.trim()) return;

    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          data: {
            name: formName,
            email: formEmail,
            phone: formPhone,
            role: formRole,
          },
        });
        toast({ title: 'Funcionário atualizado com sucesso' });
      } else {
        // Gera PIN aleatório de 4 dígitos
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        await createEmployee.mutateAsync({
          name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
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
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('CASHIER');
    setEditingEmployee(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormName(employee.name);
    setFormEmail(employee.email || '');
    setFormPhone(employee.phone || '');
    setFormRole(employee.role);
    setIsDialogOpen(true);
  };

  const toggleActive = async (employee: Employee) => {
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        data: { isActive: !employee.isActive },
      });
      toast({ title: `Funcionário ${!employee.isActive ? 'ativado' : 'desativado'}` });
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    // TODO: Implement soft delete or hard delete if needed
    if (confirm('Tem certeza que deseja desativar este funcionário?')) {
      await updateEmployee.mutateAsync({
        id: id,
        data: { isActive: false },
      });
      toast({ title: 'Funcionário desativado' });
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
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="role">Cargo/Permissão *</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as EmployeeRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="MANAGER">Gerente</SelectItem>
                    <SelectItem value="CASHIER">Operador de Caixa</SelectItem>
                    <SelectItem value="VIEWER">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>{editingEmployee ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(employee)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleActive(employee)}>
                    <Shield className="mr-2 h-4 w-4" />
                    {employee.isActive ? 'Desativar' : 'Ativar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(employee.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
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
