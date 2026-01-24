import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useCustomers,
  type Customer,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from '@/hooks/useCustomers';
import { Edit, Mail, MoreHorizontal, Phone, Search, Trash2, User, UserPlus } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomerCreateDialog } from '@/components/motoparts/CustomerSearch';

export const CustomersPage: FC = () => {
  const {
    customers,
    isLoading,
    loadCustomers,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
  } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf?.includes(searchTerm) ||
      c.phone?.includes(searchTerm)
  );

  const handleCreate = async (input: CreateCustomerInput) => {
    await createCustomer(input);
    setShowCreateDialog(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja desativar este cliente?')) {
      await deactivateCustomer(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie o cadastro de seus clientes e histórico.</p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setShowCreateDialog(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
        <CardHeader>
          <CardTitle>Listagem de Clientes</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {customer.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{customer.cpf || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                        {customer.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(customer)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Desativar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CustomerCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async (data) => {
          if (editingCustomer) {
            await updateCustomer(editingCustomer.id, data as UpdateCustomerInput);
          } else {
            await handleCreate(data);
          }
          setShowCreateDialog(false);
        }}
        initialName={editingCustomer?.name || ''}
        initialData={editingCustomer || undefined}
      />
    </div>
  );
};
