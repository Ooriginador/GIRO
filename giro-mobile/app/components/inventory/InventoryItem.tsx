/**
 * InventoryItem Component
 * Display a single inventory item with count status
 */

import { AlertTriangle, Check, ChevronRight, Clock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { formatQuantity } from '@/lib/utils';
import type { InventoryItem as InventoryItemType } from '@/types/inventory';

interface InventoryItemProps {
  item: InventoryItemType;
  countedQuantity?: number;
  onPress?: () => void;
  onSkip?: () => void;
}

export function InventoryItem({ item, countedQuantity, onPress }: InventoryItemProps) {
  const isCounted = countedQuantity !== undefined;
  const hasDifference =
    isCounted && countedQuantity !== (item.expectedQuantity || item.expectedStock || 0);
  const difference = isCounted
    ? countedQuantity - (item.expectedQuantity || item.expectedStock || 0)
    : 0;

  const getStatusIcon = () => {
    if (!isCounted) {
      return <Clock size={20} className="text-muted-foreground" />;
    }
    if (hasDifference) {
      return <AlertTriangle size={20} className="text-warning" />;
    }
    return <Check size={20} className="text-primary" />;
  };

  const getStatusColor = () => {
    if (!isCounted) return 'bg-muted';
    if (hasDifference) return 'bg-warning/20';
    return 'bg-primary/20';
  };

  return (
    <Pressable onPress={onPress} disabled={!onPress} className="mb-3 active:scale-[0.98]">
      <Card className={isCounted ? 'border-primary/50' : ''}>
        <CardContent className="flex-row items-center py-4">
          {/* Status Icon */}
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${getStatusColor()}`}
          >
            {getStatusIcon()}
          </View>

          {/* Product Info */}
          <View className="flex-1">
            <Text className="font-medium text-foreground" numberOfLines={1}>
              {item.productName}
            </Text>
            <Text className="text-sm text-muted-foreground">{item.productBarcode}</Text>

            {/* Status Badge */}
            <View className="flex-row items-center mt-1">
              {isCounted ? (
                <Badge variant={hasDifference ? 'warning' : 'success'}>
                  <Text className={`text-xs ${hasDifference ? 'text-warning' : 'text-primary'}`}>
                    {hasDifference ? 'Divergente' : 'Contado'}
                  </Text>
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Text className="text-xs text-muted-foreground">Pendente</Text>
                </Badge>
              )}
            </View>
          </View>

          {/* Count Info */}
          <View className="items-end">
            {isCounted ? (
              <>
                <Text className="text-lg font-bold text-foreground">
                  {formatQuantity(countedQuantity, item.unit || 'UN')}
                </Text>
                {hasDifference && (
                  <Text
                    className={`text-xs font-medium ${
                      difference > 0 ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {difference > 0 ? '+' : ''}
                    {formatQuantity(difference, item.unit || 'UN')}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text className="text-sm text-muted-foreground">Esperado</Text>
                <Text className="text-lg font-bold text-foreground">
                  {formatQuantity(
                    item.expectedQuantity || item.expectedStock || 0,
                    item.unit || 'UN'
                  )}
                </Text>
              </>
            )}
          </View>

          {onPress && <ChevronRight size={20} className="text-muted-foreground ml-2" />}
        </CardContent>
      </Card>
    </Pressable>
  );
}

/**
 * InventoryItemCompact Component
 * Compact version for lists
 */
interface InventoryItemCompactProps {
  item: InventoryItemType;
  countedQuantity?: number;
  onPress?: () => void;
}

export function InventoryItemCompact({
  item,
  countedQuantity,
  onPress,
}: InventoryItemCompactProps) {
  const isCounted = countedQuantity !== undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center py-3 px-4 border-b border-border ${
        isCounted ? 'bg-primary/5' : ''
      }`}
    >
      <View
        className={`w-2 h-2 rounded-full mr-3 ${isCounted ? 'bg-primary' : 'bg-muted-foreground'}`}
      />

      <Text className="flex-1 text-foreground" numberOfLines={1}>
        {item.productName}
      </Text>

      <Text className={`font-medium ${isCounted ? 'text-primary' : 'text-muted-foreground'}`}>
        {isCounted
          ? formatQuantity(countedQuantity, item.unit || 'UN')
          : formatQuantity(item.expectedQuantity || item.expectedStock || 0, item.unit || 'UN')}
      </Text>
    </Pressable>
  );
}
