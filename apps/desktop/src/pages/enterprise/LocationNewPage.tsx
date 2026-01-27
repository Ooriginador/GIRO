/**
 * @file LocationNewPage - Criar Novo Local de Estoque
 * @description Formulário de criação de local de estoque (almoxarifado) com validação Zod
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
import { useCreateStockLocation } from '@/hooks/enterprise/useStockLocations';
import { useContracts } from '@/hooks/enterprise/useContracts';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { ArrowLeft, Loader2, MapPin, Save, Warehouse } from 'lucide-react';
import { type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const locationFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código muito longo')
    .regex(/^[A-Z0-9-]+$/, 'Use apenas letras maiúsculas, números e hífen'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
  description: z.string().max(1000).optional(),
  locationType: z.enum(['CENTRAL', 'FIELD', 'TRANSIT']),
  contractId: z.string().optional(),
  managerId: z.string().optional(),
  address: z.string().max(500).optional(),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const LocationNewPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Pre-selected values from query params
  const preSelectedContractId = searchParams.get('contractId') || '';
  const preSelectedType =
    (searchParams.get('type') as 'CENTRAL' | 'FIELD' | 'TRANSIT') || 'CENTRAL';

  // Data
  const { data: employees = [] } = useEmployees();
  const { data: contracts = [] } = useContracts();
  const managers = employees.filter((e) => e.isActive);

  // Mutation
  const createLocation = useCreateStockLocation();

  // Form
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      locationType: preSelectedType,
      contractId: preSelectedContractId,
      managerId: '',
      address: '',
    },
  });

  const locationType = form.watch('locationType');

  const onSubmit = async (values: LocationFormValues) => {
    try {
      const result = await createLocation.mutateAsync({
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        locationType: values.locationType,
        contractId: values.contractId || undefined,
        managerId: values.managerId || undefined,
        address: values.address || undefined,
      });

      toast({
        title: 'Local de estoque criado!',
        description: `O almoxarifado ${result.code} foi criado com sucesso.`,
      });

      navigate(`/enterprise/locations/${result.id}`);
    } catch (error) {
      toast({
        title: 'Erro ao criar local de estoque',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => navigate('/enterprise/locations');

  return (
    <div className="container max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Local de Estoque</h1>
          <p className="text-muted-foreground">
            Cadastre um novo almoxarifado ou local de armazenamento
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>Dados principais do local de estoque</CardDescription>
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
                        placeholder="ALM-001"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Código único do local</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CENTRAL">Central (Matriz)</SelectItem>
                        <SelectItem value="FIELD">Campo (Obra)</SelectItem>
                        <SelectItem value="TRANSIT">Trânsito</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {locationType === 'CENTRAL' && 'Almoxarifado central da empresa'}
                      {locationType === 'FIELD' && 'Almoxarifado localizado na obra'}
                      {locationType === 'TRANSIT' && 'Materiais em trânsito entre locais'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Local *</FormLabel>
                    <FormControl>
                      <Input placeholder="Almoxarifado Central São Paulo" {...field} />
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
                        placeholder="Descrição do local, capacidade, observações..."
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

          {/* Location & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização e Vinculação
              </CardTitle>
              <CardDescription>Endereço e responsáveis pelo local</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Rua, número, bairro, cidade, estado, CEP..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {locationType === 'FIELD' && (
                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contrato/Obra</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o contrato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {contracts.map((contract) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              {contract.code} - {contract.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Vincular este almoxarifado a uma obra</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {managers.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Almoxarife ou responsável pelo local</FormDescription>
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
            <Button type="submit" disabled={createLocation.isPending}>
              {createLocation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Criar Local
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default LocationNewPage;
