/**
 * @file RequestNewPage - Nova Requisição de Material
 * @description Wizard de criação de requisição com seleção de destino e itens
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { useContracts } from '@/hooks/enterprise/useContracts';
import { useWorkFronts } from '@/hooks/enterprise/useWorkFronts';
import { useStockLocations } from '@/hooks/enterprise/useStockLocations';
import {
  useCreateMaterialRequest,
  useAddRequestItem,
  useSubmitRequest,
} from '@/hooks/enterprise/useMaterialRequests';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Minus, Package, Plus, Save, Search, Send, Trash2 } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ────────────────────────────────────────────────────────────────────────────
// TYPES & SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const requestItemSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  productName: z.string(),
  productSku: z.string().optional(),
  productUnit: z.string(),
  requestedQty: z.coerce.number().min(0.001, 'Quantidade deve ser maior que zero'),
  notes: z.string().optional(),
});

const requestFormSchema = z.object({
  contractId: z.string().min(1, 'Contrato é obrigatório'),
  workFrontId: z.string().optional(),
  activityId: z.string().optional(),
  destinationId: z.string().min(1, 'Local de destino é obrigatório'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  neededByDate: z.date().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(requestItemSchema).min(1, 'Adicione pelo menos um item'),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

const priorityConfig = {
  LOW: { label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  HIGH: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  URGENT: { label: 'Urgente', color: 'bg-red-100 text-red-800' },
};

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT SEARCH
// ────────────────────────────────────────────────────────────────────────────

interface ProductSearchProps {
  onSelect: (product: { id: string; name: string; sku?: string; unit: string }) => void;
  selectedIds: string[];
}

const ProductSearch: FC<ProductSearchProps> = ({ onSelect, selectedIds }) => {
  const [search, setSearch] = useState('');
  const { data: allProducts = [] } = useProducts();

  const filteredProducts = useMemo(() => {
    if (!search || search.length < 2) return [];
    const searchLower = search.toLowerCase();
    return allProducts
      .filter(
        (p) =>
          !selectedIds.includes(p.id) &&
          (p.name.toLowerCase().includes(searchLower) ||
            (p.code && p.code.toLowerCase().includes(searchLower)) ||
            (p.internalCode && p.internalCode.toLowerCase().includes(searchLower)) ||
            (p.barcode && p.barcode.toLowerCase().includes(searchLower)))
      )
      .slice(0, 10);
  }, [allProducts, search, selectedIds]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar material por nome, código ou código de barras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {search.length >= 2 && filteredProducts.length > 0 && (
        <div className="max-h-64 overflow-auto rounded-md border bg-background shadow-md">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex cursor-pointer items-center justify-between p-3 hover:bg-muted transition-colors border-b last:border-b-0"
              onClick={() => {
                onSelect({
                  id: product.id,
                  name: product.name,
                  sku: product.code || product.internalCode || undefined,
                  unit: product.unit || 'UN',
                });
                setSearch('');
              }}
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.code || product.internalCode || 'Sem código'} • {product.unit || 'UN'}
                </p>
              </div>
              <Plus className="h-5 w-5 text-primary" />
            </div>
          ))}
        </div>
      )}
      {search.length >= 2 && filteredProducts.length === 0 && (
        <p className="text-sm text-muted-foreground p-2">Nenhum material encontrado</p>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────

export const RequestNewPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Initial values from URL
  const initialContractId = searchParams.get('contractId') || '';
  const initialWorkFrontId = searchParams.get('workFrontId') || '';

  // Data
  const { data: contracts = [] } = useContracts();
  const { data: allWorkFronts = [] } = useWorkFronts();
  const { data: allLocations = [] } = useStockLocations();

  // Mutations
  const createRequest = useCreateMaterialRequest();
  const addItem = useAddRequestItem();
  const submitRequest = useSubmitRequest();

  const [isSaving, setIsSaving] = useState(false);

  // Form
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      contractId: initialContractId,
      workFrontId: initialWorkFrontId,
      activityId: '',
      destinationId: '',
      priority: 'NORMAL',
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const selectedContractId = form.watch('contractId');

  // Filtered data based on contract
  const filteredWorkFronts = useMemo(() => {
    if (!selectedContractId) return [];
    return allWorkFronts.filter((wf) => wf.contractId === selectedContractId);
  }, [allWorkFronts, selectedContractId]);

  const filteredLocations = useMemo(() => {
    if (!selectedContractId) return allLocations.filter((l) => l.locationType === 'CENTRAL');
    return allLocations.filter(
      (l) => l.contractId === selectedContractId || l.locationType === 'CENTRAL'
    );
  }, [allLocations, selectedContractId]);

  // Handlers
  const handleBack = () => navigate('/enterprise/requests');

  const handleProductSelect = (product: {
    id: string;
    name: string;
    sku?: string;
    unit: string;
  }) => {
    append({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productUnit: product.unit,
      requestedQty: 1,
      notes: '',
    });
  };

  const handleQuantityChange = (index: number, delta: number) => {
    const field = fields[index];
    if (!field) return;
    const currentQty = field.requestedQty;
    const newQty = Math.max(0.001, currentQty + delta);
    update(index, {
      productId: field.productId || '',
      productName: field.productName || '',
      productUnit: field.productUnit || '',
      requestedQty: newQty,
      notes: field.notes,
      productSku: field.productSku,
    });
  };

  const onSubmit = async (values: RequestFormValues, submitAfterSave = false) => {
    setIsSaving(true);
    try {
      // 1. Create the request
      const request = await createRequest.mutateAsync({
        contractId: values.contractId,
        workFrontId: values.workFrontId || undefined,
        activityId: values.activityId || undefined,
        destinationId: values.destinationId,
        priority: values.priority,
        neededByDate: values.neededByDate?.toISOString(),
        notes: values.notes,
      });

      // 2. Add items
      for (const item of values.items) {
        await addItem.mutateAsync({
          requestId: request.id,
          item: {
            productId: item.productId || '',
            requestedQty: item.requestedQty,
            notes: item.notes,
          },
        });
      }

      // 3. Submit if requested
      if (submitAfterSave) {
        await submitRequest.mutateAsync(request.id);
        toast({
          title: 'Requisição enviada!',
          description: `A requisição ${request.requestNumber} foi criada e enviada para aprovação.`,
        });
      } else {
        toast({
          title: 'Requisição salva!',
          description: `A requisição ${request.requestNumber} foi salva como rascunho.`,
        });
      }

      navigate(`/enterprise/requests/${request.id}`);
    } catch (error) {
      toast({
        title: 'Erro ao criar requisição',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => form.handleSubmit((data) => onSubmit(data, false))();
  const handleSaveAndSubmit = () => form.handleSubmit((data) => onSubmit(data, true))();

  const selectedProductIds = fields.map((f) => f.productId);
  const totalItems = fields.length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Requisição</h1>
          <p className="text-muted-foreground">Solicite materiais para uma obra ou frente</p>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Step 1: Destination */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  1
                </div>
                <div>
                  <CardTitle>Destino do Material</CardTitle>
                  <CardDescription>Selecione onde o material será utilizado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
                        form.setValue('destinationId', '');
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
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedContractId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a frente (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhuma frente específica</SelectItem>
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
                        {filteredLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} ({loc.locationType === 'CENTRAL' ? 'Central' : 'Obra'})
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <Badge className={cn('mr-2', config.color)}>{config.label}</Badge>
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
                name="neededByDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Necessária</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Quando o material é necessário</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre a requisição..."
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
                    <CardDescription>Adicione os materiais necessários</CardDescription>
                  </div>
                </div>
                {totalItems > 0 && <Badge variant="secondary">{totalItems} item(ns)</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Search */}
              <ProductSearch onSelect={handleProductSelect} selectedIds={selectedProductIds} />

              {/* Items Table */}
              {fields.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Material</TableHead>
                        <TableHead className="w-[30%]">Quantidade</TableHead>
                        <TableHead className="w-[20%]">Observação</TableHead>
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
                            <Input
                              placeholder="Obs..."
                              className="h-8"
                              {...form.register(`items.${index}.notes`)}
                            />
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

              {fields.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                  <Package className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Nenhum material adicionado. Use a busca acima para adicionar itens.
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || fields.length === 0}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Rascunho
              </Button>
              <Button
                type="button"
                onClick={handleSaveAndSubmit}
                disabled={isSaving || fields.length === 0}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar para Aprovação
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RequestNewPage;
