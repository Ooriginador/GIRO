/**
 * ScanResult Component
 * Displays scanned product result with quick actions
 */

import { AlertTriangle, Calendar, Edit, Minus, Package, Plus, Scan, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { StockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ScanResultProps {
  product: Product;
  onClose: () => void;
  onAddStock?: () => void;
  onRemoveStock?: () => void;
  onViewExpiration?: () => void;
  onEdit?: () => void;
  onScanAnother?: () => void;
}

export function ScanResult({
  product,
  onClose,
  onAddStock,
  onRemoveStock,
  onViewExpiration,
  onEdit,
  onScanAnother,
}: ScanResultProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 bg-black/70 p-4 justify-end"
    >
      <Animated.View
        entering={SlideInDown.duration(300).springify()}
        exiting={SlideOutDown.duration(200)}
      >
        <Card className="max-h-[80%]">
          {/* Header */}
          <CardHeader className="flex-row items-start justify-between pb-2">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-primary/10 rounded-lg items-center justify-center mr-3">
                <Package size={24} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground" numberOfLines={2}>
                  {product.name}
                </Text>
                <Text className="text-sm text-muted-foreground">{product.barcode}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center">
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </CardHeader>

          <CardContent>
            {/* Stock and Price Info */}
            <View className="flex-row gap-4 mb-4">
              <View className="flex-1 bg-muted p-4 rounded-xl">
                <Text className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                  Estoque
                </Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatQuantity(product.currentStock, product.unit)}
                </Text>
                <StockBadge
                  current={product.currentStock}
                  minimum={product.minStock}
                  className="mt-1"
                />
              </View>
              <View className="flex-1 bg-muted p-4 rounded-xl">
                <Text className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                  Preço
                </Text>
                <Text className="text-2xl font-bold text-primary">
                  {formatCurrency(product.salePrice)}
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">
                  Custo: {formatCurrency(product.costPrice || 0)}
                </Text>
              </View>
            </View>

            {/* Category */}
            {product.category && (
              <View className="mb-4">
                <Text className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                  Categoria
                </Text>
                <Text className="text-foreground">{product.category.name}</Text>
              </View>
            )}

            {/* Expiring lots warning */}
            {product.expiringLots && product.expiringLots.length > 0 && (
              <View className="bg-warning/10 border border-warning/20 p-3 rounded-lg mb-4 flex-row items-center">
                <AlertTriangle size={18} className="text-warning mr-2" />
                <Text className="text-warning text-sm flex-1">
                  {product.expiringLots.length} lote(s) próximo(s) do vencimento
                </Text>
              </View>
            )}

            {/* Quick Actions */}
            <Text className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
              Ações Rápidas
            </Text>
            <View className="flex-row gap-3 mb-4">
              {onAddStock && (
                <Button variant="default" className="flex-1" onPress={onAddStock}>
                  <Plus size={18} className="mr-2 text-primary-foreground" />
                  <Text className="text-primary-foreground">Entrada</Text>
                </Button>
              )}
              {onRemoveStock && (
                <Button variant="outline" className="flex-1" onPress={onRemoveStock}>
                  <Minus size={18} className="mr-2" />
                  <Text>Saída</Text>
                </Button>
              )}
            </View>

            {/* Secondary Actions */}
            <View className="flex-row gap-3 mb-4">
              {onViewExpiration && (
                <Pressable
                  onPress={onViewExpiration}
                  className="flex-1 flex-row items-center justify-center py-3 bg-muted rounded-lg"
                >
                  <Calendar size={16} className="text-muted-foreground mr-2" />
                  <Text className="text-muted-foreground text-sm">Validade</Text>
                </Pressable>
              )}
              {onEdit && (
                <Pressable
                  onPress={onEdit}
                  className="flex-1 flex-row items-center justify-center py-3 bg-muted rounded-lg"
                >
                  <Edit size={16} className="text-muted-foreground mr-2" />
                  <Text className="text-muted-foreground text-sm">Editar</Text>
                </Pressable>
              )}
            </View>

            {/* Scan Another */}
            {onScanAnother && (
              <Button variant="ghost" className="w-full" onPress={onScanAnother}>
                <Scan size={18} className="mr-2 text-muted-foreground" />
                <Text className="text-muted-foreground">Escanear Outro</Text>
              </Button>
            )}
          </CardContent>
        </Card>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Product Not Found Component
 */
interface ProductNotFoundProps {
  barcode: string;
  onClose: () => void;
  onRegister?: () => void;
  onScanAnother?: () => void;
}

export function ProductNotFound({
  barcode,
  onClose,
  onRegister,
  onScanAnother,
}: ProductNotFoundProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 bg-black/70 p-4 justify-center"
    >
      <Animated.View
        entering={SlideInDown.duration(300).springify()}
        exiting={SlideOutDown.duration(200)}
      >
        <Card>
          <CardContent className="items-center py-8">
            <View className="w-16 h-16 bg-warning/20 rounded-full items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-warning" />
            </View>

            <Text className="text-xl font-bold text-foreground text-center mb-2">
              Produto não encontrado
            </Text>

            <Text className="text-muted-foreground text-center mb-4">Código: {barcode}</Text>

            <View className="w-full gap-3">
              {onRegister && (
                <Button variant="default" className="w-full" onPress={onRegister}>
                  <Plus size={18} className="mr-2 text-primary-foreground" />
                  <Text className="text-primary-foreground">Cadastrar Produto</Text>
                </Button>
              )}

              {onScanAnother && (
                <Button variant="outline" className="w-full" onPress={onScanAnother}>
                  <Scan size={18} className="mr-2" />
                  <Text>Escanear Outro</Text>
                </Button>
              )}

              <Button variant="ghost" className="w-full" onPress={onClose}>
                <Text className="text-muted-foreground">Fechar</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </Animated.View>
    </Animated.View>
  );
}
