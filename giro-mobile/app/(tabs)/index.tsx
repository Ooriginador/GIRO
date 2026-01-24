/**
 * Scanner Tab - Home Screen
 * Main barcode scanner with quick actions
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Flashlight,
  FlashlightOff,
  History,
  Minus,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { StockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { useProductsStore } from '@/stores/productsStore';
import type { Product } from '@/types/product';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');

  const { showToast } = useToast();
  const { hapticSuccess, hapticError, hapticSelection } = useHaptics();
  const { getProduct, adjustStock } = useWebSocket();
  const { recentScans, addRecentScan } = useProductsStore();

  // Scanner animation
  const scanLineY = useSharedValue(0);
  const resultScale = useSharedValue(0);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  // Handle barcode scanned
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    hapticSelection();

    try {
      const product = await getProduct(barcode);

      if (product) {
        hapticSuccess();
        setSelectedProduct(product);
        addRecentScan(barcode, product);
        resultScale.value = withSpring(1, { damping: 15 });
      } else {
        hapticError();
        showToast({
          type: 'warning',
          title: 'Produto não encontrado',
          message: `Código: ${barcode}`,
        });
      }
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao buscar produto',
        message: 'Não foi possível consultar o produto',
      });
    }
  }, []);

  // Handle manual search
  const handleManualSearch = async () => {
    if (!manualSearch.trim()) return;
    await handleBarcodeScanned(manualSearch.trim());
    setManualSearch('');
    setShowManualInput(false);
  };

  // Handle stock adjustment
  const handleAdjustStock = async () => {
    if (!selectedProduct || !adjustQuantity) return;

    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      showToast({
        type: 'error',
        title: 'Quantidade inválida',
        message: 'Digite um número válido maior que zero',
      });
      return;
    }

    try {
      await adjustStock({
        productId: selectedProduct.id,
        type: adjustType,
        quantity: qty,
        reason: adjustType === 'IN' ? 'RECEIVING' : 'LOSS',
      });

      hapticSuccess();
      showToast({
        type: 'success',
        title: adjustType === 'IN' ? 'Entrada registrada' : 'Saída registrada',
        message: `${formatQuantity(qty, selectedProduct.unit)} ${
          adjustType === 'IN' ? 'adicionado(s)' : 'removido(s)'
        }`,
      });

      setShowAdjustModal(false);
      setAdjustQuantity('');
      setSelectedProduct(null);
    } catch (err) {
      hapticError();
      showToast({
        type: 'error',
        title: 'Erro ao ajustar estoque',
        message: 'Não foi possível registrar a movimentação',
      });
    }
  };

  // Close product result
  const handleCloseResult = () => {
    resultScale.value = withTiming(0, { duration: 200 });
    setTimeout(() => setSelectedProduct(null), 200);
  };

  // Camera permission handling
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Loading size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Package size={64} className="text-muted-foreground mb-4" />
        <Text className="text-xl font-semibold text-foreground text-center mb-2">
          Câmera necessária
        </Text>
        <Text className="text-muted-foreground text-center mb-6">
          Precisamos de acesso à câmera para escanear códigos de barras
        </Text>
        <Button onPress={requestPermission}>
          <Text className="text-primary-foreground">Permitir Câmera</Text>
        </Button>
      </View>
    );
  }

  const resultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultScale.value,
  }));

  return (
    <View className="flex-1 bg-background">
      {/* Camera View */}
      <View className="flex-1 relative">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={flashEnabled}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={
            selectedProduct ? undefined : (result) => handleBarcodeScanned(result.data)
          }
        >
          {/* Scan Overlay */}
          <View className="flex-1 items-center justify-center">
            <View className="w-72 h-48 border-2 border-white/80 rounded-xl overflow-hidden">
              <Animated.View style={scanLineStyle} className="h-0.5 bg-primary w-full" />
            </View>
            <Text className="text-white text-sm mt-4 text-center">
              Posicione o código de barras dentro da área
            </Text>
          </View>

          {/* Flash Toggle */}
          <Pressable
            onPress={() => setFlashEnabled(!flashEnabled)}
            className="absolute top-4 right-4 w-12 h-12 bg-black/50 rounded-full items-center justify-center"
          >
            {flashEnabled ? (
              <Flashlight size={24} className="text-yellow-400" />
            ) : (
              <FlashlightOff size={24} className="text-white" />
            )}
          </Pressable>

          {/* Manual Search Button */}
          <Pressable
            onPress={() => setShowManualInput(true)}
            className="absolute top-4 left-4 flex-row items-center bg-black/50 px-4 py-2 rounded-full"
          >
            <Search size={18} className="text-white mr-2" />
            <Text className="text-white text-sm">Buscar</Text>
          </Pressable>
        </CameraView>

        {/* Product Result Overlay */}
        {selectedProduct && (
          <Animated.View style={resultAnimStyle} className="absolute inset-0 bg-black/70 p-4">
            <Card className="flex-1 max-h-[500px]">
              <CardHeader className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-foreground">{selectedProduct.name}</Text>
                  <Text className="text-muted-foreground">{selectedProduct.barcode}</Text>
                </View>
                <Pressable
                  onPress={handleCloseResult}
                  className="w-8 h-8 items-center justify-center"
                >
                  <X size={24} className="text-muted-foreground" />
                </Pressable>
              </CardHeader>

              <CardContent>
                {/* Stock Info */}
                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1 bg-muted p-4 rounded-lg">
                    <Text className="text-sm text-muted-foreground mb-1">Estoque</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {formatQuantity(selectedProduct.currentStock, selectedProduct.unit)}
                    </Text>
                    <StockBadge
                      current={selectedProduct.currentStock}
                      minimum={selectedProduct.minStock}
                    />
                  </View>
                  <View className="flex-1 bg-muted p-4 rounded-lg">
                    <Text className="text-sm text-muted-foreground mb-1">Preço</Text>
                    <Text className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedProduct.salePrice)}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Custo: {formatCurrency(selectedProduct.costPrice || 0)}
                    </Text>
                  </View>
                </View>

                {/* Category */}
                {selectedProduct.category && (
                  <View className="mb-4">
                    <Text className="text-sm text-muted-foreground mb-1">Categoria</Text>
                    <Text className="text-foreground">{selectedProduct.category.name}</Text>
                  </View>
                )}

                {/* Quick Actions */}
                <View className="flex-row gap-3">
                  <Button
                    variant="default"
                    className="flex-1"
                    onPress={() => {
                      setAdjustType('IN');
                      setShowAdjustModal(true);
                    }}
                  >
                    <Plus size={18} className="mr-2 text-primary-foreground" />
                    <Text className="text-primary-foreground">Entrada</Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={() => {
                      setAdjustType('OUT');
                      setShowAdjustModal(true);
                    }}
                  >
                    <Minus size={18} className="mr-2" />
                    <Text>Saída</Text>
                  </Button>
                </View>

                {/* Scan Another Button */}
                <Button variant="ghost" className="w-full mt-4" onPress={handleCloseResult}>
                  <Text className="text-muted-foreground">Escanear Outro</Text>
                </Button>
              </CardContent>
            </Card>
          </Animated.View>
        )}
      </View>

      {/* Recent Scans */}
      {recentScans.length > 0 && !selectedProduct && (
        <View className="bg-card border-t border-border px-4 py-3 max-h-32">
          <View className="flex-row items-center mb-2">
            <History size={16} className="text-muted-foreground mr-2" />
            <Text className="text-sm font-medium text-muted-foreground">Últimos escaneados</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentScans
              .slice(0, 5)
              .filter((scan) => scan.product !== null)
              .map((scan, index) => (
                <Pressable
                  key={index}
                  onPress={() => scan.product && setSelectedProduct(scan.product)}
                  className="mr-3 bg-muted px-3 py-2 rounded-lg"
                >
                  <Text className="text-foreground font-medium" numberOfLines={1}>
                    {scan.product?.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatQuantity(scan.product?.currentStock || 0, scan.product?.unit || 'UN')} em
                    estoque
                  </Text>
                </Pressable>
              ))}
          </ScrollView>
        </View>
      )}

      {/* Manual Search Modal */}
      <Modal
        visible={showManualInput}
        onClose={() => setShowManualInput(false)}
        title="Buscar Produto"
      >
        <Input
          label="Código de barras ou nome"
          placeholder="Digite o código ou nome do produto"
          value={manualSearch}
          onChangeText={setManualSearch}
          autoFocus
          onSubmitEditing={handleManualSearch}
        />
        <View className="flex-row gap-3 mt-4">
          <Button variant="outline" className="flex-1" onPress={() => setShowManualInput(false)}>
            <Text>Cancelar</Text>
          </Button>
          <Button className="flex-1" onPress={handleManualSearch}>
            <Text className="text-primary-foreground">Buscar</Text>
          </Button>
        </View>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        visible={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setAdjustQuantity('');
        }}
        title={adjustType === 'IN' ? 'Registrar Entrada' : 'Registrar Saída'}
      >
        <Text className="text-muted-foreground mb-4">{selectedProduct?.name}</Text>
        <Input
          label="Quantidade"
          placeholder="0"
          value={adjustQuantity}
          onChangeText={setAdjustQuantity}
          keyboardType="decimal-pad"
          autoFocus
        />
        <View className="flex-row gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => {
              setShowAdjustModal(false);
              setAdjustQuantity('');
            }}
          >
            <Text>Cancelar</Text>
          </Button>
          <Button
            className="flex-1"
            onPress={handleAdjustStock}
            variant={adjustType === 'IN' ? 'default' : 'destructive'}
          >
            <Text className="text-primary-foreground">
              {adjustType === 'IN' ? 'Adicionar' : 'Remover'}
            </Text>
          </Button>
        </View>
      </Modal>
    </View>
  );
}
