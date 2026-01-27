/**
 * @file TransferNewPage - Nova Transferência de Estoque
 * @description Formulário para criar transferência entre locais de estoque
 */

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStockLocations, useStockBalances } from '@/hooks/enterprise/useStockLocations';
import { useCreateStockTransfer, useAddTransferItem } from '@/hooks/enterprise/useStockTransfers';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import type { StockBalance } from '@/lib/tauri';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Minus,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  Warehouse,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// TYPES & SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const transferItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  productSku: z.string().optional(),
  productUnit: z.string(),
  availableQty: z.number(),
  requestedQty: z.coerce.number().min(0.001, 'Quantidade deve ser maior que zero'),
});

const transferFormSchema = z
  .object({
    sourceLocationId: z.string().min(1, 'Local de origem é obrigatório'),
    destinationLocationId: z.string().min(1, 'Local de destino é obrigatório'),
    notes: z.string().max(500).optional(),
    items: z.array(transferItemSchema).min(1, 'Adicione pelo menos um item'),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: 'Origem e destino devem ser diferentes',
    path: ['destinationLocationId'],
  });

type TransferFormValues = z.infer<typeof transferFormSchema>;

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT SELECTOR FROM STOCK
// ────────────────────────────────────────────────────────────────────────────

interface StockProductSelectorProps {
  balances: StockBalance[];
  onSelect: (balance: StockBalance) => void;
  selectedIds: string[];
}

