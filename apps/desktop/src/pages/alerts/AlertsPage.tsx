/**
 * @file AlertsPage - Central de Alertas
 * @description Lista de alertas do sistema (estoque baixo, vencimentos, etc)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAlertsQuery,
  useDismissAlert,
  useMarkAlertAsRead,
  useRefreshAlerts,
} from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';
import type { Alert, AlertSeverity, AlertType } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  Bell,
  BellOff,
  Calendar,
  Check,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  TrendingDown,
  X,
} from 'lucide-react';
import { type FC, useState } from 'react';

const severityColors: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-destructive/10 text-destructive border-destructive/30',
  WARNING: 'bg-warning/10 text-warning border-warning/30',
  INFO: 'bg-muted text-muted-foreground border-muted',
};

const getTypeIcon = (type: AlertType): React.ReactNode => {
  switch (type) {
    case 'LOW_STOCK':
    case 'OUT_OF_STOCK':
      return <TrendingDown className="h-5 w-5" />;
    case 'EXPIRATION_CRITICAL':
    case 'EXPIRATION_WARNING':
    case 'EXPIRATION_NOTICE':
      return <Calendar className="h-5 w-5" />;
    case 'NEGATIVE_MARGIN':
      return <AlertCircle className="h-5 w-5" />;
    case 'SLOW_MOVING':
      return <Package className="h-5 w-5" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
};

// ────────────────────────────────────────────────────────────────────────────
// ALERT CARD COMPONENT
// ────────────────────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: Alert;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const AlertCard: FC<AlertCardProps> = ({ alert, onMarkAsRead, onDismiss }) => {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
        severityColors[alert.severity]
      } ${!alert.isRead ? 'ring-2 ring-primary/20' : 'opacity-75'}`}
      onClick={() => onMarkAsRead(alert.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onMarkAsRead(alert.id)}
    >
      <div className="flex-shrink-0 mt-0.5">{getTypeIcon(alert.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{alert.title}</p>
          {!alert.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        <p className="text-sm opacity-80 mt-1">{alert.message}</p>
        <div className="flex items-center gap-2 mt-2 text-xs opacity-60">
          <Clock className="h-3 w-3" />
          <span>{format(new Date(alert.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(alert.id);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export const AlertsPage: FC = () => {
  const { data: alerts = [], isLoading, isError } = useAlertsQuery();
  const markAsReadMutation = useMarkAlertAsRead();
  const dismissAlertMutation = useDismissAlert();
  const refreshAlertsMutation = useRefreshAlerts();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Filtra alertas não dispensados
  const activeAlerts = alerts.filter((a: Alert) => !a.isDismissed);
  const unreadCount = activeAlerts.filter((a: Alert) => !a.isRead).length;
  const lowStockAlerts = activeAlerts.filter(
    (a: Alert) => a.type === 'LOW_STOCK' || a.type === 'OUT_OF_STOCK'
  );
  const expirationAlerts = activeAlerts.filter((a: Alert) =>
    ['EXPIRATION_CRITICAL', 'EXPIRATION_WARNING', 'EXPIRATION_NOTICE'].includes(a.type)
  );

  const filteredAlerts =
    filter === 'unread' ? activeAlerts.filter((a: Alert) => !a.isRead) : activeAlerts;

  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    activeAlerts
      .filter((a: Alert) => !a.isRead)
      .forEach((a: Alert) => markAsReadMutation.mutate(a.id));
  };

  const handleDismissAlert = (id: string) => {
    dismissAlertMutation.mutate(id);
  };

  const handleRefresh = () => {
    refreshAlertsMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Erro ao carregar alertas</p>
        <Button onClick={handleRefresh}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Alertas</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? (
              <span className="text-destructive font-medium">{unreadCount} alertas não lidos</span>
            ) : (
              'Todos os alertas foram visualizados'
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshAlertsMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshAlertsMutation.isPending ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <Check className="mr-2 h-4 w-4" />
            Marcar todos como lidos
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={cn(
            'border-none bg-card/50 backdrop-blur-sm shadow-md',
            lowStockAlerts.some((a: Alert) => !a.isRead) && 'border-l-4 border-l-warning'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {lowStockAlerts.filter((a: Alert) => !a.isRead).length} não lidos
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border-none bg-card/50 backdrop-blur-sm shadow-md',
            expirationAlerts.some((a: Alert) => !a.isRead) && 'border-l-4 border-l-destructive'
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencimentos</CardTitle>
            <Calendar className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expirationAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {expirationAlerts.filter((a: Alert) => !a.isRead).length} não lidos
            </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alertas Recentes</CardTitle>
              <CardDescription>Clique em um alerta para marcar como lido</CardDescription>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="unread">
                  Não lidos
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Nenhum alerta</p>
              <p className="text-muted-foreground">
                {filter === 'unread' ? 'Todos os alertas foram lidos' : 'Não há alertas no momento'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkAsRead={markAsRead}
                  onDismiss={handleDismissAlert}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
