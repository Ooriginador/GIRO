import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { invoke } from '@/lib/tauri';
import { getErrorMessage } from '@/lib/utils';
import { Network, RefreshCw, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NetworkStatus {
  isRunning: boolean;
  status: string;
  connectedMaster?: string;
}

export function NetworkSettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [terminalName, setTerminalName] = useState('');
  const [status, setStatus] = useState<NetworkStatus>({
    isRunning: false,
    status: 'Stopped',
  });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      // Usar get_multi_pc_status unificado
      const s = await invoke<{
        isRunning: boolean;
        connected_to_master: boolean;
        current_master_id?: string;
        peers?: Array<{ id: string; hostname?: string; ip?: string; is_master: boolean }>;
      }>('get_multi_pc_status');

      let masterName = undefined;
      if (s.connected_to_master && s.peers) {
        const master = s.peers.find((p) => p.is_master);
        if (master) {
          masterName = master.hostname || master.ip || master.id;
        } else {
          masterName = s.current_master_id;
        }
      }

      setStatus({
        isRunning: s.isRunning,
        status: s.isRunning ? 'Running' : 'Stopped',
        connectedMaster: masterName,
      });
      setEnabled(s.isRunning);
    } catch (error) {
      console.error('Failed to get network status:', getErrorMessage(error));
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      setEnabled(true);
    } else {
      // Stop
      try {
        setLoading(true);
        // Parar via Connection Manager
        await invoke('stop_connection_manager');
        await fetchStatus();
        toast({ title: 'Modo Satélite desativado' });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        toast({
          title: 'Erro ao parar',
          description: message,
          variant: 'destructive',
        });
        setEnabled(true); // Revert switch if failed
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStart = async () => {
    if (!terminalName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Defina um nome para este terminal (ex: Caixa 02)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      // Iniciar via Connection Manager (modo Satellite)
      await invoke('start_connection_manager', {
        config: {
          mode: 'satellite',
          websocketPort: 3847, // Porta padrão
          masterIp: null, // Será descoberto via auto-discovery se possível
          masterPort: null,
          autoDiscovery: true,
        },
      });
      await fetchStatus();
      toast({
        title: 'Modo Satélite iniciado',
        description: 'Buscando Master na rede...',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({
        title: 'Erro ao iniciar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Sincronização PC-to-PC (Modo Satélite)
            </CardTitle>
            <CardDescription>Configure este PC como um terminal secundário</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} />
        </div>
      </CardHeader>
      <CardContent className={!enabled ? 'opacity-50 pointer-events-none' : ''}>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome do Terminal</Label>
            <Input
              value={terminalName}
              onChange={(e) => setTerminalName(e.target.value)}
              placeholder="Ex: Caixa 02"
              disabled={status.isRunning}
            />
          </div>

          <div className="flex items-center gap-4">
            {!status.isRunning && (
              <Button onClick={handleStart} disabled={loading}>
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Conexão
              </Button>
            )}

            {status.isRunning && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      status.connectedMaster ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                    }`}
                  />
                  <span>
                    {status.connectedMaster
                      ? `Conectado a ${status.connectedMaster}`
                      : 'Buscando servidor Master...'}
                  </span>
                </div>
                {status.connectedMaster && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await invoke('force_network_sync');
                        toast({
                          title: 'Sincronização iniciada',
                          description: 'Dados serão atualizados em instantes',
                        });
                      } catch (e) {
                        toast({
                          title: 'Erro ao sincronizar',
                          description: e instanceof Error ? e.message : String(e),
                          variant: 'destructive',
                        });
                      }
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar Agora
                  </Button>
                )}
              </>
            )}
          </div>

          {status.isRunning && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <p>
                Este terminal sincroniza automaticamente a cada 5 minutos. Vendas são enviadas
                instantaneamente para o Master.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
