/**
 * @file StockAdjustModal - Modal para ajuste de estoque
 * @description Permite adicionar ou subtrair quantidade do estoque
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { useAdjustStock } from '@/hooks/useStock';
import { Minus, Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface StockAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    currentStock: number;
    internalCode?: string;
  } | null;
}

type AdjustMode = 'add' | 'subtract' | 'set';

const ADJUSTMENT_REASONS = [
  { value: 'inventory', label: 'Inventário/Contagem' },
  { value: 'damage', label: 'Avaria/Perda' },
  { value: 'correction', label: 'Correção de Erro' },
  { value: 'return', label: 'Devolução' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'other', label: 'Outro' },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const adjustSchema = z.object({
  quantity: z.number().min(0, 'Quantidade deve ser positiva'),
  reason: z.string().min(1, 'Selecione um motivo'),
  notes: z.string().optional(),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function StockAdjustModal({ open, onOpenChange, product }: StockAdjustModalProps) {
  const [mode, setMode] = useState<AdjustMode>('set');
  const adjustStock = useAdjustStock();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      quantity: 0,
      reason: '',
      notes: '',
    },
  });

  const quantity = watch('quantity') || 0;

  // Reset form when modal opens
  useEffect(() => {
    if (open && product) {
      reset({
        quantity: mode === 'set' ? product.currentStock : 0,
        reason: '',
        notes: '',
      });
    }
  }, [open, product, reset, mode]);

  // Calculate final quantity based on mode
  const calculateFinalQuantity = (): number => {
    if (!product) return 0;
    switch (mode) {
      case 'add':
        return product.currentStock + quantity;
      case 'subtract':
        return Math.max(0, product.currentStock - quantity);
      case 'set':
        return quantity;
      default:
        return quantity;
    }
  };

  const finalQuantity = calculateFinalQuantity();
  const difference = finalQuantity - (product?.currentStock || 0);

  const onSubmit = async (data: AdjustFormData) => {
    if (!product) return;

    const reasonLabel =
      ADJUSTMENT_REASONS.find((r) => r.value === data.reason)?.label || data.reason;
    const fullReason = data.notes ? `${reasonLabel}: ${data.notes}` : reasonLabel;

    await adjustStock.mutateAsync({
      productId: product.id,
      newQuantity: finalQuantity,
      reason: fullReason,
    });

    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ajustar Estoque
          </DialogTitle>
          <DialogDescription>
            {product.name}
            {product.internalCode && (
              <span className="text-muted-foreground"> • {product.internalCode}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current Stock Display */}
          <div className="rounded-lg bg-muted p-4">
            <div className="text-sm text-muted-foreground">Estoque Atual</div>
            <div className="text-3xl font-bold">{product.currentStock}</div>
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={mode === 'add' ? 'default' : 'outline'}
              onClick={() => {
                setMode('add');
                setValue('quantity', 0);
              }}
              className={cn(mode === 'add' && 'bg-green-600 hover:bg-green-700')}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
            <Button
              type="button"
              variant={mode === 'subtract' ? 'default' : 'outline'}
              onClick={() => {
                setMode('subtract');
                setValue('quantity', 0);
              }}
              className={cn(mode === 'subtract' && 'bg-red-600 hover:bg-red-700')}
            >
              <Minus className="mr-1 h-4 w-4" />
              Subtrair
            </Button>
            <Button
              type="button"
              variant={mode === 'set' ? 'default' : 'outline'}
              onClick={() => {
                setMode('set');
                setValue('quantity', product.currentStock);
              }}
            >
              <Package className="mr-1 h-4 w-4" />
              Definir
            </Button>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              {mode === 'add' && 'Quantidade a adicionar'}
              {mode === 'subtract' && 'Quantidade a subtrair'}
              {mode === 'set' && 'Nova quantidade'}
            </Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              {...register('quantity', { valueAsNumber: true })}
              className="text-lg font-semibold"
              autoFocus
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Novo estoque:</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{finalQuantity}</span>
                {difference !== 0 && (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      difference > 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    ({difference > 0 ? '+' : ''}
                    {difference})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Select value={watch('reason')} onValueChange={(value) => setValue('reason', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Detalhes adicionais sobre o ajuste..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || difference === 0}
              className={cn(
                difference > 0 && 'bg-green-600 hover:bg-green-700',
                difference < 0 && 'bg-red-600 hover:bg-red-700'
              )}
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
