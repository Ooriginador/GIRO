'use client';

import { Badge } from '@/components/ui/badge';
import { invoke } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings-store';
import { HardDrive, Printer, Scale, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';

// Status de hardware
interface HardwareStatus {
  printer: 'connected' | 'disconnected' | 'error';
  scale: 'connected' | 'disconnected' | 'error';
  scanner: 'connected' | 'disconnected' | 'error';
  database: 'connected' | 'error';
}

interface ScannerServerInfo {
  running: boolean;
  ip: string;
  port: number;
  url: string;
  started_at?: number;
  task_id?: string | null;
}

/**
 * Hook para obter status real do hardware via Tauri commands
 */
const useHardwareStatus = (): HardwareStatus => {
  const { printer, scale } = useSettingsStore();
  const [status, setStatus] = useState<HardwareStatus>({
    printer: 'disconnected',
    scale: 'disconnected',
    scanner: 'disconnected',
    database: 'connected',
  });

  useEffect(() => {
    const checkHardwareStatus = async () => {
      const newStatus: HardwareStatus = {
        printer: 'disconnected',
        scale: 'disconnected',
        scanner: 'disconnected',
        database: 'connected',
      };

      // Verificar impressora
      if (printer.enabled) {
        try {
          await invoke('test_printer');
          newStatus.printer = 'connected';
        } catch {
          newStatus.printer = 'error';
        }
      }

      // Verificar balança
      if (scale.enabled) {
        try {
          await invoke('read_weight');
          newStatus.scale = 'connected';
        } catch {
          newStatus.scale = 'error';
        }
      }

      // Verificar scanner server
      try {
        const scannerInfo = await invoke<ScannerServerInfo | null>('get_scanner_server_info');
        if (scannerInfo?.running) {
          newStatus.scanner = 'connected';
        }
      } catch {
        // Scanner não está rodando
      }

      // Database sempre conectado (se chegou aqui, está funcionando)
      newStatus.database = 'connected';

      setStatus(newStatus);
    };

    // Verifica imediatamente
    checkHardwareStatus();

    // Verifica a cada 30 segundos
    const interval = setInterval(checkHardwareStatus, 30000);

    return () => clearInterval(interval);
  }, [printer.enabled, scale.enabled]);

  return status;
};

const StatusIndicator: FC<{
  status: 'connected' | 'disconnected' | 'error';
  label: string;
  icon: React.ElementType;
}> = ({ status, label, icon: Icon }) => {
  const colors = {
    connected: 'text-green-500',
    disconnected: 'text-muted-foreground',
    error: 'text-destructive',
  };

  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${status}`}>
      <Icon className={cn('h-3.5 w-3.5', colors[status])} />
      <span className="hidden text-xs text-muted-foreground sm:inline">{label}</span>
      <div
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'connected' && 'bg-green-500',
          status === 'disconnected' && 'bg-muted-foreground',
          status === 'error' && 'bg-destructive animate-pulse'
        )}
      />
    </div>
  );
};

export const Footer: FC = () => {
  const hardware = useHardwareStatus();
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <footer className="flex h-8 items-center justify-between border-t bg-background px-4 text-xs">
      {/* Left - Hardware Status */}
      <div className="flex items-center gap-4">
        <StatusIndicator status={hardware.printer} label="Impressora" icon={Printer} />
        <StatusIndicator status={hardware.scale} label="Balança" icon={Scale} />
        <StatusIndicator
          status={hardware.scanner}
          label="Scanner"
          icon={hardware.scanner === 'connected' ? Wifi : WifiOff}
        />
        <StatusIndicator status={hardware.database} label="Banco" icon={HardDrive} />
      </div>

      {/* Center - Shortcuts hint */}
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-muted-foreground">Atalhos:</span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          F2
        </Badge>
        <span className="text-muted-foreground">Buscar</span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          F10
        </Badge>
        <span className="text-muted-foreground">Finalizar</span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          F1
        </Badge>
        <span className="text-muted-foreground">Ajuda</span>
      </div>

      {/* Right - Date and Version */}
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="hidden capitalize lg:inline">{currentDate}</span>
        <span>v1.0.0</span>
      </div>
    </footer>
  );
};
