/**
 * @file TransferForm - Formulário de Transferência de Estoque
 * @description Formulário para criar transferências entre locais
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRight, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useState, type FC } from 'react';
import type { StockLocation, TransferPriority } from '@/types/enterprise';

// ────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const transferItemSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  productName: z.string(),
  productUnit: z.string(),
  availableQty: z.number(),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
});

const transferFormSchema = z
  .object({
    originId: z.string().min(1, 'Local de origem é obrigatório'),
    destinationId: z.string().min(1, 'Local de destino é obrigatório'),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const),
    notes: z.string().max(500).optional(),
    items: z.array(transferItemSchema).min(1, 'Adicione pelo menos um item'),
  })
  .refine((data) => data.originId !== data.destinationId, {
    message: 'Origem e destino devem ser diferentes',
    path: ['destinationId'],
  });

type TransferFormValues = z.infer<typeof transferFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// STOCK ITEM TYPE
// ────────────────────────────────────────────────────────────────────────────

interface StockItem {
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  balance: number;
}

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT SELECTOR
// ────────────────────────────────────────────────────────────────────────────

interface ProductSelectorProps {
  stockItems: StockItem[];
  onSelect: (item: StockItem) => void;
  selectedIds: string[];
}

const ProductSelector: FC<ProductSelectorProps> = ({ stockItems, onSelect, selectedIds }) => {
  const [search, setSearch] = useState('');

  const filteredItems = stockItems.filter(
    (item) =>
      !selectedIds.includes(item.productId) &&
      item.balance > 0 &&
      (item.productName.toLowerCase().includes(search.toLowerCase()) ||
        item.productSku?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      <Input
        placeholder="Buscar produto por nome ou código..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && filteredItems.length > 0 && (
        <div className="max-h-48 overflow-auto rounded-md border">
          {filteredItems.slice(0, 10).map((item) => (
            <div
              key={item.productId}
              className="flex cursor-pointer items-center justify-between p-2 hover:bg-muted"
              onClick={() => {
                onSelect(item);
                setSearch('');
              }}
            >
              <div>
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.productSku} • Disponível: {item.balance} {item.unit}
                </p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      {search && filteredItems.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum produto com saldo disponível encontrado
        </p>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface TransferFormProps {
  onSubmit: (data: TransferFormValues) => Promise<void>;
  onCancel: () => void;
  locations: StockLocation[];
  /** Função para buscar estoque do local de origem */
  getLocationStock: (locationId: string) => Promise<StockItem[]>;
  isLoading?: boolean;
}

export const TransferForm: FC<TransferFormProps> = ({
  onSubmit,
  onCancel,
  locations,
  getLocationStock,
  isLoading = false,
}) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      originId: '',
      destinationId: '',
      priority: 'NORMAL' as TransferPriority,
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const originId = form.watch('originId');
  // destinationId is watched but not currently used for validation
  // Will be used for destination stock validation in future

  // Carregar estoque quando origem mudar
  const handleOriginChange = async (newOriginId: string) => {
    form.setValue('originId', newOriginId);
    form.setValue('items', []); // Limpar itens ao mudar origem

    if (newOriginId) {
      setIsLoadingStock(true);
      try {
        const items = await getLocationStock(newOriginId);
        setStockItems(items);
      } catch (error) {
        console.error('Error loading stock:', error);
        setStockItems([]);
      } finally {
        setIsLoadingStock(false);
      }
    } else {
      setStockItems([]);
    }
  };

  const handleItemSelect = (item: StockItem) => {
    append({
      productId: item.productId,
      productName: item.productName,
      productUnit: item.unit,
      availableQty: item.balance,
      quantity: 1,
    });
  };

  const handleSubmit = async (data: TransferFormValues) => {
    // Validar quantidades vs disponível
    const invalidItems = data.items.filter((item) => item.quantity > item.availableQty);
    if (invalidItems.length > 0) {
      form.setError('items', {
        message: 'Quantidade excede o disponível em algum item',
      });
      return;
    }

    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting transfer:', error);
    }
  };

  const selectedProductIds = fields.map((f) => f.productId);

  // Filtrar locais para destino (excluir origem)
  const destinationLocations = locations.filter((l) => l.id !== originId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Origem e Destino */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rota da Transferência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <FormField
                control={form.control}
                name="originId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Local de Origem *</FormLabel>
                    <Select
                      onValueChange={(value) => handleOriginChange(value)}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  location.type === 'CENTRAL' ? 'bg-blue-500' : 'bg-green-500'
                                }`}
                              />
                              {location.code} - {location.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ArrowRight className="mb-2 h-5 w-5 text-muted-foreground" />

              <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Local de Destino *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!originId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {destinationLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  location.type === 'CENTRAL' ? 'bg-blue-500' : 'bg-green-500'
                                }`}
                              />
                              {location.code} - {location.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhes</CardTitle>
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
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a transferência..."
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
            <CardTitle className="text-lg">Itens para Transferir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!originId ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  Selecione um local de origem para ver os produtos disponíveis.
                </p>
              </div>
            ) : isLoadingStock ? (
              <div className="flex items-center justify-center gap-2 p-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando estoque...</span>
              </div>
            ) : stockItems.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  Nenhum produto com saldo disponível neste local.
                </p>
              </div>
            ) : (
              <>
                <ProductSelector
                  stockItems={stockItems}
                  onSelect={handleItemSelect}
                  selectedIds={selectedProductIds}
                />

                {fields.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="w-28">Disponível</TableHead>
                        <TableHead className="w-32">Quantidade</TableHead>
                        <TableHead className="w-16">Unidade</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const quantity = form.watch(`items.${index}.quantity`);
                        const isOverLimit = quantity > field.availableQty;

                        return (
                          <TableRow key={field.id}>
                            <TableCell className="font-medium">{field.productName}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {field.availableQty}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={field.availableQty}
                                {...form.register(`items.${index}.quantity` as const)}
                                className={`w-24 ${isOverLimit ? 'border-red-500' : ''}`}
                              />
                              {isOverLimit && (
                                <p className="mt-1 text-xs text-destructive">Excede disponível</p>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {field.productUnit}
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
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </>
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
                Criar Transferência
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export type { TransferFormValues };
