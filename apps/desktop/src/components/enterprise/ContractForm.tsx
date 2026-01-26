/**
 * @file ContractForm - Formulário de Contrato/Obra
 * @description Formulário para criar e editar contratos Enterprise
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, Save, X } from 'lucide-react';
import type { FC } from 'react';
import type { Contract, ContractStatus } from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const contractFormSchema = z.object({
  code: z
    .string()
    .min(3, 'Código deve ter no mínimo 3 caracteres')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Código deve conter apenas letras maiúsculas, números e hífens'),
  name: z
    .string()
    .min(5, 'Nome deve ter no mínimo 5 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  clientName: z
    .string()
    .min(3, 'Nome do cliente é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  clientCNPJ: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)')
    .optional()
    .or(z.literal('')),
  startDate: z.date({ required_error: 'Data de início é obrigatória' }),
  endDate: z.date().optional(),
  budget: z.coerce.number().min(0, 'Orçamento não pode ser negativo').optional(),
  costCenter: z.string().min(1, 'Centro de custo é obrigatório').max(20),
  status: z.enum(['PLANNING', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED'] as const),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'UF deve ter 2 caracteres').optional().or(z.literal('')),
  managerId: z.string().min(1, 'Gerente responsável é obrigatório'),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface ContractFormProps {
  /** Contrato existente para edição (undefined = criar novo) */
  contract?: Contract;
  /** Callback ao submeter com sucesso */
  onSubmit: (data: ContractFormValues) => Promise<void>;
  /** Callback ao cancelar */
  onCancel: () => void;
  /** Lista de gerentes disponíveis */
  managers: Array<{ id: string; name: string }>;
  /** Se está carregando */
  isLoading?: boolean;
}

export const ContractForm: FC<ContractFormProps> = ({
  contract,
  onSubmit,
  onCancel,
  managers,
  isLoading = false,
}) => {
  const isEditing = !!contract;

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: contract
      ? {
          code: contract.code,
          name: contract.name,
          description: contract.description || '',
          clientName: contract.clientName,
          clientCNPJ: contract.clientCNPJ || '',
          startDate: new Date(contract.startDate),
          endDate: contract.endDate ? new Date(contract.endDate) : undefined,
          budget: contract.budget || undefined,
          costCenter: contract.costCenter,
          status: contract.status,
          address: contract.address || '',
          city: contract.city || '',
          state: contract.state || '',
          managerId: contract.managerId,
        }
      : {
          code: '',
          name: '',
          description: '',
          clientName: '',
          clientCNPJ: '',
          startDate: new Date(),
          costCenter: '',
          status: 'PLANNING' as ContractStatus,
          address: '',
          city: '',
          state: '',
          managerId: '',
        },
  });

  const handleSubmit = async (data: ContractFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting contract:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="OBRA-2026-001"
                      {...field}
                      disabled={isEditing}
                      className="uppercase"
                    />
                  </FormControl>
                  <FormDescription>Identificador único do contrato</FormDescription>
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
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PLANNING">Planejamento</SelectItem>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                      <SelectItem value="COMPLETED">Concluído</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
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
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome do Contrato *</FormLabel>
                  <FormControl>
                    <Input placeholder="Construção Sede Nova - Cliente ABC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição detalhada do escopo do contrato..."
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

        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome/Razão Social *</FormLabel>
                  <FormControl>
                    <Input placeholder="Empresa ABC Ltda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientCNPJ"
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
          </CardContent>
        </Card>

        {/* Período e Orçamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Período e Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
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
                  <FormLabel>Data Prevista de Término</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
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
                    <Input type="number" step="0.01" placeholder="0,00" {...field} />
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
              name="managerId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Gerente Responsável *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gerente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Localização */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Localização</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-3">
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
                <FormItem className="sm:col-span-2">
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
                    <Input placeholder="SP" maxLength={2} className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Atualizar' : 'Criar'} Contrato
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export type { ContractFormValues };
