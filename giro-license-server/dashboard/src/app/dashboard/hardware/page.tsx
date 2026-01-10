'use client';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api';
import { Activity, Power } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Hardware {
  id: string;
  license_key: string;
  hardware_id: string;
  device_name: string | null;
  activated_at: string;
  last_heartbeat: string | null;
  is_active: boolean;
}

interface HardwareLog {
  timestamp: string;
  event: string;
  details: string;
}

export default function HardwarePage() {
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Hardware | null>(null);

  useEffect(() => {
    loadHardware();
  }, []);

  const loadHardware = async () => {
    try {
      const data = (await apiClient.getHardware()) as { devices: Hardware[] };
      setHardware(data.devices || []);
    } catch (error) {
      console.error('Failed to load hardware:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (deviceId: string) => {
    try {
      await apiClient.deactivateHardware(deviceId);
      await loadHardware(); // Reload after deactivation
    } catch (error) {
      console.error('Failed to deactivate device:', error);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Mock logs - will be replaced with real API data
  const mockLogs: HardwareLog[] = [
    {
      timestamp: new Date().toISOString(),
      event: 'Heartbeat',
      details: 'Device online - CPU: 45%, RAM: 2.1GB',
    },
    {
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      event: 'Activation',
      details: 'Device activated successfully',
    },
    {
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      event: 'Heartbeat',
      details: 'Device online - CPU: 42%, RAM: 1.9GB',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Hardware</h2>
        <p className="text-gray-600">Dispositivos ativados com licenças</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      ) : hardware.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Nenhum dispositivo ativado ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {hardware.map((device) => (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {device.device_name || 'Dispositivo sem nome'}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                      {device.hardware_id}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        device.is_active
                      )}`}
                    >
                      {device.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-gray-500">Licença</div>
                    <div className="font-mono">{device.license_key}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ativado em</div>
                    <div>{formatDate(device.activated_at)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Último Heartbeat</div>
                    <div>{formatDate(device.last_heartbeat)}</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {/* View Logs Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedDevice(device)}>
                        <Activity className="w-4 h-4 mr-2" />
                        Ver Logs
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Logs do Dispositivo</DialogTitle>
                        <DialogDescription>
                          {device.device_name || device.hardware_id}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {mockLogs.map((log, idx) => (
                          <div key={idx} className="border rounded-lg p-3 text-sm">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold">{log.event}</span>
                              <span className="text-xs text-gray-500">
                                {formatDate(log.timestamp)}
                              </span>
                            </div>
                            <div className="text-gray-600">{log.details}</div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Deactivate Alert Dialog */}
                  {device.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Power className="w-4 h-4 mr-2" />
                          Desativar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desativar dispositivo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá desativar o dispositivo{' '}
                            <strong>{device.device_name || device.hardware_id}</strong>. A licença
                            ficará disponível para ativação em outro hardware.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeactivate(device.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Confirmar Desativação
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
