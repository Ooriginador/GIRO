/**
 * Validade Tab - Expiration Control
 * Monitor products by expiration date
 */

import { useQuery } from '@tanstack/react-query';
import { Ban, Check, ChevronRight, Tag, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { ExpirationBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState, Loading } from '@/components/ui/Loading';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatQuantity } from '@/lib/utils';
import type { ExpiringProduct } from '@/types/product';

type ExpirationFilter = 7 | 15 | 30;

const FILTER_OPTIONS: { value: ExpirationFilter; label: string; color: string }[] = [
  { value: 7, label: '7 dias', color: 'text-destructive' },
  { value: 15, label: '15 dias', color: 'text-warning' },
  { value: 30, label: '30 dias', color: 'text-muted-foreground' },
];

type ExpirationAction = 'write_off' | 'promotion' | 'return';

const ACTION_OPTIONS: { value: ExpirationAction; label: string; icon: any; description: string }[] =
  [
    {
      value: 'write_off',
      label: 'Baixa/Descarte',
      icon: Trash2,
      description: 'Remover do estoque',
    },
    { value: 'promotion', label: 'Promoção', icon: Tag, description: 'Marcar para promoção' },
    { value: 'return', label: 'Devolução', icon: Ban, description: 'Devolver ao fornecedor' },
  ];

