import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useProducts } from '@/hooks/use-products';
import { useServiceOrderItems, useServices } from '@/hooks/useServiceOrders';
import { cn, formatCurrency } from '@/lib/utils';
import { Product } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, Package, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
}

export function ServiceOrderItemDialog({
  open,
  onOpenChange,
  orderId,
}: ServiceOrderItemDialogProps) {
  const [activeTab, setActiveTab] = useState<'PART' | 'SERVICE'>('PART');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { addItem } = useServiceOrderItems(orderId);
  const { services, isLoading: isLoadingServices } = useServices();

  // Busca de produtos
  const { data: products, isLoading: isLoadingProducts } = useProducts({
    search: searchQuery,
    isActive: true,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemType: 'PART',
      quantity: 1,
      unitPrice: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
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

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error(error);
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
          <DialogTitle>Adicionar Item</DialogTitle>
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
                          products.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleProductSelect(product)}
                              className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-0"
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="flex justify-between text-muted-foreground text-xs">
                                <span
                                  className={cn(
                                    product.currentStock <= 0
                                      ? 'text-destructive font-bold'
                                      : product.currentStock <= product.minStock
                                      ? 'text-warning font-medium'
                                      : ''
                                  )}
                                >
                                  Estoque: {product.currentStock}
                                  {product.currentStock <= 0
                                    ? ' (Esgotado)'
                                    : product.currentStock <= product.minStock
                                    ? ' (Baixo)'
                                    : ''}
                                </span>
                                <span className="font-mono">
                                  {formatCurrency(product.salePrice)}
                                </span>
                              </div>
                            </button>
                          ))
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
                      {/* TODO: Implementar QuickServiceDialog */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground dashed border"
                        onClick={() => {
                          // Focus description to type manual service
                          form.setFocus('description');
                          form.setValue('itemType', 'SERVICE');
                          form.setValue('productId', undefined); // Ensure product is cleared
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Outro
                      </Button>
                    </div>

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

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addItem.isPending}>
                {addItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
