/**
 * @file CartItemRow - Linha de item no carrinho
 * @description Exibe um item com controles de quantidade
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, formatQuantity } from '@/lib/utils';
import { usePDVStore, type CartItem } from '@/stores/pdv-store';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { type FC } from 'react';

interface CartItemRowProps {
  item: CartItem;
  index: number;
}

export const CartItemRow: FC<CartItemRowProps> = ({ item, index }) => {
  const { updateQuantity, removeItem } = usePDVStore();

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
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3',
        'transition-colors hover:bg-accent/50'
      )}
    >
      {/* Número do item */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {index}
      </div>

      {/* Info do produto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.productName}</span>
          {item.barcode && (
            <Badge variant="outline" className="text-xs shrink-0">
              {item.barcode}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatCurrency(item.unitPrice)}</span>
          <span>×</span>
          <span>{formatQuantity(item.quantity, item.unit)}</span>
          {item.discount > 0 && (
            <span className="text-destructive">(-{formatCurrency(item.discount)})</span>
          )}
        </div>
      </div>

      {/* Controles de quantidade */}
      <div className="flex items-center gap-1" data-tutorial="cart-item-quantity">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleDecrement}
          disabled={item.quantity <= 1 || item.isWeighted}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-lg font-medium">
          {item.isWeighted ? item.quantity.toFixed(3) : item.quantity}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleIncrement}
          disabled={item.isWeighted}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Total e remover */}
      <div className="flex items-center gap-3">
        <span className="text-money text-lg font-bold w-24 text-right">
          {formatCurrency(itemTotal)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleRemove}
          data-tutorial="cart-item-remove"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
