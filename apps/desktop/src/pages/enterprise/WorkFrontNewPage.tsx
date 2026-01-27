/**
 * @file WorkFrontNewPage - Criar Nova Frente de Trabalho
 * @description Formulário de criação de frente de trabalho com validação Zod
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
import { useCreateWorkFront } from '@/hooks/enterprise/useWorkFronts';
import { useContracts } from '@/hooks/enterprise/useContracts';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, HardHat, Loader2, Save } from 'lucide-react';
import { type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const workFrontFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código muito longo')
    .regex(/^[A-Z0-9-]+$/, 'Use apenas letras maiúsculas, números e hífen'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
  description: z.string().max(1000).optional(),
  contractId: z.string().min(1, 'Contrato é obrigatório'),
  supervisorId: z.string().min(1, 'Supervisor é obrigatório'),
  status: z.enum(['PLANNING', 'ACTIVE']),
  location: z.string().max(200).optional(),
});

type WorkFrontFormValues = z.infer<typeof workFrontFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const WorkFrontNewPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Pre-selected contract from query params
  const preSelectedContractId = searchParams.get('contractId') || '';

  // Data
  const { data: employees = [] } = useEmployees();
  const { data: contracts = [] } = useContracts();
  const supervisors = employees.filter((e) => e.isActive);

  // Mutation
  const createWorkFront = useCreateWorkFront();

  // Form
  const form = useForm<WorkFrontFormValues>({
    resolver: zodResolver(workFrontFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      contractId: preSelectedContractId,
      supervisorId: '',
      status: 'PLANNING',
      location: '',
    },
  });

  const onSubmit = async (values: WorkFrontFormValues) => {
    try {
      const result = await createWorkFront.mutateAsync({
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        contractId: values.contractId,
        supervisorId: values.supervisorId,
        status: values.status,
      });

      toast({
        title: 'Frente de trabalho criada!',
        description: `A frente ${result.code} foi criada com sucesso.`,
      });

      navigate(`/enterprise/work-fronts/${result.id}`);
    } catch (error) {
      toast({
        title: 'Erro ao criar frente de trabalho',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => navigate('/enterprise/work-fronts');

  return (
    <div className="container max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Frente de Trabalho</h1>
          <p className="text-muted-foreground">Cadastre uma nova frente de trabalho</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>Dados principais da frente de trabalho</CardDescription>
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
                        placeholder="FT-001"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Código único da frente</FormDescription>
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
                        <SelectItem value="ACTIVE">Ativa</SelectItem>
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
                    <FormLabel>Nome da Frente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Montagem Elétrica - Bloco A" {...field} />
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
                        placeholder="Descrição detalhada das atividades desta frente..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Localização</FormLabel>
                    <FormControl>
                      <Input placeholder="Área 3, Setor B, Pavimento Térreo" {...field} />
                    </FormControl>
                    <FormDescription>Local específico dentro da obra</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contract & Supervisor */}
          <Card>
            <CardHeader>
              <CardTitle>Vinculação</CardTitle>
              <CardDescription>Contrato e responsável pela frente</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o contrato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.code} - {contract.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Contrato ao qual esta frente pertence</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supervisorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o supervisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisors.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Responsável pela gestão desta frente</FormDescription>
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
            <Button type="submit" disabled={createWorkFront.isPending}>
              {createWorkFront.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Criar Frente
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WorkFrontNewPage;
