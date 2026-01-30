/**
 * @file PrinterDiagnostics - Ferramenta de Diagnóstico de Impressoras
 * @description Componente para debug da detecção de impressoras
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Printer, RefreshCw } from 'lucide-react';

interface OSInfo {
  os: string;
  family: string;
  arch: string;
  is_windows: boolean;
  is_linux: boolean;
  is_macos: boolean;
}

interface PrinterDetectionResult {
  printers: Array<{
    name: string;
    portName: string;
    driverName: string;
    status: number;
    isDefault: boolean;
    isThermal: boolean;
    statusText: string;
    location: string;
    comment: string;
    connectionType: string;
    detectionSource: string;
  }>;
  strategiesUsed: string[];
  errors: string[];
  fromCache: boolean;
  detectedAt: number;
  totalTimeMs: number;
}

export function PrinterDiagnostics() {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [detectionResult, setDetectionResult] = useState<PrinterDetectionResult | null>(null);
  const [hardwarePorts, setHardwarePorts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 [DIAGNOSTICS] Obtendo informações do SO...');
      const os = await invoke<OSInfo>('get_os_info');
      console.log('🔍 [DIAGNOSTICS] OS Info:', os);
      setOsInfo(os);

      console.log('🔍 [DIAGNOSTICS] Listando portas de hardware...');
      const ports = await invoke<string[]>('list_hardware_ports');
      console.log('🔍 [DIAGNOSTICS] Hardware Ports:', ports);
      setHardwarePorts(ports);

      if (os.is_windows) {
        console.log('🔍 [DIAGNOSTICS] Executando detecção completa de impressoras Windows...');
        const result = await invoke<PrinterDetectionResult>('detect_printers_full');
        console.log('🔍 [DIAGNOSTICS] Detection Result:', result);
        setDetectionResult(result);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('❌ [DIAGNOSTICS] Erro:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Diagnóstico de Impressoras
        </CardTitle>
        <CardDescription>
          Ferramenta de debug para detecção de impressoras no Windows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Diagnosticando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Executar Diagnóstico
            </>
          )}
        </Button>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro ao executar diagnóstico:</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {osInfo && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Sistema Operacional</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">OS:</span> {osInfo.os}
              </div>
              <div>
                <span className="text-muted-foreground">Família:</span> {osInfo.family}
              </div>
              <div>
                <span className="text-muted-foreground">Arquitetura:</span> {osInfo.arch}
              </div>
              <div>
                <span className="text-muted-foreground">Windows:</span>{' '}
                {osInfo.is_windows ? (
                  <Badge variant="default" className="ml-1">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    SIM
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-1">
                    NÃO
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {hardwarePorts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Portas de Hardware ({hardwarePorts.length})</h3>
            <div className="max-h-40 overflow-y-auto rounded-md border p-2">
              <ul className="space-y-1 text-sm">
                {hardwarePorts.map((port, idx) => (
                  <li key={idx} className="font-mono">
                    {port}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {detectionResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Resultado da Detecção</h3>
              <Badge variant={detectionResult.printers.length > 0 ? 'default' : 'destructive'}>
                {detectionResult.printers.length} impressoras
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Tempo:</span> {detectionResult.totalTimeMs}
                ms
              </div>
              <div>
                <span className="text-muted-foreground">Cache:</span>{' '}
                {detectionResult.fromCache ? 'SIM' : 'NÃO'}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Estratégias:</span>{' '}
                {detectionResult.strategiesUsed.join(', ')}
              </div>
            </div>

            {detectionResult.errors.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-destructive">
                  Erros ({detectionResult.errors.length}):
                </h4>
                <ul className="space-y-1 text-xs text-destructive">
                  {detectionResult.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            {detectionResult.printers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium">Impressoras Detectadas:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {detectionResult.printers.map((printer, idx) => (
                    <div key={idx} className="rounded-md border p-2 text-xs space-y-1 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{printer.name}</span>
                        <div className="flex gap-1">
                          {printer.isDefault && (
                            <Badge variant="default" className="text-[10px] h-4">
                              Padrão
                            </Badge>
                          )}
                          {printer.isThermal && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              Térmica
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        <div>Porta: {printer.portName}</div>
                        <div>Driver: {printer.driverName}</div>
                        <div>Conexão: {printer.connectionType}</div>
                        <div>Fonte: {printer.detectionSource}</div>
                        <div>Status: {printer.statusText}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
