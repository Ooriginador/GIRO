/**
 * @file ProductCard.tsx - Componente de card de produto
 *
 * Duas variantes:
 * - compact: para grid do PDV (imagem, nome, preço, estoque)
 * - detailed: para listagem de produtos (todas as infos)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { clickableByKeyboard } from '@/lib/a11y';
import { Edit, Package, Plus, Scale, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  internalCode?: string;
  salePrice: number;
  costPrice?: number;
  currentStock: number;
  minStock: number;
  unit: string;
  isWeighted?: boolean;
  isActive?: boolean;
  imageUrl?: string;
}

interface ProductCardProps {
  product: Product;
  variant?: 'compact' | 'detailed';
  showStock?: boolean;
  showActions?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ProductCard({
  product,
  variant = 'compact',
  showStock = true,
  showActions = false,
  onSelect,
  onEdit,
  onDelete,
  className,
}: ProductCardProps) {
  const stockPercentage = Math.min(
    100,
    (product.currentStock / Math.max(1, product.minStock * 2)) * 100
  );
  const isLowStock = product.currentStock <= product.minStock;
  const isOutOfStock = product.currentStock <= 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (variant === 'compact') {
    return (
      <button
        onClick={onSelect}
        className={cn(
          'flex flex-col p-3 bg-card border rounded-lg hover:border-primary/50 hover:shadow-md',
          'transition-all duration-200 text-left w-full',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isOutOfStock && 'opacity-60',
          className
        )}
        disabled={isOutOfStock}
      >
        {/* Icon/Image */}
        <div className="flex items-center justify-center w-12 h-12 mb-2 bg-primary/10 rounded-lg mx-auto">
          {product.isWeighted ? (
            <Scale className="w-6 h-6 text-primary" />
          ) : (
            <Package className="w-6 h-6 text-primary" />
          )}
        </div>

        {/* Name */}
        <p className="font-medium text-sm line-clamp-2 text-center mb-1">{product.name}</p>

        {/* Price */}
        <p className="text-lg font-bold text-primary text-center font-mono">
          {formatCurrency(product.salePrice)}
          {product.isWeighted && (
            <span className="text-xs font-normal text-muted-foreground">/kg</span>
          )}
        </p>

        {/* Stock indicator */}
        {showStock && (
          <div className="mt-2 w-full">
            <Progress
              value={stockPercentage}
              className={cn(
                'h-1.5',
                isOutOfStock && '[&>div]:bg-destructive',
                isLowStock && !isOutOfStock && '[&>div]:bg-warning'
              )}
            />
            <p
              className={cn(
                'text-xs text-center mt-1',
                isOutOfStock
                  ? 'text-destructive'
                  : isLowStock
                  ? 'text-warning'
                  : 'text-muted-foreground'
              )}
            >
              {product.currentStock} {product.unit}
            </p>
          </div>
        )}
      </button>
    );
  }

  // Detailed variant
  return (
    <div
      {...(onSelect ? clickableByKeyboard(onSelect) : {})}
      aria-disabled={isOutOfStock}
      className={cn(
        'flex items-center gap-4 p-4 bg-card border rounded-lg',
        'hover:border-primary/30 transition-colors',
        isOutOfStock && 'opacity-60 pointer-events-none',
        className
      )}
      role={onSelect ? 'button' : undefined}
    >
      {/* Icon/Image */}
      <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg">
        {product.isWeighted ? (
          <Scale className="w-8 h-8 text-primary" />
        ) : (
          <Package className="w-8 h-8 text-primary" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium line-clamp-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              Código: {product.barcode || product.internalCode || '—'}
            </p>
          </div>

          {/* Status badges */}
          <div className="flex gap-1 flex-shrink-0">
            {product.isWeighted && (
              <Badge variant="secondary" className="text-xs">
                Pesável
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="destructive" className="text-xs">
                Sem estoque
              </Badge>
            )}
            {isLowStock && !isOutOfStock && (
              <Badge variant="outline" className="text-xs border-warning text-warning">
                Baixo estoque
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className="text-muted-foreground">
            Estoque:{' '}
            <span className="font-medium text-foreground">
              {product.currentStock} {product.unit}
            </span>
          </span>
          {product.costPrice && (
            <span className="text-muted-foreground">
              Custo:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(product.costPrice)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xl font-bold text-primary font-mono">
          {formatCurrency(product.salePrice)}
        </p>
        {product.isWeighted && <p className="text-xs text-muted-foreground">por kg</p>}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex-shrink-0 flex gap-1">
          <Button variant="ghost" size="icon" onClick={onSelect}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default ProductCard;
