/**
 * Configurações Tab - Settings
 * App settings, connection info, and user preferences
 */

import { useRouter } from 'expo-router';
import {
  Camera,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Info,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  User,
  Vibrate,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConnectionStore } from '@/stores/connectionStore';
import { useSettingsStore } from '@/stores/settingsStore';

export default function ConfiguracoesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { hapticSelection } = useHaptics();

  const { logout, isConnected } = useWebSocket();
  const { selectedDesktop, operator, connectionState, clearHistory } = useConnectionStore();

  const {
    soundEnabled,
    vibrationEnabled,
    autoFlash,
    continuousScan,
    darkMode,
    setSoundEnabled,
    setVibrationEnabled,
    setAutoFlash,
    setContinuousScan,
    setDarkMode,
  } = useSettingsStore();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/connect');
      showToast({
        type: 'info',
        title: 'Desconectado',
        message: 'Você foi desconectado com sucesso',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível desconectar',
      });
    }
    setShowLogoutModal(false);
  };

  // Setting Item Component
  const SettingItem = ({
    icon: Icon,
    label,
    description,
    value,
    onValueChange,
    type = 'switch',
  }: {
    icon: any;
    label: string;
    description?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    type?: 'switch' | 'link';
  }) => (
    <Pressable
      onPress={() => {
        if (type === 'switch' && onValueChange) {
          onValueChange(!value);
          hapticSelection();
        }
      }}
      className="flex-row items-center py-4 border-b border-border"
    >
      <View className="w-10 h-10 bg-muted rounded-lg items-center justify-center mr-4">
        <Icon size={20} className="text-foreground" />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-foreground">{label}</Text>
        {description && <Text className="text-sm text-muted-foreground">{description}</Text>}
      </View>
      {type === 'switch' && onValueChange && (
        <Switch
          value={value}
          onValueChange={(v) => {
            onValueChange(v);
            hapticSelection();
          }}
          trackColor={{ false: '#e2e8f0', true: '#22c55e' }}
          thumbColor="#ffffff"
        />
      )}
      {type === 'link' && <ChevronRight size={20} className="text-muted-foreground" />}
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Connection Status */}
      <Card className="mx-4 mt-4">
        <CardHeader>
          <View className="flex-row items-center">
            {isConnected ? (
              <Wifi size={20} className="text-primary mr-2" />
            ) : (
              <WifiOff size={20} className="text-destructive mr-2" />
            )}
            <Text className="font-semibold text-foreground">Conexão</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-muted-foreground">Desktop</Text>
            <Text className="font-medium text-foreground">
              {selectedDesktop?.name || 'Não conectado'}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-muted-foreground">Endereço</Text>
            <Text className="font-medium text-foreground">
              {selectedDesktop ? `${selectedDesktop.ip}:${selectedDesktop.port}` : '-'}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-muted-foreground">Status</Text>
            <View
              className={`px-2 py-1 rounded ${isConnected ? 'bg-primary/20' : 'bg-destructive/20'}`}
            >
              <Text className={isConnected ? 'text-primary' : 'text-destructive'}>
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* User Info */}
      <Card className="mx-4 mt-4">
        <CardHeader>
          <View className="flex-row items-center">
            <User size={20} className="text-foreground mr-2" />
            <Text className="font-semibold text-foreground">Operador</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-muted-foreground">Nome</Text>
            <Text className="font-medium text-foreground">{operator?.name || '-'}</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-muted-foreground">Função</Text>
            <Text className="font-medium text-foreground capitalize">{operator?.role || '-'}</Text>
          </View>
        </CardContent>
      </Card>

      {/* Scanner Settings */}
      <View className="mx-4 mt-6">
        <Text className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Scanner
        </Text>
        <Card>
          <CardContent className="py-2">
            <SettingItem
              icon={Volume2}
              label="Som"
              description="Reproduzir som ao escanear"
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
            <SettingItem
              icon={Vibrate}
              label="Vibração"
              description="Vibrar ao escanear"
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
            />
            <SettingItem
              icon={Camera}
              label="Flash Automático"
              description="Ligar flash em ambientes escuros"
              value={autoFlash}
              onValueChange={setAutoFlash}
            />
            <SettingItem
              icon={RefreshCw}
              label="Scan Contínuo"
              description="Escanear múltiplos códigos"
              value={continuousScan}
              onValueChange={setContinuousScan}
            />
          </CardContent>
        </Card>
      </View>

      {/* Appearance */}
      <View className="mx-4 mt-6">
        <Text className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Aparência
        </Text>
        <Card>
          <CardContent className="py-2">
            <SettingItem
              icon={darkMode ? Moon : Sun}
              label="Modo Escuro"
              description="Tema escuro para o app"
              value={darkMode}
              onValueChange={setDarkMode}
            />
          </CardContent>
        </Card>
      </View>

      {/* About & Help */}
      <View className="mx-4 mt-6">
        <Text className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Sobre
        </Text>
        <Card>
          <CardContent className="py-2">
            <Pressable
              onPress={() => setShowAboutModal(true)}
              className="flex-row items-center py-4 border-b border-border"
            >
              <View className="w-10 h-10 bg-muted rounded-lg items-center justify-center mr-4">
                <Info size={20} className="text-foreground" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-foreground">Sobre o GIRO Mobile</Text>
                <Text className="text-sm text-muted-foreground">Versão 0.1.0</Text>
              </View>
              <ChevronRight size={20} className="text-muted-foreground" />
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://giro.app/suporte')}
              className="flex-row items-center py-4"
            >
              <View className="w-10 h-10 bg-muted rounded-lg items-center justify-center mr-4">
                <HelpCircle size={20} className="text-foreground" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-foreground">Ajuda e Suporte</Text>
                <Text className="text-sm text-muted-foreground">Documentação e FAQ</Text>
              </View>
              <ExternalLink size={20} className="text-muted-foreground" />
            </Pressable>
          </CardContent>
        </Card>
      </View>

      {/* Logout */}
      <View className="mx-4 mt-6 mb-8">
        <Button
          variant="outline"
          className="w-full border-destructive"
          onPress={() => setShowLogoutModal(true)}
        >
          <LogOut size={18} className="mr-2 text-destructive" />
          <Text className="text-destructive">Sair</Text>
        </Button>
      </View>

      {/* Logout Confirmation */}
      <ConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sair"
        message="Deseja realmente sair do GIRO Mobile?"
        confirmText="Sair"
        onConfirm={handleLogout}
        variant="destructive"
      />

      {/* About Modal */}
      <Modal visible={showAboutModal} onClose={() => setShowAboutModal(false)} title="Sobre">
        <View className="items-center py-4">
          <View className="w-20 h-20 bg-primary/10 rounded-2xl items-center justify-center mb-4">
            <Text className="text-4xl font-bold text-primary">G</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground">GIRO Mobile</Text>
          <Text className="text-muted-foreground">Versão 0.1.0</Text>

          <View className="w-full mt-6 bg-muted rounded-lg p-4">
            <Text className="text-sm text-muted-foreground text-center">
              App complementar ao GIRO Desktop para operações de estoque via WiFi.
            </Text>
          </View>

          <View className="flex-row items-center mt-4">
            <Shield size={16} className="text-muted-foreground mr-2" />
            <Text className="text-sm text-muted-foreground">Dados seguros na rede local</Text>
          </View>

          <Text className="text-xs text-muted-foreground mt-6">
            © 2026 GIRO. Todos os direitos reservados.
          </Text>
        </View>

        <Button className="w-full mt-4" onPress={() => setShowAboutModal(false)}>
          <Text className="text-primary-foreground">Fechar</Text>
        </Button>
      </Modal>
    </ScrollView>
  );
}
