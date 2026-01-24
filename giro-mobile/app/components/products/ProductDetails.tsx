/**
 * ProductDetails Component
 * Full product details view with all information
 */

import {
  Barcode,
  Box,
  Calendar,
  Clock,
  DollarSign,
  Package,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { Badge, StockBadge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatQuantity, formatRelativeTime } from '@/lib/utils';
import type { Product, ProductLot, StockMovement } from '@/types/product';

interface ProductDetailsProps {
  product: Product;
  lots?: ProductLot[];
  recentMovements?: StockMovement[];
}

export function ProductDetails({ product, lots = [], recentMovements = [] }: ProductDetailsProps) {
  return (
    <ScrollView className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-primary/10 px-6 py-8 items-center">
        <View className="w-20 h-20 bg-white rounded-2xl items-center justify-center mb-4 shadow-sm">
          <Package size={40} className="text-primary" />
        </View>
        <Text className="text-2xl font-bold text-foreground text-center">{product.name}</Text>
        <Text className="text-muted-foreground mt-1">{product.barcode}</Text>
        <View className="mt-2">
          <StockBadge current={product.currentStock} minimum={product.minStock} />
        </View>
      </View>

      {/* Stock Overview */}
      <View className="flex-row gap-4 p-4">
        <Card className="flex-1">
          <CardContent className="items-center py-4">
            <Text className="text-3xl font-bold text-foreground">
              {formatQuantity(product.currentStock, product.unit)}
            </Text>
            <Text className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              Estoque Atual
            </Text>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="items-center py-4">
            <Text className="text-3xl font-bold text-primary">
              {formatCurrency(product.salePrice)}
            </Text>
            <Text className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              Preço Venda
            </Text>
          </CardContent>
        </Card>
      </View>

      {/* Details */}
      <View className="px-4">
        <Card>
          <CardHeader>
            <Text className="font-semibold text-foreground">Informações</Text>
          </CardHeader>
          <CardContent>
            <DetailRow
              icon={<Barcode size={18} className="text-muted-foreground" />}
              label="Código de Barras"
              value={product.barcode}
            />
            <DetailRow
              icon={<Tag size={18} className="text-muted-foreground" />}
              label="Categoria"
              value={product.category?.name || '-'}
            />
            <DetailRow
              icon={<Box size={18} className="text-muted-foreground" />}
              label="Unidade"
              value={product.unit.toUpperCase()}
            />
            <DetailRow
              icon={<Package size={18} className="text-muted-foreground" />}
              label="Estoque Mínimo"
              value={formatQuantity(product.minStock, product.unit)}
            />
            <DetailRow
              icon={<DollarSign size={18} className="text-muted-foreground" />}
              label="Preço de Custo"
              value={formatCurrency(product.costPrice || 0)}
              isLast
            />
          </CardContent>
        </Card>
      </View>

      {/* Lots */}
      {lots.length > 0 && (
        <View className="px-4 mt-4">
          <Card>
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-foreground">Lotes</Text>
                <Badge variant="secondary">
                  <Text className="text-secondary-foreground text-xs">{lots.length} lote(s)</Text>
                </Badge>
              </View>
            </CardHeader>
            <CardContent>
              {lots.map((lot, index) => (
                <LotRow
                  key={lot.id}
                  lot={lot}
                  unit={product.unit}
                  isLast={index === lots.length - 1}
                />
              ))}
            </CardContent>
          </Card>
        </View>
      )}

      {/* Recent Movements */}
      {recentMovements.length > 0 && (
        <View className="px-4 mt-4 mb-8">
          <Card>
            <CardHeader>
              <Text className="font-semibold text-foreground">Movimentações Recentes</Text>
            </CardHeader>
            <CardContent>
              {recentMovements.slice(0, 5).map((movement, index) => (
                <MovementRow
                  key={movement.id}
                  movement={movement}
                  unit={product.unit}
                  isLast={index === recentMovements.length - 1 || index === 4}
                />
              ))}
            </CardContent>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

// Detail Row Component
interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}

function DetailRow({ icon, label, value, isLast }: DetailRowProps) {
  return (
    <View className={`flex-row items-center py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <View className="w-8">{icon}</View>
      <Text className="flex-1 text-muted-foreground">{label}</Text>
      <Text className="font-medium text-foreground">{value}</Text>
    </View>
  );
}

// Lot Row Component
interface LotRowProps {
  lot: ProductLot;
  unit: string;
  isLast?: boolean;
}

function LotRow({ lot, unit, isLast }: LotRowProps) {
  const daysUntilExpiration = Math.ceil(
    (new Date(lot.expirationDate || new Date()).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysUntilExpiration <= 0;
  const isExpiring = daysUntilExpiration <= 7;

  return (
    <View className={`py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="font-medium text-foreground">{lot.batchNumber || '-'}</Text>
        <Text className="font-semibold text-foreground">{formatQuantity(lot.quantity, unit)}</Text>
      </View>
      <View className="flex-row items-center">
        <Calendar
          size={14}
          className={`mr-1 ${
            isExpired ? 'text-destructive' : isExpiring ? 'text-warning' : 'text-muted-foreground'
          }`}
        />
        <Text
          className={`text-sm ${
            isExpired ? 'text-destructive' : isExpiring ? 'text-warning' : 'text-muted-foreground'
          }`}
        >
          {lot.expirationDate ? new Date(lot.expirationDate).toLocaleDateString('pt-BR') : '-'}
          {isExpired && ' (Vencido)'}
          {!isExpired && isExpiring && ` (${daysUntilExpiration} dias)`}
        </Text>
      </View>
    </View>
  );
}

// Movement Row Component
interface MovementRowProps {
  movement: StockMovement;
  unit: string;
  isLast?: boolean;
}

function MovementRow({ movement, unit, isLast }: MovementRowProps) {
  const isIncoming = movement.type === 'IN';

  return (
    <View className={`flex-row items-center py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <View
        className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
          isIncoming ? 'bg-primary/20' : 'bg-destructive/20'
        }`}
      >
        {isIncoming ? (
          <TrendingUp size={16} className="text-primary" />
        ) : (
          <TrendingDown size={16} className="text-destructive" />
        )}
      </View>
      <View className="flex-1">
        <Text className="font-medium text-foreground">{isIncoming ? 'Entrada' : 'Saída'}</Text>
        <View className="flex-row items-center">
          <Clock size={12} className="text-muted-foreground mr-1" />
          <Text className="text-xs text-muted-foreground">
            {formatRelativeTime(movement.createdAt)}
          </Text>
        </View>
      </View>
      <Text className={`font-bold ${isIncoming ? 'text-primary' : 'text-destructive'}`}>
        {isIncoming ? '+' : '-'}
        {formatQuantity(movement.quantity, unit)}
      </Text>
    </View>
  );
}
