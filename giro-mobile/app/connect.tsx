/**
 * Connect Screen - Desktop Discovery
 * Finds and connects to GIRO Desktop on local network
 */

import { useRouter } from 'expo-router';
import { ChevronRight, Clock, RefreshCw, Server, Wifi, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useConnection } from '@/hooks/useConnection';
import { useDiscovery } from '@/hooks/useDiscovery';
import { useConnectionStore } from '@/stores/connectionStore';
import type { DiscoveredDesktop } from '@/types/connection';

export default function ConnectScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { desktops, isSearching, error: discoveryError, startDiscovery, refresh } = useDiscovery();

  const { connect, isConnecting } = useConnection();
  const { connectionHistory, connectionState } = useConnectionStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Animation for scanning indicator
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
        withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        false
      );
    }
  }, [isSearching]);

  // Start discovery on mount
  useEffect(() => {
    startDiscovery();
  }, []);

  // Redirect when connected
  useEffect(() => {
    if (connectionState === 'connected') {
      router.replace('/login');
    }
  }, [connectionState]);

  const handleConnect = async (desktop: DiscoveredDesktop) => {
    setSelectedId(desktop.id);
    try {
      await connect(desktop);
      showToast({
        type: 'success',
        title: 'Conectado!',
        message: `Conectado a ${desktop.name}`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao desktop',
      });
    } finally {
      setSelectedId(null);
    }
  };

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4">
        <Text className="text-3xl font-bold text-foreground">Conectar</Text>
        <Text className="text-muted-foreground mt-1">Procurando GIRO Desktop na rede local</Text>
      </View>

      {/* Scanning Indicator */}
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
            ? 'Procurando...'
            : desktops.length > 0
            ? `${desktops.length} desktop(s) encontrado(s)`
            : 'Nenhum desktop encontrado'}
        </Text>
      </View>

      {/* Desktop List */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={isSearching} onRefresh={refresh} colors={['#22c55e']} />
        }
      >
        {/* Discovered Desktops */}
        {desktops.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Desktops Disponíveis
            </Text>
            {desktops.map((desktop) => (
              <DesktopCard
                key={desktop.id}
                desktop={desktop}
                onPress={() => handleConnect(desktop)}
                isLoading={selectedId === desktop.id && isConnecting}
                disabled={isConnecting}
              />
            ))}
          </View>
        )}

        {/* Connection History */}
        {connectionHistory.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Conexões Recentes
            </Text>
            {connectionHistory.map((item) => (
              <DesktopCard
                key={item.desktop.id}
                desktop={item.desktop}
                onPress={() => handleConnect(item.desktop)}
                isLoading={selectedId === item.desktop.id && isConnecting}
                disabled={isConnecting}
                isHistory
              />
            ))}
          </View>
        )}

        {/* No Desktops Found */}
        {!isSearching && desktops.length === 0 && connectionHistory.length === 0 && (
          <Card className="bg-muted/50">
            <CardContent className="items-center py-8">
              <WifiOff size={48} className="text-muted-foreground mb-4" />
              <Text className="text-lg font-medium text-foreground text-center">
                Nenhum GIRO Desktop encontrado
              </Text>
              <Text className="text-muted-foreground text-center mt-2">
                Verifique se o GIRO Desktop está aberto e conectado à mesma rede WiFi
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {discoveryError && (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="py-4">
              <Text className="text-destructive font-medium">Erro na descoberta</Text>
              <Text className="text-destructive/80 text-sm mt-1">{discoveryError}</Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View className="px-6 py-4 border-t border-border">
        <Button variant="outline" onPress={refresh} disabled={isSearching} className="w-full">
          <RefreshCw size={18} className="mr-2" />
          <Text>Procurar Novamente</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}

// Desktop Card Component
interface DesktopCardProps {
  desktop: DiscoveredDesktop;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  isHistory?: boolean;
}

function DesktopCard({ desktop, onPress, isLoading, disabled, isHistory }: DesktopCardProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className="mb-3 active:scale-[0.98]">
      <Card className={`border ${isHistory ? 'border-dashed' : 'border-border'}`}>
        <CardContent className="flex-row items-center py-4">
          <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mr-4">
            {isHistory ? (
              <Clock size={24} className="text-muted-foreground" />
            ) : (
              <Server size={24} className="text-primary" />
            )}
          </View>

          <View className="flex-1">
            <Text className="text-lg font-medium text-foreground">{desktop.name}</Text>
            <Text className="text-sm text-muted-foreground">
              {desktop.ip}:{desktop.port}
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
}
