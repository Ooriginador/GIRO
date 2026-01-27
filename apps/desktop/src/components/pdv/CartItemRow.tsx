/**
 * @file CartItemRow - Linha de item no carrinho
 * @description Exibe um item com controles de quantidade
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, formatQuantity } from '@/lib/utils';
import { usePDVStore, type CartItem } from '@/stores/pdv-store';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { type FC, useState } from 'react';

interface CartItemRowProps {
  item: CartItem;
  index: number;
}

export const CartItemRow: FC<CartItemRowProps> = ({ item, index }) => {
  const { updateQuantity, removeItem } = usePDVStore();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const itemTotal = item.quantity * item.unitPrice - item.discount;

  const handleIncrement = () => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    removeItem(item.id);
    setShowRemoveConfirm(false);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3',
        'transition-colors hover:bg-accent/50'
      )}
      role="listitem"
      aria-label={`Item ${index}: ${item.productName}, ${formatQuantity(
        item.quantity,
        item.unit
      )} por ${formatCurrency(item.unitPrice)}, total ${formatCurrency(itemTotal)}`}
    >
      {/* Número do item */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium"
        aria-hidden="true"
      >
        {index}
      </div>

      {/* Info do produto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.productName}</span>
          {item.barcode && (
            <Badge
              variant="outline"
              className="text-xs shrink-0"
              aria-label={`Código: ${item.barcode}`}
            >
              {item.barcode}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatCurrency(item.unitPrice)}</span>
          <span aria-hidden="true">×</span>
          <span>{formatQuantity(item.quantity, item.unit)}</span>
          {item.discount > 0 && (
            <span className="text-destructive" role="status">
              (-{formatCurrency(item.discount)})
            </span>
          )}
        </div>
      </div>

      {/* Controles de quantidade */}
      <div
        className="flex items-center gap-1"
        data-tutorial="cart-item-quantity"
        role="group"
        aria-label={`Quantidade de ${item.productName}`}
      >
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleDecrement}
          disabled={item.quantity <= 1 || item.isWeighted}
          aria-label={`Diminuir quantidade de ${item.productName}`}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="w-12 text-center text-lg font-medium" aria-live="polite">
          {item.isWeighted ? item.quantity.toFixed(3) : item.quantity}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleIncrement}
          disabled={item.isWeighted}
          aria-label={`Aumentar quantidade de ${item.productName}`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Total e remover */}
      <div className="flex items-center gap-3">
        <span
          className="text-money text-lg font-bold w-24 text-right"
          aria-label={`Total do item: ${formatCurrency(itemTotal)}`}
        >
          {formatCurrency(itemTotal)}
        </span>
        <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              data-tutorial="cart-item-remove"
              aria-label={`Remover ${item.productName} do carrinho`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover item?</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja remover <strong>{item.productName}</strong> (
                {formatQuantity(item.quantity, item.unit)}) do carrinho?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
