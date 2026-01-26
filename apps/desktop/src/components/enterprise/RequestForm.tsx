/**
 * @file RequestForm - Formulário de Requisição de Material
 * @description Formulário para criar requisições com seleção de produtos
 */

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useState, type FC } from 'react';
import type {
  Contract,
  WorkFront,
  Activity,
  StockLocation,
  RequestPriority,
} from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const requestItemSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  productName: z.string(),
  productUnit: z.string(),
  requestedQty: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
  notes: z.string().optional(),
});

const requestFormSchema = z.object({
  contractId: z.string().min(1, 'Contrato é obrigatório'),
  workFrontId: z.string().optional(),
  activityId: z.string().optional(),
  destinationId: z.string().min(1, 'Local de destino é obrigatório'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const),
  neededByDate: z.date().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(requestItemSchema).min(1, 'Adicione pelo menos um item'),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT SELECTOR
// ────────────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
}

interface ProductSelectorProps {
  products: Product[];
  onSelect: (product: Product) => void;
  selectedIds: string[];
}

const ProductSelector: FC<ProductSelectorProps> = ({ products, onSelect, selectedIds }) => {
  const [search, setSearch] = useState('');

  const filteredProducts = products.filter(
    (p) =>
      !selectedIds.includes(p.id) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      <Input
        placeholder="Buscar produto por nome ou código..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && filteredProducts.length > 0 && (
        <div className="max-h-48 overflow-auto rounded-md border">
          {filteredProducts.slice(0, 10).map((product) => (
            <div
              key={product.id}
              className="flex cursor-pointer items-center justify-between p-2 hover:bg-muted"
              onClick={() => {
                onSelect(product);
                setSearch('');
              }}
            >
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.sku} • Estoque: {product.currentStock} {product.unit}
                </p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      {search && filteredProducts.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface RequestFormProps {
  onSubmit: (data: RequestFormValues) => Promise<void>;
  onCancel: () => void;
  contracts: Contract[];
  workFronts: WorkFront[];
  activities: Activity[];
  locations: StockLocation[];
  products: Product[];
  isLoading?: boolean;
}

export const RequestForm: FC<RequestFormProps> = ({
  onSubmit,
  onCancel,
  contracts,
  workFronts,
  activities,
  locations,
  products,
  isLoading = false,
}) => {
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      contractId: '',
      workFrontId: '',
      activityId: '',
      destinationId: '',
      priority: 'NORMAL' as RequestPriority,
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const selectedContractId = form.watch('contractId');
  const selectedWorkFrontId = form.watch('workFrontId');

  // Filtrar frentes pelo contrato selecionado
  const filteredWorkFronts = workFronts.filter((wf) => wf.contractId === selectedContractId);

  // Filtrar atividades pela frente selecionada
  const filteredActivities = activities.filter((a) => a.workFrontId === selectedWorkFrontId);

  // Filtrar locais pelo contrato (ou mostrar todos se não houver contrato)
  const filteredLocations = selectedContractId
    ? locations.filter((l) => l.contractId === selectedContractId || l.type === 'CENTRAL')
    : locations;

  const handleProductSelect = (product: Product) => {
    append({
      productId: product.id,
      productName: product.name,
      productUnit: product.unit,
      requestedQty: 1,
      notes: '',
    });
  };

  const handleSubmit = async (data: RequestFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const selectedProductIds = fields.map((f) => f.productId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Destino */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Destino do Material</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contrato/Obra *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('workFrontId', '');
                      form.setValue('activityId', '');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o contrato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts
                        .filter((c) => c.status === 'ACTIVE')
                        .map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.code} - {contract.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workFrontId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frente de Trabalho</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('activityId', '');
                    }}
                    value={field.value}
                    disabled={!selectedContractId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frente (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredWorkFronts.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id}>
                          {wf.code} - {wf.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atividade</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedWorkFrontId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a atividade (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredActivities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.code} - {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destinationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local de Entrega *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.code} - {location.name}
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

        {/* Prioridade e Prazo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prioridade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">Baixa</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="neededByDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Necessária</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens da Requisição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProductSelector
              products={products}
              onSelect={handleProductSelect}
              selectedIds={selectedProductIds}
            />

            {fields.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-32">Quantidade</TableHead>
                    <TableHead className="w-16">Unidade</TableHead>
                    <TableHead className="w-48">Observação</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.productName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          {...form.register(`items.${index}.requestedQty` as const)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{field.productUnit}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="Obs..."
                          {...form.register(`items.${index}.notes` as const)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  Busque e adicione produtos à requisição usando o campo acima.
                </p>
              </div>
            )}

            {form.formState.errors.items && (
              <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || fields.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Criar Requisição
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export type { RequestFormValues };
