/**
 * ServerFinder Component
 * UI for discovering GIRO Desktop on local network
 */

import { ChevronRight, Clock, RefreshCw, Server, Wifi, WifiOff } from 'lucide-react-native';
import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState, Loading } from '@/components/ui/Loading';
import { useDiscovery } from '@/hooks/useDiscovery';
import { useConnectionStore } from '@/stores/connectionStore';
import type { DiscoveredDesktop } from '@/types/connection';

interface ServerFinderProps {
  onSelectServer: (desktop: DiscoveredDesktop) => void;
  isConnecting?: boolean;
  selectedId?: string | null;
}

export function ServerFinder({
  onSelectServer,
  isConnecting = false,
  selectedId = null,
}: ServerFinderProps) {
  const { desktops, isSearching, error, startDiscovery, stopDiscovery, refresh } = useDiscovery();

  const { connectionHistory } = useConnectionStore();

  // Rotation animation for search indicator
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isSearching) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
      pulse.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        false
      );
    }
  }, [isSearching]);

  useEffect(() => {
    startDiscovery();
    return () => stopDiscovery();
  }, []);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Render desktop item
  const renderDesktopItem = ({
    item,
    isHistory = false,
  }: {
    item: DiscoveredDesktop;
    isHistory?: boolean;
  }) => {
    const isSelected = selectedId === item.id;
    const isLoading = isSelected && isConnecting;

    return (
      <Pressable
        onPress={() => onSelectServer(item)}
        disabled={isConnecting}
        className="mb-3 active:scale-[0.98]"
      >
        <Card
          className={`border ${isHistory ? 'border-dashed' : ''} ${
            isSelected ? 'border-primary' : 'border-border'
          }`}
        >
          <CardContent className="flex-row items-center py-4">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                isHistory ? 'bg-muted' : 'bg-primary/10'
              }`}
            >
              {isHistory ? (
                <Clock size={24} className="text-muted-foreground" />
              ) : (
                <Server size={24} className="text-primary" />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-lg font-medium text-foreground">{item.name}</Text>
              <Text className="text-sm text-muted-foreground">
                {item.ip}:{item.port}
              </Text>
            </View>

            {isLoading ? (
              <Loading size="small" />
            ) : (
              <ChevronRight size={24} className="text-muted-foreground" />
            )}
          </CardContent>
        </Card>
      </Pressable>
    );
  };

  return (
    <View className="flex-1">
      {/* Search Animation */}
      <View className="items-center py-8">
        <Animated.View style={pulseStyle}>
          <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center">
            <Animated.View style={isSearching ? rotationStyle : undefined}>
              {isSearching ? (
                <RefreshCw size={40} className="text-primary" />
              ) : desktops.length > 0 ? (
                <Wifi size={40} className="text-primary" />
              ) : (
                <WifiOff size={40} className="text-muted-foreground" />
              )}
            </Animated.View>
          </View>
        </Animated.View>

        <Text className="text-sm text-muted-foreground mt-4">
          {isSearching
            ? 'Procurando GIRO Desktop na rede...'
            : desktops.length > 0
            ? `${desktops.length} desktop(s) encontrado(s)`
            : 'Nenhum desktop encontrado'}
        </Text>
      </View>

      {/* Desktop Lists */}
      <FlatList
        data={desktops}
        renderItem={({ item }) => renderDesktopItem({ item })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isSearching} onRefresh={refresh} colors={['#22c55e']} />
        }
        ListHeaderComponent={
          desktops.length > 0 ? (
            <Text className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Desktops Disponíveis
            </Text>
          ) : null
        }
        ListFooterComponent={
          <>
            {/* Connection History */}
            {connectionHistory.length > 0 && (
              <View className="mt-4">
                <Text className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  Conexões Recentes
                </Text>
                {connectionHistory.map((historyItem) => (
                  <View key={`history-${historyItem.desktop.id}`}>
                    {renderDesktopItem({ item: historyItem.desktop, isHistory: true })}
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {!isSearching && desktops.length === 0 && connectionHistory.length === 0 && (
              <EmptyState
                icon={<WifiOff size={48} className="text-muted-foreground" />}
                title="Nenhum GIRO Desktop encontrado"
                message="Verifique se o GIRO Desktop está aberto e conectado à mesma rede WiFi"
              />
            )}

            {/* Error */}
            {error && (
              <Card className="bg-destructive/10 border-destructive/20 mt-4">
                <CardContent className="py-4">
                  <Text className="text-destructive font-medium">Erro na descoberta</Text>
                  <Text className="text-destructive/80 text-sm mt-1">{error}</Text>
                </CardContent>
              </Card>
            )}
          </>
        }
      />

      {/* Refresh Button */}
      <View className="px-4 py-4">
        <Button
          variant="outline"
          onPress={refresh}
          disabled={isSearching || isConnecting}
          className="w-full"
        >
          <RefreshCw size={18} className="mr-2" />
          <Text>Procurar Novamente</Text>
        </Button>
      </View>
    </View>
  );
}
