/**
 * @file MobileServerSettings - Configurações do Servidor Mobile
 * @description Controle do servidor WebSocket para integração mobile
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, QrCode, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState, type FC } from 'react';

interface MobileServerStatus {
  isRunning: boolean;
  port: number;
  connectedDevices: number;
  localIp: string | null;
  version: string;
}

interface ConnectedDevice {
  id: string;
  deviceName: string;
  employeeName: string | null;
  connectedAt: string;
  lastActivity: string;
}

export const MobileServerSettings: FC = () => {
  const { toast } = useToast();

  // Server state
  const [status, setStatus] = useState<MobileServerStatus | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Settings
  const [autoStart, setAutoStart] = useState(true);
  const [port, setPort] = useState('3847');
  const [maxConnections, setMaxConnections] = useState('5');

  // Fetch server status
  const fetchStatus = useCallback(async () => {
    try {
      const serverStatus = await invoke<MobileServerStatus>('get_mobile_server_status');
      setStatus(serverStatus);

      if (serverStatus.isRunning) {
        const devices = await invoke<ConnectedDevice[]>('get_connected_devices');
        setConnectedDevices(devices);
      } else {
        setConnectedDevices([]);
      }
    } catch (error) {
      console.error('Erro ao obter status do servidor:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Toggle server
  const handleToggleServer = async () => {
    setIsToggling(true);
    try {
      if (status?.isRunning) {
        await invoke('stop_mobile_server');
        toast({
          title: 'Servidor desligado',
          description: 'O servidor mobile foi desconectado.',
        });
      } else {
        await invoke('start_mobile_server', {
          config: {
            port: parseInt(port, 10),
            maxConnections: parseInt(maxConnections, 10),
          },
        });
        toast({
          title: 'Servidor ligado',
          description: 'O servidor mobile está pronto para conexões.',
        });
      }
      await fetchStatus();
    } catch (error) {
      console.error('Erro ao alternar servidor:', error);
      toast({
        title: 'Erro',
        description: `Falha ao ${status?.isRunning ? 'desligar' : 'ligar'} o servidor.`,
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };

  // Disconnect device
  const handleDisconnectDevice = async (deviceId: string) => {
    try {
      await invoke('disconnect_mobile_device', { deviceId });
      toast({
        title: 'Dispositivo desconectado',
        description: 'O dispositivo foi removido da sessão.',
      });
      await fetchStatus();
    } catch (error) {
      console.error('Erro ao desconectar dispositivo:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao desconectar o dispositivo.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-2 ${
                  status?.isRunning
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {status?.isRunning ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle>Servidor Mobile</CardTitle>
                <CardDescription>
                  {status?.isRunning ? `Rodando na porta ${status.port}` : 'Servidor desligado'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={fetchStatus} disabled={isToggling}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant={status?.isRunning ? 'destructive' : 'default'}
                onClick={handleToggleServer}
                disabled={isToggling}
              >
                {isToggling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {status?.isRunning ? 'Desligando...' : 'Ligando...'}
                  </>
                ) : status?.isRunning ? (
                  'Desligar Servidor'
                ) : (
                  'Ligar Servidor'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">IP Local</div>
              <div className="mt-1 text-2xl font-bold">{status?.localIp || '—'}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">Porta</div>
              <div className="mt-1 text-2xl font-bold">{status?.port || port}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">
                Dispositivos Conectados
              </div>
              <div className="mt-1 text-2xl font-bold">{status?.connectedDevices || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Card */}
      {status?.isRunning && status.localIp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar Dispositivo
            </CardTitle>
            <CardDescription>Escaneie o QR Code no app GIRO Mobile para conectar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 rounded-lg border bg-white p-4">
              {/* Placeholder for QR Code */}
              <div className="flex h-48 w-48 items-center justify-center bg-gray-100 text-gray-400">
                <QrCode className="h-24 w-24" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Ou digite manualmente:{' '}
              <code className="rounded bg-muted px-2 py-1">
                {status.localIp}:{status.port}
              </code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Dispositivos Conectados
            {connectedDevices.length > 0 && (
              <Badge variant="secondary">{connectedDevices.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Gerencie os dispositivos móveis conectados ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {connectedDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Smartphone className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhum dispositivo conectado</p>
              <p className="text-xs text-muted-foreground">
                {status?.isRunning
                  ? 'Aguardando conexões do app GIRO Mobile'
                  : 'Ligue o servidor para aceitar conexões'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{device.deviceName}</div>
                      <div className="text-sm text-muted-foreground">
                        {device.employeeName || 'Não autenticado'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Conectado: {new Date(device.connectedAt).toLocaleTimeString()}</div>
                      <div>
                        Última atividade: {new Date(device.lastActivity).toLocaleTimeString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnectDevice(device.id)}
                    >
                      Desconectar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Server Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Servidor</CardTitle>
          <CardDescription>Ajuste as configurações de rede e conexão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Iniciar automaticamente</Label>
              <p className="text-sm text-muted-foreground">
                Ligar o servidor quando o sistema iniciar
              </p>
            </div>
            <Switch checked={autoStart} onCheckedChange={setAutoStart} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="port">Porta do Servidor</Label>
              <Input
                id="port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={status?.isRunning}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Padrão: 3847. Altere se houver conflito.
              </p>
            </div>
            <div>
              <Label htmlFor="maxConnections">Máximo de Conexões</Label>
              <Input
                id="maxConnections"
                type="number"
                value={maxConnections}
                onChange={(e) => setMaxConnections(e.target.value)}
                disabled={status?.isRunning}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Limite de dispositivos simultâneos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
