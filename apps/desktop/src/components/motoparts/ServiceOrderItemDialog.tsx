import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/use-products';
import { useServiceOrderItems, useServices, ServiceOrderItem } from '@/hooks/useServiceOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { cn, formatCurrency } from '@/lib/utils';
import { Product } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, Package, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';

const formSchema = z
  .object({
    itemType: z.enum(['PART', 'SERVICE']),
    productId: z.string().optional(),
    description: z.string().min(1, 'Descrição obrigatória'),
    quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que 0'),
    unitPrice: z.coerce.number().min(0, 'Preço inválido'),
    discount: z.coerce.number().optional(),
    employeeId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemType === 'PART' && !data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione um produto',
        path: ['productId'],
      });
    }
  });

interface ServiceOrderItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderStatus?: string;
  itemToEdit?: ServiceOrderItem | null;
}

export function ServiceOrderItemDialog({
  open,
  onOpenChange,
  orderId,
  orderStatus,
  itemToEdit,
}: ServiceOrderItemDialogProps) {
  const [activeTab, setActiveTab] = useState<'PART' | 'SERVICE'>('PART');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickServiceOpen, setQuickServiceOpen] = useState(false);
  const [quickServiceName, setQuickServiceName] = useState('');
  const [quickServicePrice, setQuickServicePrice] = useState('');

  const { addItem, updateItem } = useServiceOrderItems(orderId);
  const { services, isLoading: isLoadingServices, createService } = useServices();
  const { employees, isLoading: isLoadingEmployees } = useEmployees();

  // Busca de produtos
  const { data: products, isLoading: isLoadingProducts } = useProducts({
    search: searchQuery,
    isActive: true,
  });

  // Helper function for stock badge
  const getStockBadge = (product: Product) => {
    if (product.currentStock <= 0) {
      return (
        <Badge variant="destructive" className="text-[10px] px-1 py-0">
          🔴 Esgotado
        </Badge>
      );
    }
    if (product.currentStock <= 2) {
      return (
        <Badge variant="destructive" className="text-[10px] px-1 py-0">
          🔴 Crítico
        </Badge>
      );
    }
    if (product.currentStock <= product.minStock) {
      return (
        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-yellow-100 text-yellow-800">
          🟡 Baixo
        </Badge>
      );
    }
    return null;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemType: 'PART',
      quantity: 1,
      unitPrice: 0,
    },
  });

  // Preencher formulário ao editar
  useEffect(() => {
    if (open && itemToEdit) {
      form.reset({
        itemType: itemToEdit.item_type,
        productId: itemToEdit.product_id || undefined,
        description: itemToEdit.description,
        quantity: itemToEdit.quantity,
        unitPrice: itemToEdit.unit_price,
        discount: itemToEdit.discount || undefined,
        employeeId: itemToEdit.employee_id || undefined,
      });
      setActiveTab(itemToEdit.item_type);
      // Se for produto, idealmente buscaríamos os dados dele, mas por enquanto:
      if (itemToEdit.item_type === 'PART' && itemToEdit.product_id) {
        // Mas o diálogo busca produtos pelo nome/código na lista
        // Para edição, talvez seja melhor só permitir alterar quantidade/preço
        setSearchQuery(''); // Limpar busca
      }
    } else if (open && !itemToEdit) {
      resetForm();
    }
  }, [open, itemToEdit, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validar estoque para peças
    if (values.itemType === 'PART' && selectedProduct) {
      if (values.quantity > selectedProduct.currentStock) {
        if (orderStatus !== 'QUOTE') {
          toast.error(`Estoque insuficiente. Disponível: ${selectedProduct.currentStock}`);
          return;
        } else {
          // Apenas avisa para orçamentos
          toast.warning(
            `Estoque insuficiente (${selectedProduct.currentStock}). Este item ficará marcado com aviso.`
          );
        }
      }
    }

    try {
      if (itemToEdit) {
        await updateItem.mutateAsync({
          itemId: itemToEdit.id,
          quantity: values.quantity,
          unitPrice: values.unitPrice,
          discount: values.discount,
          notes: undefined, // Notes not in form yet
          employeeId: values.employeeId,
        });
        toast.success('Item atualizado com sucesso!');
      } else {
        await addItem.mutateAsync({
          order_id: orderId,
          product_id: values.productId,
          item_type: values.itemType,
          description: values.description,
          quantity: values.quantity,
          unit_price: values.unitPrice,
          discount: values.discount,
          employee_id: values.employeeId,
        });
        toast.success('Item adicionado com sucesso!');
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar item.');
    }
  };

  const resetForm = () => {
    form.reset({
      itemType: 'PART',
      quantity: 1,
      unitPrice: 0,
    });
    setSearchQuery('');
    setSelectedProduct(null);
    setActiveTab('PART');
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    form.setValue('productId', product.id);
    form.setValue('description', product.name);
    form.setValue('unitPrice', product.salePrice);
    form.setValue('itemType', 'PART');
    setSearchQuery('');
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services?.find((s) => s.id === serviceId);
    if (service) {
      form.setValue('description', service.name);
      form.setValue('unitPrice', service.default_price);
      form.setValue('itemType', 'SERVICE');
    }
  };

  const handleQuickServiceSubmit = async () => {
    if (!quickServiceName.trim()) {
      toast.error('Nome do serviço é obrigatório');
      return;
    }
    try {
      const newService = await createService.mutateAsync({
        code: `SRV-${Date.now()}`,
        name: quickServiceName.trim(),
        default_price: parseFloat(quickServicePrice) || 0,
      });
      handleServiceSelect(newService.id);
      setQuickServiceOpen(false);
      setQuickServiceName('');
      setQuickServicePrice('');
      toast.success('Serviço cadastrado!');
    } catch (error) {
      toast.error('Erro ao cadastrar serviço');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                const tab = val as 'PART' | 'SERVICE';
                setActiveTab(tab);
                form.setValue('itemType', tab);
                if (tab === 'SERVICE') {
                  setSelectedProduct(null);
                  form.setValue('productId', undefined);
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PART">Peça / Produto</TabsTrigger>
                <TabsTrigger value="SERVICE">Serviço / Mão de Obra</TabsTrigger>
              </TabsList>

              {/* ABA PEÇAS */}
              <TabsContent value="PART" className="space-y-4">
                {!selectedProduct ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar produto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                        autoFocus
                      />
                    </div>

                    {/* Resultados da busca */}
                    {searchQuery.length > 0 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {isLoadingProducts ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : !products || products.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            Nenhum produto encontrado
                          </div>
                        ) : (
                          <>
                            {products.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() =>
                                  product.currentStock > 0 && handleProductSelect(product)
                                }
                                disabled={product.currentStock <= 0}
                                className={cn(
                                  'w-full text-left p-2 text-sm border-b last:border-0 transition-colors',
                                  product.currentStock <= 0
                                    ? 'opacity-50 cursor-not-allowed bg-muted/50'
                                    : 'hover:bg-muted cursor-pointer'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{product.name}</span>
                                  {getStockBadge(product)}
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs mt-1">
                                  <span>Estoque: {product.currentStock}</span>
                                  <span className="font-mono">
                                    {formatCurrency(product.salePrice)}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    {form.formState.errors.productId && (
                      <p className="text-sm font-medium text-destructive mt-2">
                        {form.formState.errors.productId.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-md p-3 bg-muted/50 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-6 w-6 p-0"
                      onClick={() => {
                        setSelectedProduct(null);
                        form.setValue('productId', undefined);
                      }}
                    >
                      <span className="sr-only">Remover</span>
                      &times;
                    </Button>
                    <div className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {selectedProduct.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(selectedProduct.salePrice)}
                    </div>
                    {selectedProduct.currentStock <= 0 && (
                      <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        Sem estoque
                      </div>
                    )}
                    {selectedProduct.currentStock > 0 &&
                      form.watch('quantity') > selectedProduct.currentStock && (
                        <div className="flex items-center gap-1 text-amber-600 text-xs mt-1 bg-amber-50 p-1 rounded border border-amber-100">
                          <AlertTriangle className="h-3 w-3" />
                          Quantidade solicitada maior que o estoque disponível.
                        </div>
                      )}
                  </div>
                )}
              </TabsContent>

              {/* ABA SERVIÇOS */}
              <TabsContent value="SERVICE" className="space-y-4">
                {isLoadingServices ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      {services?.map((service) => (
                        <Button
                          key={service.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleServiceSelect(service.id)}
                          className={cn(
                            form.getValues('description') === service.name &&
                              'border-primary bg-primary/5'
                          )}
                        >
                          {service.name}
                        </Button>
                      ))}
                      {/* Quick Service Registration */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 border-dashed border-primary text-primary hover:bg-primary/10"
                        onClick={() => setQuickServiceOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Novo Serviço
                      </Button>
                    </div>

                    {/* Quick Service Inline Form */}
                    {quickServiceOpen && (
                      <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                        <div className="text-sm font-medium">Cadastrar Novo Serviço</div>
                        <Input
                          placeholder="Nome do serviço"
                          value={quickServiceName}
                          onChange={(e) => setQuickServiceName(e.target.value)}
                          autoFocus
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Preço padrão"
                          value={quickServicePrice}
                          onChange={(e) => setQuickServicePrice(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleQuickServiceSubmit}
                            disabled={createService.isPending}
                          >
                            {createService.isPending && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            Salvar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setQuickServiceOpen(false);
                              setQuickServiceName('');
                              setQuickServicePrice('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Seviço</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Troca de óleo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Campos Comuns (Qtd, Preço) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Unitário</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desconto (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mecânico / Responsável (Comissão)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addItem.isPending || updateItem.isPending}>
                {(addItem.isPending || updateItem.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {itemToEdit ? 'Salvar Alterações' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
