import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useVehicleHistory } from '@/hooks/useServiceOrders';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Clock, History, Loader2 } from 'lucide-react';
import { FC } from 'react';
import { ServiceOrderStatusBadge } from './ServiceOrderList';

interface VehicleHistoryPopoverProps {
  vehicleId: string;
  trigger?: React.ReactNode;
}

export const VehicleHistoryPopover: FC<VehicleHistoryPopoverProps> = ({ vehicleId, trigger }) => {
  const { history, isLoading } = useVehicleHistory(vehicleId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Histórico do Veículo">
            <Clock className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <History className="h-4 w-4" />
            Histórico de Serviços
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground italic text-sm">
              Nenhum serviço anterior encontrado para este veículo.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((os) => (
                <div key={os.id} className="border rounded-md p-2 space-y-1 text-sm bg-muted/30">
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-medium">
                      OS #{String(os.order_number).padStart(5, '0')}
                    </span>
                    <ServiceOrderStatusBadge status={os.status} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDate(os.created_at)}</span>
                    <span className="font-semibold text-primary">{formatCurrency(os.total)}</span>
                  </div>
                </div>
              ))}
              <div className="text-[10px] text-center text-muted-foreground">
                Exibindo os últimos 3 serviços
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
