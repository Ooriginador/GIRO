/**
 * @file PeersList - Lista de computadores conectados
 * @description Exibe peers na rede Multi-PC com status em tempo real
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMultiPc, type PeerInfo } from '@/hooks/useMultiPc';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  Laptop,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useState, type FC } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface PeersListProps {
  showAddButton?: boolean;
  showRefreshButton?: boolean;
  compact?: boolean;
  maxHeight?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

const PeerStatusBadge: FC<{ peer: PeerInfo }> = ({ peer }) => {
  const isOnline = peer.status === 'online' || peer.status === 'connected';
  const isConnecting = peer.status === 'testing' || peer.status === 'discovered';

  if (isConnecting) {
    return (
      <Badge variant="outline" className="gap-1 text-amber-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        Conectando
      </Badge>
    );
  }

  return (
    <Badge
      variant={isOnline ? 'default' : 'secondary'}
      className={cn(
        'gap-1',
        isOnline ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground'
      )}
    >
      {isOnline ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
};

const PeerCard: FC<{
  peer: PeerInfo;
  onRemove?: (id: string) => void;
  isRemoving?: boolean;
  compact?: boolean;
}> = ({ peer, onRemove, isRemoving, compact }) => {
  const isOnline = peer.status === 'online' || peer.status === 'connected';
  const isMaster = peer.isMaster;

  const formatLastSeen = (lastSeen: string | null): string => {
    if (!lastSeen) return 'Nunca';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return 'Agora';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}min atrás`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border p-3',
          isOnline
            ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
            : ''
        )}
      >
        <div className="flex items-center gap-3">
          {isMaster ? (
            <Server
              className={cn('h-5 w-5', isOnline ? 'text-amber-500' : 'text-muted-foreground')}
            />
          ) : (
            <Laptop
              className={cn('h-5 w-5', isOnline ? 'text-blue-500' : 'text-muted-foreground')}
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{peer.name || 'Sem nome'}</span>
              {isMaster && (
                <Badge variant="outline" className="text-xs text-amber-600">
                  Principal
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{peer.ip}</span>
          </div>
        </div>
        <PeerStatusBadge peer={peer} />
      </div>
    );
  }

  return (
    <Card className={cn(isOnline && 'ring-1 ring-green-500/20')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'rounded-lg p-2',
                isMaster ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
              )}
            >
              {isMaster ? (
                <Server
                  className={cn('h-5 w-5', isOnline ? 'text-amber-600' : 'text-muted-foreground')}
                />
              ) : (
                <Laptop
                  className={cn('h-5 w-5', isOnline ? 'text-blue-600' : 'text-muted-foreground')}
                />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{peer.name || 'Computador'}</span>
                {isMaster && (
                  <Badge variant="outline" className="text-xs text-amber-600">
                    Principal
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Wifi className="h-3 w-3" />
                  {peer.ip}:{peer.port}
                </div>
                {peer.version && <div className="text-xs">GIRO v{peer.version}</div>}
                {peer.storeName && <div className="text-xs">{peer.storeName}</div>}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <PeerStatusBadge peer={peer} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatLastSeen(peer.lastSeen)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>Última vez visto</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {peer.latencyMs && isOnline && (
          <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
            <span>Latência: {peer.latencyMs}ms</span>
          </div>
        )}

        {onRemove && (
          <div className="mt-3 flex justify-end border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(peer.id)}
              disabled={isRemoving}
              className="text-destructive hover:text-destructive"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-1">Remover</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// ADD PEER DIALOG
// ────────────────────────────────────────────────────────────────────────────

const AddPeerDialog: FC<{
  onAdd: (ip: string, port?: number, name?: string) => Promise<void>;
  isAdding: boolean;
}> = ({ onAdd, isAdding }) => {
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('3847');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;

    await onAdd(ip.trim(), port ? parseInt(port, 10) : undefined, name.trim() || undefined);
    setIp('');
    setPort('3847');
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Computador</DialogTitle>
          <DialogDescription>
            Informe o IP do computador que deseja conectar à rede
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="peer-ip">Endereço IP *</Label>
            <Input
              id="peer-ip"
              placeholder="192.168.1.100"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={isAdding}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="peer-port">Porta</Label>
            <Input
              id="peer-port"
              placeholder="3847"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isAdding}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="peer-name">Nome (opcional)</Label>
            <Input
              id="peer-name"
              placeholder="Caixa 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAdding}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!ip.trim() || isAdding}>
              {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const PeersList: FC<PeersListProps> = ({
  showAddButton = true,
  showRefreshButton = true,
  compact = false,
  maxHeight = '400px',
}) => {
  const { toast } = useToast();
  const {
    peers,
    queries: { peers: peersQuery },
    addPeer,
    removePeer,
    refreshDiscovery,
  } = useMultiPc();

  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAddPeer = async (ip: string, port?: number, name?: string) => {
    try {
      await addPeer.mutateAsync({ ip, port, name });
      toast({
        title: 'Computador adicionado',
        description: `${name || ip} foi adicionado à rede`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao adicionar computador',
        variant: 'destructive',
      });
    }
  };

  const handleRemovePeer = async (peerId: string) => {
    setRemovingId(peerId);
    try {
      await removePeer.mutateAsync(peerId);
      toast({
        title: 'Computador removido',
        description: 'O computador foi removido da rede',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao remover computador',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshDiscovery.mutateAsync();
      toast({
        title: 'Busca atualizada',
        description: 'Procurando computadores na rede...',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao buscar computadores',
        variant: 'destructive',
      });
    }
  };

  const isRefreshing = refreshDiscovery.isPending || peersQuery.isFetching;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Computadores na Rede</CardTitle>
            <CardDescription>
              {peers.length === 0
                ? 'Nenhum computador encontrado'
                : `${peers.length} computador${peers.length > 1 ? 'es' : ''} na rede`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showRefreshButton && (
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            )}
            {showAddButton && <AddPeerDialog onAdd={handleAddPeer} isAdding={addPeer.isPending} />}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {peers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <WifiOff className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhum outro computador detectado na rede
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Certifique-se que os outros caixas estão ligados e conectados à mesma rede
            </p>
          </div>
        ) : (
          <div
            className={cn('space-y-3 overflow-y-auto', compact && 'space-y-2')}
            style={{ maxHeight }}
          >
            {peers.map((peer) => (
              <PeerCard
                key={peer.id}
                peer={peer}
                onRemove={handleRemovePeer}
                isRemoving={removingId === peer.id}
                compact={compact}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PeersList;