const StockProductSelector: FC<StockProductSelectorProps> = ({
  balances,
  onSelect,
  selectedIds,
}) => {
  const [search, setSearch] = useState('');

  const filteredBalances = useMemo(() => {
    if (!search)
      return balances.filter((b) => !selectedIds.includes(b.productId) && b.availableQty > 0);
    const searchLower = search.toLowerCase();
    return balances.filter(
      (b) =>
        !selectedIds.includes(b.productId) &&
        b.availableQty > 0 &&
        (b.productName.toLowerCase().includes(searchLower) ||
          (b.productSku && b.productSku.toLowerCase().includes(searchLower)))
    );
  }, [balances, search, selectedIds]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar material disponível no estoque de origem..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {filteredBalances.length > 0 && (
        <div className="max-h-64 overflow-auto rounded-md border bg-background shadow-md">
          {filteredBalances.slice(0, 15).map((balance) => (
            <div
              key={balance.productId}
              className="flex cursor-pointer items-center justify-between p-3 hover:bg-muted transition-colors border-b last:border-b-0"
              onClick={() => {
                onSelect(balance);
                setSearch('');
              }}
            >
              <div>
                <p className="font-medium">{balance.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {balance.productSku || 'Sem código'} • Disponível:{' '}
                  <span className="font-medium text-foreground">
                    {balance.availableQty} {balance.productUnit}
                  </span>
                </p>
              </div>
              <Plus className="h-5 w-5 text-primary" />
            </div>
          ))}
        </div>
      )}
      {search && filteredBalances.length === 0 && (
        <p className="text-sm text-muted-foreground p-2">
          Nenhum material encontrado com estoque disponível
        </p>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const TransferNewPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Initial values from URL
  const initialSourceId = searchParams.get('sourceId') || '';
  const initialDestinationId = searchParams.get('destinationId') || '';

  // Data
  const { data: allLocations = [] } = useStockLocations();

  // Mutations
  const createTransfer = useCreateStockTransfer();
  const addItem = useAddTransferItem();

  const [isSaving, setIsSaving] = useState(false);

  // Form
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      sourceLocationId: initialSourceId,
      destinationLocationId: initialDestinationId,
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const sourceLocationId = form.watch('sourceLocationId');

  // Get stock balances for source location
  const { data: sourceBalances = [] } = useStockBalances(sourceLocationId);

  // Filter locations for destination (exclude source)
  const destinationLocations = useMemo(() => {
    return allLocations.filter((l) => l.id !== sourceLocationId);
  }, [allLocations, sourceLocationId]);

  // Get source location info
  const sourceLocation = allLocations.find((l) => l.id === sourceLocationId);

  // Handlers
  const handleBack = () => navigate('/enterprise/transfers');

  const handleProductSelect = (balance: StockBalance) => {
    append({
      productId: balance.productId,
      productName: balance.productName,
      productSku: balance.productSku,
      productUnit: balance.productUnit,
      availableQty: balance.availableQty,
      requestedQty: 1,
    });
  };

  const handleQuantityChange = (index: number, delta: number) => {
    const current = fields[index];
    if (!current) return;
    const newQty = Math.max(0.001, Math.min(current.requestedQty + delta, current.availableQty));
    update(index, {
      productId: current.productId || '',
      productName: current.productName || '',
      productUnit: current.productUnit || '',
      availableQty: current.availableQty ?? 0,
      requestedQty: newQty,
      productSku: current.productSku,
    });
  };

  const onSubmit = async (values: TransferFormValues) => {
    setIsSaving(true);
    try {
      // Validate quantities don't exceed available
      for (const item of values.items) {
        if (item.requestedQty > item.availableQty) {
          toast({
            title: 'Quantidade inválida',
            description: `A quantidade de ${item.productName} excede o disponível.`,
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
      }

      // 1. Create the transfer
      const transfer = await createTransfer.mutateAsync({
        sourceLocationId: values.sourceLocationId,
        destinationLocationId: values.destinationLocationId,
        notes: values.notes,
      });

      // 2. Add items
      for (const item of values.items) {
        await addItem.mutateAsync({
          transferId: transfer.id,
          item: {
            productId: item.productId,
            requestedQty: item.requestedQty,
          },
        });
      }

      toast({
        title: 'Transferência criada!',
        description: `A transferência ${transfer.transferNumber} foi criada com sucesso.`,
      });

      navigate(`/enterprise/transfers/${transfer.id}`);
    } catch (error) {
      toast({
        title: 'Erro ao criar transferência',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProductIds = fields.map((f) => f.productId);
  const totalItems = fields.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Transferência</h1>
          <p className="text-muted-foreground">Transfira materiais entre locais de estoque</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Locations */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <CardTitle>Origem e Destino</CardTitle>
                  <CardDescription>Selecione os locais de estoque</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {/* Source */}
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="sourceLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4" />
                          Origem *
                        </FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Clear items when source changes
                            form.setValue('items', []);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a origem" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allLocations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                <div className="flex items-center gap-2">
                                  <span>{loc.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {loc.locationType === 'CENTRAL' ? 'Central' : 'Obra'}
                                  </Badge>
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

                {/* Arrow */}
                <div className="flex items-center justify-center pt-8">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Destination */}
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="destinationLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Destino *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!sourceLocationId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o destino" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {destinationLocations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                <div className="flex items-center gap-2">
                                  <span>{loc.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {loc.locationType === 'CENTRAL' ? 'Central' : 'Obra'}
                                  </Badge>
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
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Motivo da transferência, instruções especiais..."
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

          {/* Step 2: Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    2
                  </div>
                  <div>
                    <CardTitle>Materiais</CardTitle>
                    <CardDescription>
                      Selecione os materiais disponíveis em{' '}
                      <strong>{sourceLocation?.name || 'origem'}</strong>
                    </CardDescription>
                  </div>
                </div>
                {totalItems > 0 && <Badge variant="secondary">{totalItems} item(ns)</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Search */}
              {sourceLocationId ? (
                <StockProductSelector
                  balances={sourceBalances}
                  onSelect={handleProductSelect}
                  selectedIds={selectedProductIds}
                />
              ) : (
                <div className="p-4 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  Selecione o local de origem para ver os materiais disponíveis
                </div>
              )}

              {/* Items Table */}
              {fields.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%]">Material</TableHead>
                        <TableHead className="w-[15%] text-right">Disponível</TableHead>
                        <TableHead className="w-[30%]">Quantidade</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{field.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {field.productSku || 'Sem código'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-muted-foreground">
                              {field.availableQty} {field.productUnit}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(index, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                step="0.001"
                                min="0.001"
                                max={field.availableQty}
                                className="w-20 text-center"
                                {...form.register(`items.${index}.requestedQty`, {
                                  valueAsNumber: true,
                                })}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(index, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm text-muted-foreground w-12">
                                {field.productUnit}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {fields.length === 0 && sourceLocationId && (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                  <Package className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Nenhum material selecionado. Use a busca acima para adicionar itens.
                  </p>
                </div>
              )}

              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between gap-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || fields.length === 0}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Criar Transferência
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TransferNewPage;
