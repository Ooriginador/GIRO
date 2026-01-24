/**
 * @file CategoryForm - Formulário de categoria
 * @description Componente reutilizável para criar e editar categorias
 */

import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY_COLORS, useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderTree, Palette, Save, X } from 'lucide-react';
import { useEffect, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório').max(50, 'Nome muito longo'),
  description: z.string().max(200, 'Descrição muito longa').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida')
    .default('#6b7280'),
  parentId: z.string().optional().nullable(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: Category | null;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CategoryForm: FC<CategoryFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  // Buscar todas as categorias para permitir selecionar o pai (exceto ela mesma)
  const { data: allCategories = [] } = useCategories();
  const availableParents = allCategories.filter((c) => c.id !== initialData?.id);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: CATEGORY_COLORS[0]!.value,
      parentId: null,
    },
  });

  // Resetar formulário quando os dados iniciais mudarem
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || '',
        color: initialData.color || CATEGORY_COLORS[0]!.value,
        parentId: initialData.parentId || null,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        color: CATEGORY_COLORS[0]!.value,
        parentId: null,
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (data: CategoryFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        {/* Nome */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Categoria *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Bebidas, Mercearia, Limpeza..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Breve descrição sobre o que esta categoria agrupa"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Categoria Pai (Sub-categorias) */}
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Categoria Pai (Sub-categoria)
                </FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                  value={field.value || 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma (Principal)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (Categoria Principal)</SelectItem>
                    {availableParents.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Útil para organizar marcas ou sub-grupos.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cor Visual */}
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Cor de Identificação
                </FormLabel>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn(
                        'h-7 w-7 rounded-full transition-all hover:scale-110 shadow-sm border border-black/5',
                        field.value === color.value
                          ? 'ring-2 ring-primary ring-offset-2 scale-105'
                          : 'opacity-80 hover:opacity-100'
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => field.onChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Rodapé de Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Salvando...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {initialData ? 'Salvar Alterações' : 'Criar Categoria'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
