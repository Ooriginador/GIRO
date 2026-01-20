/**
 * @file StockEntryPage - Entrada de estoque
 * @description Formulário para registrar entrada de produtos
 */

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProductSearch } from '@/hooks';
import { useAddStockEntry } from '@/hooks/useStock';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, CalendarIcon, PackagePlus, Save, Search } from 'lucide-react';
import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const entrySchema = z.object({
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  costPrice: z.number().min(0, 'Custo não pode ser negativo'),
  lotNumber: z.string().optional(),
  expirationDate: z.date().optional(),
  manufacturingDate: z.date().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const StockEntryPage: FC = () => {
  const navigate = useNavigate();
  // searchParams not currently used

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: searchResults = [] } = useProductSearch(searchQuery);
  const addEntry = useAddStockEntry();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      quantity: 1,
      costPrice: 0,
    },
  });

  const expirationDate = watch('expirationDate');

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setValue('costPrice', product.costPrice);
  };

  const onSubmit = async (data: EntryFormData) => {
    if (!selectedProduct) return;

    await addEntry.mutateAsync({
      productId: selectedProduct.id,
      quantity: data.quantity,
      costPrice: data.costPrice,
      lotNumber: data.lotNumber,
      expirationDate: data.expirationDate?.toISOString(),
      manufacturingDate: data.manufacturingDate?.toISOString(),
    });

    navigate('/stock');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entrada de Estoque</h1>
          <p className="text-muted-foreground">Registre a entrada de produtos no estoque</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Seleção de Produto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Selecionar Produto
            </CardTitle>
            <CardDescription>Busque o produto que está dando entrada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Buscar por nome ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Resultados */}
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-accent"
                      onClick={() => handleProductSelect(product)}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.internalCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(product.salePrice)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Estoque: {product.currentStock}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Produto Selecionado */}
            {selectedProduct && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedProduct.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedProduct.internalCode}
                      {selectedProduct.barcode && ` • ${selectedProduct.barcode}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatCurrency(selectedProduct.salePrice)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Estoque atual: {selectedProduct.currentStock}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário de Entrada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5" />
              Dados da Entrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Quantidade */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                  error={!!errors.quantity}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity.message}</p>
                )}
              </div>

              {/* Custo Unitário */}
              <div className="space-y-2">
                <Label htmlFor="costPrice">Custo Unitário</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    className="pl-10"
                    {...register('costPrice', { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Lote */}
              <div className="space-y-2">
                <Label htmlFor="lotNumber">Número do Lote</Label>
                <Input id="lotNumber" placeholder="Ex: LOT-2026-001" {...register('lotNumber')} />
              </div>

              {/* Datas */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Data de Fabricação */}
                <div className="space-y-2">
                  <Label>Data de Fabricação</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !watch('manufacturingDate') && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watch('manufacturingDate')
                          ? format(watch('manufacturingDate')!, 'PPP', { locale: ptBR })
                          : 'Selecionar data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={watch('manufacturingDate')}
                        onSelect={(date) => setValue('manufacturingDate', date || undefined)}
                        initialFocus
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data de Validade */}
                <div className="space-y-2">
                  <Label>Data de Validade</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !expirationDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expirationDate
                          ? format(expirationDate, 'PPP', { locale: ptBR })
                          : 'Selecionar data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expirationDate}
                        onSelect={(date) => setValue('expirationDate', date || undefined)}
                        initialFocus
                        disabled={(date) => date < (watch('manufacturingDate') || new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!selectedProduct || isSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Registrar Entrada
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
