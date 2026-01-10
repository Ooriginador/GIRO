/**
 * ProductCard Component
 * Display product information in a card format
 */

import { AlertTriangle, ChevronRight, Package } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ExpirationBadge, StockBadge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  showPrice?: boolean;
  showStock?: boolean;
  showExpiration?: boolean;
  compact?: boolean;
}

export function ProductCard({
  product,
  onPress,
  showPrice = true,
  showStock = true,
  showExpiration = false,
  compact = false,
}: ProductCardProps) {
  const hasLowStock = product.currentStock <= product.minStock;
  const hasExpiringLots = product.expiringLots && product.expiringLots.length > 0;

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        className="flex-row items-center py-3 border-b border-border active:bg-muted"
      >
        <View className="w-10 h-10 bg-primary/10 rounded-lg items-center justify-center mr-3">
          <Package size={20} className="text-primary" />
        </View>

        <View className="flex-1">
          <Text className="font-medium text-foreground" numberOfLines={1}>
            {product.name}
          </Text>
          <Text className="text-xs text-muted-foreground">{product.barcode}</Text>
        </View>

        {showStock && (
          <Text className="font-semibold text-foreground mr-2">
            {formatQuantity(product.currentStock, product.unit)}
          </Text>
        )}

        {showPrice && (
          <Text className="font-bold text-primary">{formatCurrency(product.salePrice)}</Text>
        )}

        {onPress && <ChevronRight size={18} className="text-muted-foreground ml-2" />}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={!onPress} className="mb-3 active:scale-[0.98]">
      <Card className={hasLowStock ? 'border-warning' : ''}>
        <CardContent className="flex-row items-center py-4">
          {/* Product Icon */}
          <View
            className={`w-14 h-14 rounded-xl items-center justify-center mr-4 ${
              hasLowStock ? 'bg-warning/20' : 'bg-primary/10'
            }`}
          >
            {hasLowStock ? (
              <AlertTriangle size={28} className="text-warning" />
            ) : (
              <Package size={28} className="text-primary" />
            )}
          </View>

          {/* Product Info */}
          <View className="flex-1">
            <Text className="font-semibold text-foreground text-base" numberOfLines={1}>
              {product.name}
            </Text>
            <Text className="text-sm text-muted-foreground mb-1">{product.barcode}</Text>

            <View className="flex-row items-center gap-2">
              {showStock && (
                <StockBadge current={product.currentStock} minimum={product.minStock} />
              )}
              {showExpiration && hasExpiringLots && (
                <ExpirationBadge expirationDate={product.expiringLots[0].expirationDate} />
              )}
            </View>
          </View>

          {/* Price and Stock */}
          <View className="items-end">
            {showStock && (
              <Text className="text-lg font-bold text-foreground">
                {formatQuantity(product.currentStock, product.unit)}
              </Text>
            )}
            {showPrice && (
              <Text className="text-sm font-semibold text-primary">
                {formatCurrency(product.salePrice)}
              </Text>
            )}
          </View>

          {onPress && <ChevronRight size={20} className="text-muted-foreground ml-2" />}
        </CardContent>
      </Card>
    </Pressable>
  );
}

/**
 * ProductCardSkeleton Component
 * Loading placeholder for ProductCard
 */
export function ProductCardSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="flex-row items-center py-4">
        <View className="w-14 h-14 bg-muted rounded-xl mr-4 animate-pulse" />
        <View className="flex-1">
          <View className="w-3/4 h-4 bg-muted rounded mb-2 animate-pulse" />
          <View className="w-1/2 h-3 bg-muted rounded animate-pulse" />
        </View>
        <View className="items-end">
          <View className="w-12 h-5 bg-muted rounded mb-1 animate-pulse" />
          <View className="w-16 h-4 bg-muted rounded animate-pulse" />
        </View>
      </CardContent>
    </Card>
  );
}
