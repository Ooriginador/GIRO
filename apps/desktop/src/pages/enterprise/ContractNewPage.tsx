/**
 * @file ContractNewPage - Criar Novo Contrato
 * @description Formulário de criação de contrato com validação Zod
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { useCreateContract } from '@/hooks/enterprise/useContracts';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Loader2, Save } from 'lucide-react';
import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const contractFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código muito longo')
    .regex(/^[A-Z0-9-]+$/, 'Use apenas letras maiúsculas, números e hífen'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
  description: z.string().max(1000).optional(),
  clientName: z.string().min(2, 'Nome do cliente é obrigatório'),
  clientCnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^$/, 'CNPJ inválido')
    .optional()
    .or(z.literal('')),
  startDate: z.date({ required_error: 'Data de início é obrigatória' }),
  endDate: z.date().optional(),
  budget: z.coerce.number().min(0).optional(),
  costCenter: z.string().min(1, 'Centro de custo é obrigatório'),
  status: z.enum(['PLANNING', 'ACTIVE']),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z
    .string()
    .max(2)
    .regex(/^[A-Z]{0,2}$/, 'Use sigla do estado (ex: SP)')
    .optional(),
  managerId: z.string().min(1, 'Gerente responsável é obrigatório'),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// CNPJ MASK
// ────────────────────────────────────────────────────────────────────────────

function formatCnpj(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8)
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12)
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(
      8
    )}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(
    8,
    12
  )}-${numbers.slice(12)}`;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const ContractNewPage: FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data
  const { data: employees = [] } = useEmployees();
  const managers = employees.filter((e) => e.isActive);

  // Mutation
  const createContract = useCreateContract();

  // Form
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      clientName: '',
      clientCnpj: '',
      costCenter: '',
      status: 'PLANNING',
      address: '',
      city: '',
      state: '',
      managerId: '',
    },
  });

  const onSubmit = async (values: ContractFormValues) => {
    try {
      const result = await createContract.mutateAsync({
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        clientName: values.clientName,
        clientCnpj: values.clientCnpj || undefined,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate?.toISOString(),
        budget: values.budget,
        costCenter: values.costCenter,
        status: values.status,
        address: values.address || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        managerId: values.managerId,
      });

      toast({
        title: 'Contrato criado!',
        description: `O contrato ${result.code} foi criado com sucesso.`,
      });

      navigate(`/enterprise/contracts/${result.id}`);
    } catch (error) {
      toast({
        title: 'Erro ao criar contrato',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => navigate('/enterprise/contracts');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Contrato</h1>
          <p className="text-muted-foreground">Cadastre um novo contrato ou obra</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>Dados principais do contrato</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="OBRA-001"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Código único do contrato</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLANNING">Planejamento</SelectItem>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Contrato *</FormLabel>
                    <FormControl>
                      <Input placeholder="Construção da Subestação XYZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição detalhada do contrato..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
              <CardDescription>Informações do cliente contratante</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Razão Social *</FormLabel>
                    <FormControl>
                      <Input placeholder="Empresa XYZ Ltda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientCnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00.000.000/0000-00"
                        {...field}
                        onChange={(e) => field.onChange(formatCnpj(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costCenter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo *</FormLabel>
                    <FormControl>
                      <Input placeholder="CC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orçamento (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Local e Período</CardTitle>
              <CardDescription>Onde e quando o contrato será executado</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número, bairro..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
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
                    <FormLabel>Estado (UF)</FormLabel>
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

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previsão de Término</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Manager */}
          <Card>
            <CardHeader>
              <CardTitle>Responsável</CardTitle>
              <CardDescription>Gerente responsável pelo contrato</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>Gerente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o gerente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {managers.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Responsável pela aprovação de requisições e gestão do contrato
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createContract.isPending}>
              {createContract.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Criar Contrato
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ContractNewPage;
