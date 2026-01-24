/**
 * ProductForm Component
 * Form for quick product registration
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Barcode, Box, DollarSign, Package, Save, Tag, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { PRODUCT_UNITS } from '@/lib/constants';
import type { Category } from '@/types/product';

// Validation schema
const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').min(3, 'Nome muito curto'),
  barcode: z.string().min(1, 'Código de barras é obrigatório'),
  salePrice: z.string().min(1, 'Preço de venda é obrigatório'),
  costPrice: z.string().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  categoryId: z.string().optional(),
  minStock: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialBarcode?: string;
  categories?: Category[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductForm({
  initialBarcode = '',
  categories = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) {
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema as any),
    defaultValues: {
      name: '',
      barcode: initialBarcode,
      salePrice: '',
      costPrice: '',
      unit: 'un',
      categoryId: '',
      minStock: '0',
    },
  });

  const selectedUnit = watch('unit');
  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const onFormSubmit = async (data: ProductFormData) => {
    try {
      const parsedData = {
        name: data.name,
        barcode: data.barcode,
        salePrice: parseFloat(data.salePrice.replace(',', '.')),
        costPrice: data.costPrice ? parseFloat(data.costPrice.replace(',', '.')) : 0,
        unit: data.unit,
        categoryId: data.categoryId || null,
        minStock: data.minStock ? parseFloat(data.minStock) : 0,
      };
      await onSubmit(parsedData);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível cadastrar o produto',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Icon */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center">
            <Package size={32} className="text-primary" />
          </View>
          <Text className="text-xl font-bold text-foreground mt-3">Cadastro Rápido</Text>
          <Text className="text-muted-foreground text-center">Preencha os dados do produto</Text>
        </View>

        {/* Form Fields */}
        <View className="gap-4">
          {/* Barcode */}
          <Controller
            control={control}
            name="barcode"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Código de Barras *"
                placeholder="0000000000000"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.barcode?.message}
                leftIcon={<Barcode size={18} className="text-muted-foreground" />}
                keyboardType="numeric"
                editable={!initialBarcode}
              />
            )}
          />

          {/* Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome do Produto *"
                placeholder="Ex: Coca-Cola 2L"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                leftIcon={<Tag size={18} className="text-muted-foreground" />}
                autoCapitalize="words"
              />
            )}
          />

          {/* Price Row */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Controller
                control={control}
                name="salePrice"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Preço Venda *"
                    placeholder="0,00"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.salePrice?.message}
                    leftIcon={<DollarSign size={18} className="text-muted-foreground" />}
                    keyboardType="decimal-pad"
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="costPrice"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Preço Custo"
                    placeholder="0,00"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    leftIcon={<DollarSign size={18} className="text-muted-foreground" />}
                    keyboardType="decimal-pad"
                  />
                )}
              />
            </View>
          </View>

          {/* Unit Selector */}
          <View>
            <Text className="text-sm font-medium text-foreground mb-2">Unidade *</Text>
            <Pressable
              onPress={() => setShowUnitPicker(true)}
              className="flex-row items-center p-4 border border-border rounded-lg bg-card"
            >
              <Box size={18} className="text-muted-foreground mr-3" />
              <Text className="flex-1 text-foreground">
                {PRODUCT_UNITS.find((u) => u.value === selectedUnit)?.label || 'Selecionar'}
              </Text>
            </Pressable>
          </View>

          {/* Category Selector */}
          {categories.length > 0 && (
            <View>
              <Text className="text-sm font-medium text-foreground mb-2">Categoria</Text>
              <Pressable
                onPress={() => setShowCategoryPicker(true)}
                className="flex-row items-center p-4 border border-border rounded-lg bg-card"
              >
                <Tag size={18} className="text-muted-foreground mr-3" />
                <Text
                  className={`flex-1 ${
                    selectedCategory ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {selectedCategory?.name || 'Selecionar categoria'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Min Stock */}
          <Controller
            control={control}
            name="minStock"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Estoque Mínimo"
                placeholder="0"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                leftIcon={<Package size={18} className="text-muted-foreground" />}
                keyboardType="numeric"
              />
            )}
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-4 mt-8">
          <Button variant="outline" className="flex-1" onPress={onCancel} disabled={isLoading}>
            <X size={18} className="mr-2" />
            <Text>Cancelar</Text>
          </Button>
          <Button className="flex-1" onPress={handleSubmit(onFormSubmit)} disabled={isLoading}>
            {isLoading ? (
              <Loading size="small" color="white" />
            ) : (
              <>
                <Save size={18} className="mr-2 text-primary-foreground" />
                <Text className="text-primary-foreground">Salvar</Text>
              </>
            )}
          </Button>
        </View>

        {/* Unit Picker Modal */}
        <Modal
          visible={showUnitPicker}
          onClose={() => setShowUnitPicker(false)}
          title="Selecionar Unidade"
        >
          <ScrollView className="max-h-80">
            {PRODUCT_UNITS.map((unit) => (
              <Pressable
                key={unit.value}
                onPress={() => {
                  setValue('unit', unit.value);
                  setShowUnitPicker(false);
                }}
                className={`p-4 border-b border-border ${
                  selectedUnit === unit.value ? 'bg-primary/10' : ''
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedUnit === unit.value ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {unit.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Modal>

        {/* Category Picker Modal */}
        <Modal
          visible={showCategoryPicker}
          onClose={() => setShowCategoryPicker(false)}
          title="Selecionar Categoria"
        >
          <ScrollView className="max-h-80">
            <Pressable
              onPress={() => {
                setValue('categoryId', '');
                setShowCategoryPicker(false);
              }}
              className={`p-4 border-b border-border ${!selectedCategoryId ? 'bg-primary/10' : ''}`}
            >
              <Text
                className={`font-medium ${
                  !selectedCategoryId ? 'text-primary' : 'text-foreground'
                }`}
              >
                Sem categoria
              </Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => {
                  setValue('categoryId', category.id);
                  setShowCategoryPicker(false);
                }}
                className={`p-4 border-b border-border ${
                  selectedCategoryId === category.id ? 'bg-primary/10' : ''
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedCategoryId === category.id ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