export default function ValidadeScreen() {
  const [daysFilter, setDaysFilter] = useState<ExpirationFilter>(15);
  const [selectedProduct, setSelectedProduct] = useState<ExpiringProduct | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ExpirationAction | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { showToast } = useToast();
  const { hapticSuccess, hapticError, hapticSelection } = useHaptics();
  const { send } = useWebSocket();

  // Fetch expiring products
  const {
    data: products = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['expiration', daysFilter],
    queryFn: async () => {
      const response = await send<{ days: number }, ExpiringProduct[]>('expiration.list', {
        days: daysFilter,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle action
  const handleAction = async () => {
    if (!selectedProduct || !selectedAction) return;

    try {
      await send('expiration.action', {
        productId: selectedProduct.product.id,
        lotId: selectedProduct.lot.id,
        action: selectedAction,
      });

      hapticSuccess();
      setShowConfirmModal(false);
      setShowActionModal(false);
      setSelectedProduct(null);
      setSelectedAction(null);
      refetch();

      showToast({
        type: 'success',
        title: 'Ação executada',
        message: ACTION_OPTIONS.find((a) => a.value === selectedAction)?.label || '',
      });
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível executar a ação',
      });
    }
  };

  // Get urgency color
  const getUrgencyColor = (daysUntilExpiration: number) => {
    if (daysUntilExpiration <= 2) return 'bg-destructive';
    if (daysUntilExpiration <= 7) return 'bg-warning';
    return 'bg-muted';
  };

  // Render product item
  const renderProductItem = ({ item }: { item: ExpiringProduct }) => {
    const daysLeft = Math.ceil(
      (new Date(item.lot.expirationDate || new Date()).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    const isExpired = daysLeft <= 0;

    return (
      <Pressable
        onPress={() => {
          setSelectedProduct(item);
          setShowActionModal(true);
          hapticSelection();
        }}
        className="mb-3 active:scale-[0.98]"
      >
        <Card className={isExpired ? 'border-destructive' : ''}>
          <CardContent className="flex-row items-center py-4">
            {/* Urgency Indicator */}
            <View className={`w-1 h-14 rounded-full mr-4 ${getUrgencyColor(daysLeft)}`} />

            {/* Product Info */}
            <View className="flex-1">
              <Text className="font-medium text-foreground" numberOfLines={1}>
                {item.product.name}
              </Text>
              <Text className="text-sm text-muted-foreground">
                Lote: {item.lot.batchNumber || '-'}
              </Text>
              <View className="flex-row items-center mt-1">
                <ExpirationBadge expirationDate={item.lot.expirationDate} />
                <Text className="text-xs text-muted-foreground ml-2">
                  {formatQuantity(item.lot.quantity, item.product.unit)}
                </Text>
              </View>
            </View>

            {/* Days Left */}
            <View className="items-end">
              {isExpired ? (
                <Text className="text-lg font-bold text-destructive">Vencido</Text>
              ) : (
                <>
                  <Text
                    className={`text-lg font-bold ${
                      daysLeft <= 7 ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {daysLeft}d
                  </Text>
                  <Text className="text-xs text-muted-foreground">restantes</Text>
                </>
              )}
            </View>

            <ChevronRight size={20} className="text-muted-foreground ml-2" />
          </CardContent>
        </Card>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Filter Header */}
      <View className="bg-card border-b border-border px-4 py-3">
        <Text className="text-sm font-medium text-muted-foreground mb-3">
          Mostrar produtos vencendo em:
        </Text>
        <View className="flex-row gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setDaysFilter(option.value);
                hapticSelection();
              }}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                daysFilter === option.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  daysFilter === option.value ? 'text-primary' : 'text-foreground'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Summary */}
      {products.length > 0 && (
        <View className="flex-row justify-around py-3 bg-card border-b border-border">
          <View className="items-center">
            <Text className="text-lg font-bold text-destructive">
              {products.filter((p) => p.daysUntilExpiration <= 2).length}
            </Text>
            <Text className="text-xs text-muted-foreground">Crítico</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-warning">
              {
                products.filter((p) => p.daysUntilExpiration > 2 && p.daysUntilExpiration <= 7)
                  .length
              }
            </Text>
            <Text className="text-xs text-muted-foreground">Atenção</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-foreground">
              {products.filter((p) => p.daysUntilExpiration > 7).length}
            </Text>
            <Text className="text-xs text-muted-foreground">Normal</Text>
          </View>
        </View>
      )}

      {/* Product List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loading size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => `${item.product.id}-${item.lot.id}`}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon={<Check size={48} className="text-primary" />}
              title="Tudo em ordem!"
              message={`Nenhum produto vencendo nos próximos ${daysFilter} dias`}
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#22c55e']} />
          }
        />
      )}

      {/* Action Selection Modal */}
      <Modal
        visible={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedProduct(null);
          setSelectedAction(null);
        }}
        title="Ação para Produto"
      >
        {selectedProduct && (
          <View>
            <Text className="text-lg font-bold text-foreground mb-1">
              {selectedProduct.product.name}
            </Text>
            <Text className="text-muted-foreground mb-1">
              Lote: {selectedProduct.lot.batchNumber || '-'}
            </Text>
            <ExpirationBadge expirationDate={selectedProduct.lot.expirationDate} />

            <Text className="text-muted-foreground mt-4 mb-3">Selecione uma ação:</Text>

            <View className="gap-2">
              {ACTION_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedAction === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSelectedAction(option.value)}
                    className={`flex-row items-center p-4 rounded-lg border ${
                      isSelected ? 'border-primary bg-primary/10' : 'border-border bg-muted'
                    }`}
                  >
                    <Icon
                      size={20}
                      className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}
                      >
                        {option.label}
                      </Text>
                      <Text className="text-sm text-muted-foreground">{option.description}</Text>
                    </View>
                    {isSelected && <Check size={20} className="text-primary" />}
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => {
                  setShowActionModal(false);
                  setSelectedProduct(null);
                  setSelectedAction(null);
                }}
              >
                <Text>Cancelar</Text>
              </Button>
              <Button
                className="flex-1"
                onPress={() => setShowConfirmModal(true)}
                disabled={!selectedAction}
              >
                <Text className="text-primary-foreground">Executar</Text>
              </Button>
            </View>
          </View>
        )}
      </Modal>

      {/* Confirm Action Modal */}
      <ConfirmModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirmar Ação"
        message={`Deseja executar "${
          ACTION_OPTIONS.find((a) => a.value === selectedAction)?.label
        }" para ${selectedProduct?.product.name}?`}
        confirmText="Confirmar"
        onConfirm={handleAction}
        variant="default"
      />
    </View>
  );
}
