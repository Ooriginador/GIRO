/**
 * Estoque Tab - Stock Consultation
 * Search and view stock levels
 */

import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { AlertTriangle, Filter, Package, Search, TrendingDown, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Badge, StockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState, Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import type { Product } from '@/types/product';

type StockFilter = 'all' | 'low' | 'zero' | 'expiring';

const FILTER_OPTIONS: { value: StockFilter; label: string; icon: any }[] = [
  { value: 'all', label: 'Todos', icon: Package },
  { value: 'low', label: 'Baixo', icon: TrendingDown },
  { value: 'zero', label: 'Zerado', icon: AlertTriangle },
  { value: 'expiring', label: 'Vencendo', icon: AlertTriangle },
];

export default function EstoqueScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StockFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { searchProducts, send } = useWebSocket();

  // Fetch products with filter
  const {
    data: products = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['stock', activeFilter, searchQuery],
    queryFn: async () => {
      if (searchQuery) {
        return searchProducts(searchQuery);
      }

      // Fetch based on filter
      const response = await send<Product[]>({
        action: 'stock.list',
        payload: { filter: activeFilter, limit: 100 },
      });
      return response || [];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  const handleSearch = (text: string) => {
    debouncedSearch(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleFilterChange = (filter: StockFilter) => {
    setActiveFilter(filter);
    setShowFilters(false);
  };

  // Render product item
  const renderProductItem = ({ item }: { item: Product }) => (
    <Pressable onPress={() => setSelectedProduct(item)} className="mb-3 active:scale-[0.98]">
      <Card>
        <CardContent className="flex-row items-center py-4">
          {/* Product Icon */}
          <View className="w-12 h-12 bg-primary/10 rounded-lg items-center justify-center mr-4">
            <Package size={24} className="text-primary" />
          </View>

          {/* Product Info */}
          <View className="flex-1">
            <Text className="font-medium text-foreground" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-sm text-muted-foreground">{item.barcode}</Text>
            <View className="flex-row items-center mt-1">
              <StockBadge current={item.currentStock} minimum={item.minStock} />
            </View>
          </View>

          {/* Stock Info */}
          <View className="items-end">
            <Text className="text-lg font-bold text-foreground">
              {formatQuantity(item.currentStock, item.unit)}
            </Text>
            <Text className="text-xs text-muted-foreground">
              Min: {formatQuantity(item.minStock, item.unit)}
            </Text>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );

  // Empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    if (searchQuery) {
      return (
        <EmptyState
          icon={<Search size={48} className="text-muted-foreground" />}
          title="Nenhum produto encontrado"
          message={`Não encontramos produtos para "${searchQuery}"`}
          action={
            <Button variant="outline" onPress={handleClearSearch}>
              <Text>Limpar busca</Text>
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        icon={<Package size={48} className="text-muted-foreground" />}
        title="Sem produtos"
        message="Nenhum produto cadastrado"
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Search Header */}
      <View className="px-4 py-3 bg-card border-b border-border">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Input
              placeholder="Buscar produto..."
              leftIcon={<Search size={18} className="text-muted-foreground" />}
              rightIcon={
                searchQuery ? (
                  <Pressable onPress={handleClearSearch}>
                    <X size={18} className="text-muted-foreground" />
                  </Pressable>
                ) : undefined
              }
              onChangeText={handleSearch}
            />
          </View>
          <Pressable
            onPress={() => setShowFilters(true)}
            className="w-12 h-12 items-center justify-center bg-muted rounded-lg"
          >
            <Filter size={20} className="text-foreground" />
          </Pressable>
        </View>

        {/* Active Filter Badge */}
        {activeFilter !== 'all' && (
          <View className="flex-row items-center mt-3">
            <Badge variant="secondary" className="flex-row items-center">
              <Text className="text-secondary-foreground mr-2">
                Filtro: {FILTER_OPTIONS.find((f) => f.value === activeFilter)?.label}
              </Text>
              <Pressable onPress={() => setActiveFilter('all')}>
                <X size={14} className="text-secondary-foreground" />
              </Pressable>
            </Badge>
          </View>
        )}
      </View>

      {/* Product List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loading size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#22c55e']} />
          }
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} onClose={() => setShowFilters(false)} title="Filtrar Estoque">
        <View className="gap-2">
          {FILTER_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = activeFilter === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => handleFilterChange(option.value)}
                className={`flex-row items-center p-4 rounded-lg ${
                  isActive ? 'bg-primary/10 border border-primary' : 'bg-muted'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                <Text
                  className={`ml-3 font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Modal>

      {/* Product Detail Modal */}
      <Modal
        visible={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title="Detalhes do Produto"
      >
        {selectedProduct && (
          <View>
            <Text className="text-xl font-bold text-foreground mb-2">{selectedProduct.name}</Text>
            <Text className="text-muted-foreground mb-4">{selectedProduct.barcode}</Text>

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1 bg-muted p-4 rounded-lg">
                <Text className="text-sm text-muted-foreground">Estoque Atual</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatQuantity(selectedProduct.currentStock, selectedProduct.unit)}
                </Text>
              </View>
              <View className="flex-1 bg-muted p-4 rounded-lg">
                <Text className="text-sm text-muted-foreground">Estoque Mínimo</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatQuantity(selectedProduct.minStock, selectedProduct.unit)}
                </Text>
              </View>
            </View>

            <View className="bg-muted p-4 rounded-lg mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-muted-foreground">Preço de Venda</Text>
                <Text className="font-bold text-primary">
                  {formatCurrency(selectedProduct.salePrice)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Preço de Custo</Text>
                <Text className="font-medium text-foreground">
                  {formatCurrency(selectedProduct.costPrice)}
                </Text>
              </View>
            </View>

            <StockBadge current={selectedProduct.currentStock} minimum={selectedProduct.minStock} />

            <Button className="w-full mt-4" onPress={() => setSelectedProduct(null)}>
              <Text className="text-primary-foreground">Fechar</Text>
            </Button>
          </View>
        )}
      </Modal>
    </View>
  );
}
