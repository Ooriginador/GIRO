/**
 * @file SyncSettings.tsx
 * @description Configurações de Sincronização Multi-PC
 * Permite ao usuário sincronizar dados entre dispositivos conectados à mesma licença
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLicenseStore } from '@/stores';
import { useSync, type SyncEntityType, type SyncEntityCount } from '@/hooks/useSync';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  RefreshCw,
  Cloud,
  CloudOff,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Package,
  FolderTree,
  Truck,
  Users,
  Settings,
  Monitor,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// ENTITY INFO
// ────────────────────────────────────────────────────────────────────────────

const entityInfo: Record<
  SyncEntityType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  product: { label: 'Produtos', icon: Package },
  category: { label: 'Categorias', icon: FolderTree },
  supplier: { label: 'Fornecedores', icon: Truck },
  customer: { label: 'Clientes', icon: Users },
  employee: { label: 'Funcionários', icon: Users },
  setting: { label: 'Configurações', icon: Settings },
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function SyncSettings() {
  const { toast } = useToast();
  const { state: licenseState } = useLicenseStore();
  const sync = useSync();

  const [selectedEntities, setSelectedEntities] = useState<SyncEntityType[]>([
    'product',
    'category',
    'supplier',
    'customer',
    'setting',
  ]);

  const [lastError, setLastError] = useState<string | null>(null);

  // ────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────────────────

  const handleSyncAll = useCallback(async () => {
    setLastError(null);
    try {
      const result = await sync.syncAll();
      toast({
        title: 'Sincronização concluída',
        description: `${result.pushed} enviados, ${result.pulled} recebidos${
          result.conflicts > 0 ? `, ${result.conflicts} conflitos` : ''
        }`,
        variant: result.conflicts > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLastError(errorMessage);
      toast({
        title: 'Erro na sincronização',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [sync, toast]);

  const handlePush = useCallback(async () => {
    setLastError(null);
    try {
      const result = await sync.push.mutateAsync(selectedEntities);
      toast({
        title: 'Dados enviados',
        description: `${result.processed} itens processados`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLastError(errorMessage);
      toast({
        title: 'Erro ao enviar dados',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [sync, selectedEntities, toast]);

  const handlePull = useCallback(async () => {
    setLastError(null);
    try {
      const result = await sync.pull.mutateAsync(selectedEntities);
      toast({
        title: 'Dados recebidos',
        description: `${result.items.length} itens atualizados`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLastError(errorMessage);
      toast({
        title: 'Erro ao receber dados',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [sync, selectedEntities, toast]);

  const handleReset = useCallback(async () => {
    setLastError(null);
    try {
      await sync.reset();
      toast({
        title: 'Sincronização resetada',
        description: 'Histórico de sincronização foi limpo',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLastError(errorMessage);
      toast({
        title: 'Erro ao resetar',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [sync, toast]);

  const toggleEntity = (entity: SyncEntityType) => {
    setSelectedEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ────────────────────────────────────────────────────────────────────────

  const renderEntityRow = (count: SyncEntityCount) => {
    const info = entityInfo[count.entityType];
    if (!info) return null;

    const Icon = info.icon;
    const isSynced = count.syncedVersion >= count.lastVersion;
    const pendingCount = count.lastVersion - count.syncedVersion;

    return (
      <TableRow key={count.entityType}>
        <TableCell>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{info.label}</span>
          </div>
        </TableCell>
        <TableCell className="text-center">{count.count}</TableCell>
        <TableCell className="text-center">
          {isSynced ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sincronizado
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-center text-muted-foreground text-sm">
          v{count.syncedVersion} / v{count.lastVersion}
        </TableCell>
      </TableRow>
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────

  const isLicenseActive = licenseState === 'valid';
  const lastSyncFormatted = sync.status?.lastSync
    ? formatDistanceToNow(new Date(sync.status.lastSync), {
        addSuffix: true,
        locale: ptBR,
      })
    : 'Nunca';

  return (
    <div className="space-y-6">
      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLicenseActive ? (
                <Cloud className="h-6 w-6 text-green-600" />
              ) : (
                <CloudOff className="h-6 w-6 text-gray-400" />
              )}
              <div>
                <CardTitle>Sincronização Multi-PC</CardTitle>
                <CardDescription>
                  Sincronize dados entre dispositivos conectados à mesma licença
                </CardDescription>
              </div>
            </div>
            <Badge variant={isLicenseActive ? 'default' : 'secondary'}>
              {isLicenseActive ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!isLicenseActive ? (
            <div className="text-center py-8 text-muted-foreground">
              <CloudOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">Licença não ativa</p>
              <p className="text-sm mb-4">Ative sua licença para usar a sincronização multi-PC</p>

              {/* Help text */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-left text-xs">
                <p className="font-medium mb-2 text-blue-700 dark:text-blue-300">💡 Como ativar:</p>
                <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                  <li>1. Vá em Configurações → Licença</li>
                  <li>2. Digite sua chave de ativação</li>
                  <li>3. Clique em "Ativar Licença"</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alerta de erro */}
              {lastError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-destructive">Erro na sincronização</p>
                      <p className="text-sm text-destructive/80 whitespace-pre-wrap">{lastError}</p>
                      <button
                        onClick={() => setLastError(null)}
                        className="text-xs text-muted-foreground hover:underline mt-2"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Última sincronização */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Última sincronização</p>
                    <p className="text-sm text-muted-foreground">{lastSyncFormatted}</p>
                  </div>
                </div>
                {sync.hasPendingChanges && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    {sync.status?.pendingChanges} alterações pendentes
                  </Badge>
                )}
              </div>

              {/* Ações principais */}
              <div className="flex gap-3">
                <Button onClick={handleSyncAll} disabled={sync.isLoading} className="flex-1">
                  {sync.full.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Tudo
                </Button>
                <Button variant="outline" onClick={handlePush} disabled={sync.isLoading}>
                  {sync.push.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
                <Button variant="outline" onClick={handlePull} disabled={sync.isLoading}>
                  {sync.pull.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Receber
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status por Entidade */}
      {isLicenseActive && sync.status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status por Entidade</CardTitle>
            <CardDescription>
              Visualize o estado de sincronização de cada tipo de dado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sync.isLoading && !sync.status ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entidade</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Versão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{sync.status?.entityCounts.map(renderEntityRow)}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entidades para Sincronizar */}
      {isLicenseActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entidades para Sincronizar</CardTitle>
            <CardDescription>Selecione quais dados deseja sincronizar manualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(entityInfo) as SyncEntityType[])
                .filter((e) => e !== 'employee') // Employees são ignorados por segurança
                .map((entity) => {
                  const info = entityInfo[entity];
                  const Icon = info.icon;
                  const isSelected = selectedEntities.includes(entity);

                  return (
                    <button
                      key={entity}
                      onClick={() => toggleEntity(entity)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/50 border-transparent hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{info.label}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset */}
      {isLicenseActive && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Zona de Perigo</CardTitle>
            <CardDescription>Ações que não podem ser desfeitas</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={sync.isLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Resetar Sincronização
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar sincronização?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá limpar todo o histórico de sincronização local. Na próxima
                    sincronização, todos os dados serão comparados novamente. Esta ação não apaga
                    nenhum dado, apenas o histórico de versões.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, resetar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SyncSettings;
