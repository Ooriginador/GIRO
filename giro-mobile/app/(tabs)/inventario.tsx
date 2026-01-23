/**
 * Inventário Tab - Inventory Management
 * Count products and manage inventory sessions
 */

import { AlertTriangle, Check, ClipboardList, Play, Save, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState, Loading } from '@/components/ui/Loading';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useInventory } from '@/hooks/useInventory';
import { formatQuantity } from '@/lib/utils';
import type { InventoryItem, InventoryScope } from '@/types/inventory';

const SCOPE_OPTIONS: { value: InventoryScope; label: string; description: string }[] = [
  { value: 'full', label: 'Completo', description: 'Todos os produtos' },
  { value: 'category', label: 'Por Categoria', description: 'Selecione uma categoria' },
  { value: 'section', label: 'Por Seção', description: 'Selecione uma seção' },
];

export default function InventarioScreen() {
  const [showStartModal, setShowStartModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedScope, setSelectedScope] = useState<InventoryScope>('full');
  const [countInput, setCountInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { showToast } = useToast();
  const { hapticSuccess, hapticError, hapticSelection } = useHaptics();

  const {
    currentInventory,
    items,
    countedItems,
    isLoading,
    summary,
    startInventory,
    countItem,
    skipItem,
    finishInventory,
    cancelInventory,
  } = useInventory();

  // Start new inventory
  const handleStartInventory = async () => {
    try {
      await startInventory(selectedScope);
      hapticSuccess();
      setShowStartModal(false);
      showToast({
        type: 'success',
        title: 'Inventário iniciado',
        message: 'Comece a contar os produtos',
      });
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao iniciar',
        message: 'Não foi possível iniciar o inventário',
      });
    }
  };

  // Count item
  const handleCountItem = async () => {
    if (!selectedItem || !countInput) return;

    const count = parseFloat(countInput);
    if (isNaN(count) || count < 0) {
      showToast({
        type: 'error',
        title: 'Quantidade inválida',
        message: 'Digite um número válido',
      });
      return;
    }

    try {
      await countItem(selectedItem.productId, count);
      hapticSuccess();
      setCountInput('');
      setSelectedItem(null);
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao registrar',
        message: 'Não foi possível registrar a contagem',
      });
    }
  };

  // Skip item
  const handleSkipItem = async (productId: string) => {
    try {
      await skipItem(productId);
      hapticSelection();
    } catch (err) {
      hapticError();
    }
  };

  // Finish inventory
  const handleFinishInventory = async (applyAdjustments: boolean) => {
    try {
      await finishInventory(applyAdjustments);
      hapticSuccess();
      setShowFinishModal(false);
      showToast({
        type: 'success',
        title: 'Inventário finalizado',
        message: applyAdjustments ? 'Ajustes de estoque aplicados' : 'Inventário salvo sem ajustes',
      });
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao finalizar',
        message: 'Não foi possível finalizar o inventário',
      });
    }
  };

  // Cancel inventory
  const handleCancelInventory = async () => {
    try {
      await cancelInventory();
      hapticSelection();
      setShowCancelModal(false);
      showToast({
        type: 'info',
        title: 'Inventário cancelado',
        message: 'Todas as contagens foram descartadas',
      });
    } catch (err) {
      hapticError();
    }
  };

  // Render inventory item
  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    // countedItems is an array (aliased to items), not a Map
    const foundItem = countedItems.find((i) => i.productId === item.productId);
    const isCounted = foundItem && foundItem.status === 'counted';
    const countedValue = foundItem?.countedQuantity;
    // Expected quantity might be undefined in some cases, simplify logic
    const expected = item.expectedQuantity || item.expectedStock || 0;
    const hasDifference = isCounted && countedValue !== null && countedValue !== expected;

    return (
      <Pressable
        onPress={() => {
          setSelectedItem(item);
          setCountInput(countedValue?.toString() || '');
        }}
        className="mb-3 active:scale-[0.98]"
      >
        <Card className={isCounted ? 'border-primary' : ''}>
          <CardContent className="flex-row items-center py-4">
            {/* Status Icon */}
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                isCounted ? (hasDifference ? 'bg-warning/20' : 'bg-primary/20') : 'bg-muted'
              }`}
            >
              {isCounted ? (
                hasDifference ? (
                  <AlertTriangle size={20} className="text-warning" />
                ) : (
                  <Check size={20} className="text-primary" />
                )
              ) : (
                <ClipboardList size={20} className="text-muted-foreground" />
              )}
            </View>

            {/* Product Info */}
            <View className="flex-1">
              <Text className="font-medium text-foreground" numberOfLines={1}>
                {item.productName}
              </Text>
              <Text className="text-sm text-muted-foreground">{item.barcode}</Text>
            </View>

            {/* Count Info */}
            <View className="items-end">
              {isCounted ? (
                <>
                  <Text className="text-lg font-bold text-foreground">
                    {formatQuantity(countedValue!, item.unit)}
                  </Text>
                  {hasDifference && (
                    <Text
                      className={`text-xs ${
                        countedValue! > item.expectedQuantity ? 'text-primary' : 'text-destructive'
                      }`}
                    >
                      {countedValue! > item.expectedQuantity ? '+' : ''}
                      {formatQuantity(countedValue! - item.expectedQuantity, item.unit)}
                    </Text>
                  )}
                </>
              ) : (
                <Text className="text-muted-foreground text-sm">
                  Esperado: {formatQuantity(item.expectedQuantity, item.unit)}
                </Text>
              )}
            </View>
          </CardContent>
        </Card>
      </Pressable>
    );
  };

  // No active inventory - show start screen
  if (!currentInventory) {
    return (
      <View className="flex-1 bg-background p-6">
        <EmptyState
          icon={<ClipboardList size={64} className="text-muted-foreground" />}
          title="Nenhum inventário em andamento"
          message="Inicie um novo inventário para contar os produtos"
          action={
            <Button onPress={() => setShowStartModal(true)}>
              <Play size={18} className="mr-2 text-primary-foreground" />
              <Text className="text-primary-foreground">Iniciar Inventário</Text>
            </Button>
          }
        />

        {/* Start Inventory Modal */}
        <Modal
          visible={showStartModal}
          onClose={() => setShowStartModal(false)}
          title="Novo Inventário"
        >
          <Text className="text-muted-foreground mb-4">Selecione o escopo do inventário:</Text>
          <View className="gap-2 mb-6">
            {SCOPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSelectedScope(option.value)}
                className={`p-4 rounded-lg border ${
                  selectedScope === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted'
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedScope === option.value ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </Text>
                <Text className="text-sm text-muted-foreground">{option.description}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={() => setShowStartModal(false)}>
              <Text>Cancelar</Text>
            </Button>
            <Button className="flex-1" onPress={handleStartInventory} disabled={isLoading}>
              {isLoading ? (
                <Loading size="small" color="white" />
              ) : (
                <Text className="text-primary-foreground">Iniciar</Text>
              )}
            </Button>
          </View>
        </Modal>
      </View>
    );
  }

  // Active inventory
  return (
    <View className="flex-1 bg-background">
      {/* Summary Header */}
      <View className="bg-card border-b border-border px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-semibold text-foreground">Inventário em Andamento</Text>
          <Badge variant="secondary">
            <Text className="text-secondary-foreground text-xs">
              {summary.counted}/{summary.total}
            </Text>
          </Badge>
        </View>

        {/* Progress Bar */}
        <View className="h-2 bg-muted rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${summary.progress}%` }}
          />
        </View>

        {/* Quick Stats */}
        <View className="flex-row justify-around mt-3">
          <View className="items-center">
            <Text className="text-lg font-bold text-foreground">{summary.counted}</Text>
            <Text className="text-xs text-muted-foreground">Contados</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-foreground">{summary.pending}</Text>
            <Text className="text-xs text-muted-foreground">Pendentes</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-warning">{summary.divergent}</Text>
            <Text className="text-xs text-muted-foreground">Divergentes</Text>
          </View>
        </View>
      </View>

      {/* Items List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loading size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.productId}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon={<Check size={48} className="text-primary" />}
              title="Todos contados!"
              message="Todos os produtos foram contados"
            />
          }
        />
      )}

      {/* Action Buttons */}
      <View className="flex-row gap-3 p-4 bg-card border-t border-border">
        <Button variant="outline" className="flex-1" onPress={() => setShowCancelModal(true)}>
          <X size={18} className="mr-2" />
          <Text>Cancelar</Text>
        </Button>
        <Button
          className="flex-1"
          onPress={() => setShowFinishModal(true)}
          disabled={summary.progress < 100}
        >
          <Save size={18} className="mr-2 text-primary-foreground" />
          <Text className="text-primary-foreground">Finalizar</Text>
        </Button>
      </View>

      {/* Count Input Modal */}
      <Modal
        visible={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setCountInput('');
        }}
        title="Contar Produto"
      >
        {selectedItem && (
          <View>
            <Text className="text-lg font-bold text-foreground mb-1">
              {selectedItem.productName}
            </Text>
            <Text className="text-muted-foreground mb-4">
              Esperado: {formatQuantity(selectedItem.expectedQuantity, selectedItem.unit)}
            </Text>

            <Input
              label="Quantidade Contada"
              placeholder="0"
              value={countInput}
              onChangeText={setCountInput}
              keyboardType="decimal-pad"
              autoFocus
            />

            <View className="flex-row gap-3 mt-4">
              <Button
                variant="ghost"
                className="flex-1"
                onPress={() => handleSkipItem(selectedItem.productId)}
              >
                <Text className="text-muted-foreground">Pular</Text>
              </Button>
              <Button className="flex-1" onPress={handleCountItem}>
                <Text className="text-primary-foreground">Confirmar</Text>
              </Button>
            </View>
          </View>
        )}
      </Modal>

      {/* Finish Confirmation Modal */}
      <ConfirmModal
        visible={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        title="Finalizar Inventário"
        message={`Foram encontradas ${summary.divergent} divergência(s). Deseja aplicar os ajustes de estoque?`}
        confirmText="Aplicar Ajustes"
        cancelText="Apenas Salvar"
        onConfirm={() => handleFinishInventory(true)}
        onCancel={() => handleFinishInventory(false)}
        variant="default"
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Inventário"
        message="Todas as contagens serão perdidas. Deseja continuar?"
        confirmText="Sim, Cancelar"
        onConfirm={handleCancelInventory}
        variant="destructive"
      />
    </View>
  );
}
