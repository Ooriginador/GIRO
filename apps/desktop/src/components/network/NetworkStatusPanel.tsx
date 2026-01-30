/**
 * @file NetworkStatusPanel - Painel de status da rede Multi-PC
 * @description Exibe status geral, estatísticas e controles da rede
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useMultiPc, type OperationMode } from '@/hooks/useMultiPc';
import { useToast } from '@/hooks/use-toast';
import { cn, formatBytes } from '@/lib/utils';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Crown,
  Laptop,
  Link2,
  Link2Off,
  Loader2,
  Monitor,
  Power,
  PowerOff,
  RefreshCw,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { type FC } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface NetworkStatusPanelProps {
  showControls?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const getModeLabel = (mode: OperationMode): string => {
  switch (mode) {
    case 'standalone':
      return 'Caixa Único';
    case 'master':
      return 'Principal';
    case 'satellite':
      return 'Auxiliar';
    case 'hybrid':
      return 'Híbrido';
    default:
      return mode;
  }
};

const getModeIcon = (mode: OperationMode) => {
  switch (mode) {
    case 'standalone':
      return <Laptop className="h-5 w-5" />;
    case 'master':
      return <Crown className="h-5 w-5 text-amber-500" />;
    case 'satellite':
      return <Link2 className="h-5 w-5 text-blue-500" />;
    case 'hybrid':
      return <Crown className="h-5 w-5 text-purple-500" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
};

const getModeColor = (mode: OperationMode): string => {
  switch (mode) {
    case 'standalone':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'master':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'satellite':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'hybrid':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

// ────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

const StatCard: FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}> = ({ icon, label, value, subValue, color = 'text-foreground' }) => (
  <div className="flex items-center gap-3 rounded-lg border p-3">
    <div className="rounded-md bg-muted p-2">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold', color)}>{value}</p>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </div>
  </div>
);

// Reserved for future use - connection quality indicator
const ConnectionQuality: FC<{ latencyMs?: number }> = ({ latencyMs }) => {
  if (!latencyMs) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Signal className="h-4 w-4" />
        <span className="text-sm">--</span>
      </div>
    );
  }

  const getQuality = () => {
    if (latencyMs < 50) return { icon: SignalHigh, label: 'Excelente', color: 'text-green-500' };
    if (latencyMs < 150) return { icon: SignalMedium, label: 'Boa', color: 'text-amber-500' };
    return { icon: SignalLow, label: 'Lenta', color: 'text-red-500' };
  };

  const quality = getQuality();
  const Icon = quality.icon;

  return (
    <div className={cn('flex items-center gap-1', quality.color)}>
      <Icon className="h-4 w-4" />
      <span className="text-sm">{quality.label}</span>
      <span className="text-xs text-muted-foreground">({latencyMs}ms)</span>
    </div>
  );
};
// Export to prevent unused error - component reserved for future use
export { ConnectionQuality };

// ────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ────────────────────────────────────────────────────────────────────────────

const LoadingSkeleton: FC = () => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-60" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </CardContent>
  </Card>
);

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const NetworkStatusPanel: FC<NetworkStatusPanelProps> = ({
  showControls = true,
  showStats = true,
  compact = false,
}) => {
  const { toast } = useToast();
  const {
    status,
    stats,
    isLoading,
    isError,
    error,
    isRunning,
    mode,
    connectedToMaster,
    peerCount,
    onlinePeers,
    startManager,
    stopManager,
    refreshDiscovery,
    refreshAll,
    diagnoseAndRestart,
  } = useMultiPc();

  // Handlers
  const handleToggleManager = async () => {
    try {
      if (isRunning) {
        await stopManager.mutateAsync();
        toast({
          title: 'Rede desativada',
          description: 'O sistema de rede Multi-PC foi desligado',
        });
      } else {
        await startManager.mutateAsync({
          mode: mode,
          websocketPort: 3847,
          masterIp: null,
          masterPort: null,
          autoDiscovery: true,
        });
        toast({
          title: 'Rede ativada',
          description: 'O sistema de rede Multi-PC foi iniciado',
        });
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao alterar estado da rede',
        variant: 'destructive',
      });
    }
  };

  const handleDiagnoseAndFix = async () => {
    toast({
      title: 'Diagnosticando...',
      description: 'Verificando estado do Connection Manager',
    });

    const result = await diagnoseAndRestart();

    if (result.success) {
      toast({
        title: '✅ Sucesso',
        description: result.message,
      });
    } else {
      toast({
        title: '❌ Falha no diagnóstico',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshDiscovery.mutateAsync();
      toast({
        title: 'Atualizando',
        description: 'Buscando computadores na rede...',
      });
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao atualizar',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <XCircle className="mb-3 h-12 w-12 text-destructive" />
          <p className="font-medium text-destructive">Connection Manager não está rodando</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.toString() || 'O sistema de rede precisa ser iniciado'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="default" size="sm" onClick={handleDiagnoseAndFix}>
              <Power className="mr-2 h-4 w-4" />
              Corrigir e Iniciar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact mode
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border p-3',
          isRunning
            ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
            : ''
        )}
      >
        <div className="flex items-center gap-3">
          {isRunning ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{getModeLabel(mode)}</span>
              <Badge variant={isRunning ? 'default' : 'secondary'} className="text-xs">
                {isRunning ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {isRunning ? `${onlinePeers} de ${peerCount} online` : 'Rede desligada'}
            </span>
          </div>
        </div>
        {showControls && (
          <Button
            variant={isRunning ? 'outline' : 'default'}
            size="sm"
            onClick={handleToggleManager}
            disabled={startManager.isPending || stopManager.isPending}
          >
            {startManager.isPending || stopManager.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRunning ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {getModeIcon(mode)}
              Status da Rede
            </CardTitle>
            <CardDescription>
              {status?.hostname || 'Este computador'} • {status?.localIp || 'IP não disponível'}
            </CardDescription>
          </div>
          <Badge
            variant={isRunning ? 'default' : 'secondary'}
            className={cn('gap-1 px-3 py-1', isRunning ? 'bg-green-600 hover:bg-green-700' : '')}
          >
            {isRunning ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Desligado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mode and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-3', getModeColor(mode))}>{getModeIcon(mode)}</div>
            <div>
              <p className="font-semibold">{getModeLabel(mode)}</p>
              <p className="text-sm text-muted-foreground">
                {mode === 'master' && 'Outros caixas se conectam aqui'}
                {mode === 'satellite' &&
                  (connectedToMaster ? 'Conectado ao Principal' : 'Aguardando conexão')}
                {mode === 'standalone' && 'Operando de forma independente'}
                {mode === 'hybrid' && 'Master com backup distribuído'}
              </p>
            </div>
          </div>

          {mode === 'satellite' && (
            <Badge variant={connectedToMaster ? 'default' : 'secondary'}>
              {connectedToMaster ? (
                <>
                  <Link2 className="mr-1 h-3 w-3" />
                  Sincronizado
                </>
              ) : (
                <>
                  <Link2Off className="mr-1 h-3 w-3" />
                  Desconectado
                </>
              )}
            </Badge>
          )}
        </div>

        {showStats && stats && (
          <>
            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Users className="h-4 w-4 text-blue-500" />}
                label="Computadores"
                value={`${onlinePeers}/${peerCount}`}
                subValue="online"
                color={onlinePeers > 0 ? 'text-green-600' : undefined}
              />
              <StatCard
                icon={<Activity className="h-4 w-4 text-amber-500" />}
                label="Conexões Mobile"
                value={stats.mobileConnections}
                subValue="dispositivos"
              />
            </div>

            {/* Traffic Stats */}
            {(stats.bytesSent > 0 || stats.bytesReceived > 0) && (
              <div className="flex items-center justify-around rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Enviado</p>
                    <p className="font-medium">{formatBytes(stats.bytesSent)}</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Recebido</p>
                    <p className="font-medium">{formatBytes(stats.bytesReceived)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Controls */}
        {showControls && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshDiscovery.isPending}
              >
                <RefreshCw
                  className={cn('mr-2 h-4 w-4', refreshDiscovery.isPending && 'animate-spin')}
                />
                Atualizar
              </Button>

              <Button
                variant={isRunning ? 'destructive' : 'default'}
                size="sm"
                onClick={handleToggleManager}
                disabled={startManager.isPending || stopManager.isPending}
              >
                {startManager.isPending || stopManager.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isRunning ? (
                  <PowerOff className="mr-2 h-4 w-4" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                {isRunning ? 'Desligar Rede' : 'Ligar Rede'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NetworkStatusPanel;
