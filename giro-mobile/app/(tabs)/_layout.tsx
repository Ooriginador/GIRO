/**
 * Tabs Layout - Main Navigation
 * Bottom tab navigator for main app sections
 */

import { Tabs, useRouter } from 'expo-router';
import { Calendar, ClipboardList, Package, Scan, Settings } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useWebSocket } from '@/hooks/useWebSocket';
import { useConnectionStore } from '@/stores/connectionStore';

export default function TabsLayout() {
  const router = useRouter();
  const { connectionState, operator } = useConnectionStore();
  const { isConnected } = useWebSocket();

  // Guard: redirect if not authenticated
  useEffect(() => {
    if (connectionState !== 'authenticated' || !operator) {
      router.replace('/connect');
    }
  }, [connectionState, operator]);

  // Connection status indicator
  const ConnectionDot = () => (
    <View
      className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
        isConnected ? 'bg-primary' : 'bg-destructive'
      }`}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scanner',
          headerTitle: 'GIRO Mobile',
          headerRight: () => (
            <View className="mr-4 flex-row items-center">
              <Text className="text-sm text-muted-foreground mr-2">{operator?.name}</Text>
              <View className="relative">
                <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                  <Text className="text-primary font-semibold">
                    {operator?.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <ConnectionDot />
              </View>
            </View>
          ),
          tabBarIcon: ({ color, size }) => <Scan size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          headerTitle: 'Consulta de Estoque',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="inventario"
        options={{
          title: 'Inventário',
          headerTitle: 'Inventário',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="validade"
        options={{
          title: 'Validade',
          headerTitle: 'Controle de Validade',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Config',
          headerTitle: 'Configurações',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
