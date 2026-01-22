/**
 * 📝 WarrantyForm - Formulário de Abertura de Garantia
 *
 * Permite registrar uma nova garantia vinculada a um cliente e produto.
 */

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  CreateWarrantyClaimInput,
  useWarranties,
  type WarrantySourceType,
} from '@/hooks/useWarranties';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoke } from '@tauri-apps/api/core';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CustomerSearch } from './CustomerSearch';

// Schema de validação
const formSchema = z.object({
  customer_id: z.string().min(1, 'Cliente é obrigatório'),
  source_type: z.enum(['SALE', 'SERVICE_ORDER']),
  product_id: z.string().min(1, 'Produto é obrigatório'),
  origin_id: z.string().optional(),
  description: z.string().optional(),
  reason: z.string().min(5, 'Motivo é obrigatório e deve ser detalhado'),
});

interface WarrantyFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface ProductSummary {
  id: string;
  name: string;
  barcode?: string;
}

export function WarrantyForm({ onCancel, onSuccess }: WarrantyFormProps) {
  const { createWarranty } = useWarranties();
  const { toast } = useToast();
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [foundProducts, setFoundProducts] = useState<ProductSummary[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source_type: 'SALE',
      description: '',
      reason: '',
    },
  });

  // Busca de produtos (Simples)
  const searchProducts = async (term: string) => {
    if (term.length < 3) return;
    setIsSearchingProduct(true);
    try {
      // Usando comando existente de produtos
      // Nota: Assumindo que 'search_products' existe e retorna lista compatível
      const result = await invoke<ProductSummary[]>('search_products', { query: term });
      setFoundProducts(result || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', (error as Error)?.message ?? String(error));
    } finally {
      setIsSearchingProduct(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const input: CreateWarrantyClaimInput = {
        customer_id: values.customer_id,
        source_type: values.source_type as WarrantySourceType,
        product_id: values.product_id,
        description: values.description || '',
        reason: values.reason,
        sale_item_id: values.source_type === 'SALE' ? values.origin_id : undefined,
        order_item_id: values.source_type === 'SERVICE_ORDER' ? values.origin_id : undefined,
      };

      await createWarranty.mutateAsync(input);

      toast({
        title: 'Garantia Aberta',
        description: 'A solicitação de garantia foi registrada com sucesso.',
      });
      onSuccess();
    } catch (error) {
      console.error('Erro ao registrar garantia:', (error as Error)?.message ?? String(error));
      toast({
        title: 'Erro ao registrar',
        description: 'Não foi possível abrir a garantia. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Solicitação de Garantia</CardTitle>
        <CardDescription>
          Preencha os dados abaixo para iniciar o processo de garantia.
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Cliente */}
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cliente</FormLabel>
                  <CustomerSearch
                    onSelect={(customer) => {
                      if (!customer) return;
                      field.onChange(customer.id);
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Origem */}
              <FormField
                control={form.control}
                name="source_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem da Compra</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SALE">Venda Direta (Balcão)</SelectItem>
                        <SelectItem value="SERVICE_ORDER">Ordem de Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Origem ID */}
              <FormField
                control={form.control}
                name="origin_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Origem (Venda/OS)</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Produto */}
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Produto</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedProduct ? selectedProduct.name : 'Buscar produto...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome ou código..."
                            onValueChange={(val) => {
                              searchProducts(val);
                            }}
                          />
                          <CommandList>
                            {isSearchingProduct && (
                              <div className="py-2 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                Buscando...
                              </div>
                            )}
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            <CommandGroup>
                              {foundProducts.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.id} // Hack: value precisa ser string
                                  onSelect={() => {
                                    setSelectedProduct(product);
                                    form.setValue('product_id', product.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      product.id === field.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{product.name}</span>
                                    {product.barcode && (
                                      <span className="text-xs text-muted-foreground">
                                        {product.barcode}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Busque o produto pelo nome ou código de barras.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Motivo */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo / Defeito</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Produto parou de funcionar, peça quebrada..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição Detalhada */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais sobre o problema, condições de uso, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createWarranty.isPending}>
              {createWarranty.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Garantia
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
