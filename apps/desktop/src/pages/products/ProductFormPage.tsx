/**
 * @file ProductFormPage - Cadastro/Edição de produto
 * @description Formulário completo para criar ou editar produto
 */

import { PriceHistoryCard } from '@/components/shared/PriceHistoryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateProduct, useProduct, useUpdateProduct } from '@/hooks/use-products';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { calculateMargin, formatCurrency } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, BarChart3, DollarSign, Package, Save } from 'lucide-react';
import { type FC, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  salePrice: z.number().positive('Preço deve ser maior que zero'),
  costPrice: z.number().min(0, 'Custo não pode ser negativo').optional(),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  isWeighted: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductFormPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const { data: product, isLoading: isLoadingProduct } = useProduct(id);
  const { data: categories, isLoading: isLoadingCategories } = useCategories();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unit: 'UNIT',
      minStock: 0,
      isWeighted: false,
    },
  });

  // Load product data when editing
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        barcode: product.barcode || '',
        categoryId: product.categoryId,
        unit: product.unit,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        minStock: product.minStock,
        maxStock: product.maxStock ?? undefined,
        isWeighted: product.isWeighted,
      });
    }
  }, [product, reset]);

  const salePrice = watch('salePrice') || 0;
  const costPrice = watch('costPrice') || 0;
  const margin = calculateMargin(salePrice, costPrice);
  const isWeighted = watch('isWeighted');

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEditing && id) {
        await updateProduct.mutateAsync({
          id,
          ...data,
          unit: data.unit as any,
        });
        toast({
          title: 'Produto atualizado',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        await createProduct.mutateAsync({
          ...data,
          costPrice: data.costPrice ?? 0,
          unit: data.unit as any,
        });
        toast({
          title: 'Produto criado',
          description: 'O produto foi cadastrado com sucesso.',
        });
      }
      navigate('/products');
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o produto.',
        variant: 'destructive',
      });
    }
  };

  if (isEditing && isLoadingProduct) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Altere as informações do produto' : 'Cadastre um novo produto no sistema'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Ex: Arroz Tio João 5kg"
                    aria-invalid={!!errors.name}
                    autoComplete="off"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input id="barcode" {...register('barcode')} placeholder="Ex: 7891234567890" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Categoria *</Label>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={isLoadingCategories ? 'Carregando...' : 'Selecione...'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoryId && (
                    <p className="text-sm text-destructive">{errors.categoryId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade *</Label>
                  <Controller
                    name="unit"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNIT">Unidade (un)</SelectItem>
                          <SelectItem value="KILOGRAM">Quilograma (kg)</SelectItem>
                          <SelectItem value="GRAM">Grama (g)</SelectItem>
                          <SelectItem value="LITER">Litro (L)</SelectItem>
                          <SelectItem value="MILLILITER">Mililitro (ml)</SelectItem>
                          <SelectItem value="METER">Metro (m)</SelectItem>
                          <SelectItem value="BOX">Caixa (cx)</SelectItem>
                          <SelectItem value="PACK">Pacote (pct)</SelectItem>
                          <SelectItem value="DOZEN">Dúzia (dz)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Controller
                  name="isWeighted"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="isWeighted"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isWeighted">Produto pesável (balança)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Preços */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Preços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      {...register('salePrice', { valueAsNumber: true })}
                      placeholder="0,00"
                    />
                  </div>
                  {errors.salePrice && (
                    <p className="text-sm text-destructive">{errors.salePrice.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPrice">Preço de Custo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      {...register('costPrice', { valueAsNumber: true })}
                      placeholder="0,00"
                    />
                  </div>
                  {errors.costPrice && (
                    <p className="text-sm text-destructive">{errors.costPrice.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="font-medium">{formatCurrency(salePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço de Custo</span>
                <span className="font-medium">{formatCurrency(costPrice)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem de Lucro</span>
                <span className={`font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
              {isWeighted && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Produto pesável - será solicitada a quantidade na balança no PDV
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estoque */}
          <Card>
            <CardHeader>
              <CardTitle>Controle de Estoque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minStock">Estoque Mínimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  {...register('minStock', { valueAsNumber: true })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Alerta será gerado quando o estoque estiver abaixo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStock">Estoque Máximo</Label>
                <Input
                  id="maxStock"
                  type="number"
                  min="0"
                  {...register('maxStock', { valueAsNumber: true })}
                  placeholder="Opcional"
                />
                <p className="text-xs text-muted-foreground">
                  Sugestão de compra quando o estoque estiver baixo
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
            </Button>
            <Button variant="outline" type="button" asChild>
              <Link to="/products">Cancelar</Link>
            </Button>
          </div>

          {/* Histórico de Preços (apenas em edição) */}
          {isEditing && id && <PriceHistoryCard productId={id} />}
        </div>
      </form>
    </div>
  );
};
