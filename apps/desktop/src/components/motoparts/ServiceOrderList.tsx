/**
 * 🧾 ServiceOrderList - Lista de Ordens de Serviço
 *
 * Componente para listar, filtrar e navegar entre ordens de serviço
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ServiceOrderUtils,
  useServiceOrders,
  type ServiceOrderStatus,
} from '@/hooks/useServiceOrders';
import { formatCurrency, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { clickableByKeyboard } from '@/lib/a11y';
import { CheckCircle, Clock, FileText, Filter, Plus, Search, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ServiceOrderListProps {
  onSelectOrder?: (orderId: string) => void;
  onCreateNew?: () => void;
}

export function ServiceOrderList({ onSelectOrder, onCreateNew }: ServiceOrderListProps) {
  const { openOrders, isLoadingOpen } = useServiceOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | 'ALL'>('ALL');

  // Filtrar ordens
  const filteredOrders = openOrders?.filter((order) => {
    const matchesSearch =
      searchTerm === '' ||
      order.order_number.toString().includes(searchTerm) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vehicle_display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ordens de Serviço
            </CardTitle>
            <Button onClick={onCreateNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova OS
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente, veículo ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ServiceOrderStatus | 'ALL')}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="OPEN">Aberta</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="WAITING_PARTS">Aguardando Peças</SelectItem>
                <SelectItem value="COMPLETED">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de ordens */}
      {isLoadingOpen ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          Carregando ordens...
        </div>
      ) : !filteredOrders || filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma ordem encontrada</p>
            <p className="text-sm mt-2">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Tente ajustar os filtros'
                : 'Clique em "Nova OS" para criar a primeira'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <ServiceOrderCard
              key={order.id}
              order={order}
              onClick={() => onSelectOrder?.(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ServiceOrderCard - Card individual de ordem
// ══════════════════════════════════════════════════════════════════════════════

interface ServiceOrderCardProps {
  order: {
    id: string;
    order_number: number;
    status: ServiceOrderStatus;
    customer_name: string;
    vehicle_display_name: string;
    vehicle_plate?: string;
    total: number;
    is_paid: boolean;
    created_at: string;
  };
  onClick?: () => void;
}

function ServiceOrderCard({ order, onClick }: ServiceOrderCardProps) {
  const statusColor = ServiceOrderUtils.getStatusColor(order.status);
  const statusLabel = ServiceOrderUtils.getStatusLabel(order.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        {...(onClick ? clickableByKeyboard(onClick) : {})}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-bold text-lg">
                  {ServiceOrderUtils.formatOrderNumber(order.order_number)}
                </span>
                <Badge variant="outline" className={statusColor}>
                  {statusLabel}
                </Badge>
                {order.is_paid && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Pago
                  </Badge>
                )}
              </div>

              <p className="font-medium truncate">{order.customer_name}</p>

              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="truncate">{order.vehicle_display_name}</span>
                {order.vehicle_plate && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{order.vehicle_plate}</span>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Criada em {formatDate(order.created_at)}
              </p>
            </div>

            {/* Total */}
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-primary">{formatCurrency(order.total)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ServiceOrderStatusBadge - Badge com ícone e cor
// ══════════════════════════════════════════════════════════════════════════════

interface ServiceOrderStatusBadgeProps {
  status: ServiceOrderStatus;
  showIcon?: boolean;
}

export function ServiceOrderStatusBadge({ status, showIcon = true }: ServiceOrderStatusBadgeProps) {
  const color = ServiceOrderUtils.getStatusColor(status);
  const label = ServiceOrderUtils.getStatusLabel(status);

  const Icon = {
    OPEN: FileText,
    IN_PROGRESS: Clock,
    QUOTE: FileText,
    WAITING_PARTS: XCircle,
    COMPLETED: CheckCircle,
    DELIVERED: CheckCircle,
    CANCELED: XCircle,
  }[status];

  return (
    <Badge variant="outline" className={color}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ServiceOrderQuickStats - Cards com estatísticas rápidas
// ══════════════════════════════════════════════════════════════════════════════

export function ServiceOrderQuickStats() {
  const { openOrders, isLoadingOpen } = useServiceOrders();

  if (isLoadingOpen || !openOrders) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = {
    open: openOrders.filter((o) => o.status === 'OPEN').length,
    inProgress: openOrders.filter((o) => o.status === 'IN_PROGRESS').length,
    waitingParts: openOrders.filter((o) => o.status === 'WAITING_PARTS').length,
    completed: openOrders.filter((o) => o.status === 'COMPLETED').length,
    totalValue: openOrders.reduce((sum, o) => sum + o.total, 0),
    unpaidValue: openOrders.filter((o) => !o.is_paid).reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Abertas" value={stats.open} icon={FileText} color="text-blue-600" />
      <StatCard
        label="Em Andamento"
        value={stats.inProgress}
        icon={Clock}
        color="text-yellow-600"
      />
      <StatCard
        label="Aguardando"
        value={stats.waitingParts}
        icon={XCircle}
        color="text-orange-600"
      />
      <StatCard
        label="Concluídas"
        value={stats.completed}
        icon={CheckCircle}
        color="text-green-600"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}
