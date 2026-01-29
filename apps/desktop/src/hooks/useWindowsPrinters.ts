/**
 * Hook para gerenciamento de impressoras Windows
 *
 * Fornece acesso às APIs nativas do Windows para:
 * - Listar impressoras instaladas com informações detalhadas
 * - Detectar impressora padrão
 * - Verificar status da impressora
 * - Sugerir melhor impressora para usar
 */

import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback, useEffect } from 'react';

/**
 * Informações detalhadas de uma impressora Windows
 */
export interface PrinterInfo {
  /** Nome da impressora */
  name: string;
  /** Nome da porta (USB001, LPT1, etc) */
  portName: string;
  /** Nome do driver */
  driverName: string;
  /** Código de status (bits) */
  status: number;
  /** Se é a impressora padrão do Windows */
  isDefault: boolean;
  /** Se parece ser uma impressora térmica/POS */
  isThermal: boolean;
  /** Descrição do status em texto */
  statusText: string;
  /** Localização configurada */
  location: string;
  /** Comentário/descrição */
  comment: string;
}

/**
 * Hook para gerenciamento de impressoras
 */
export function useWindowsPrinters() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState<string | null>(null);
  const [suggestedPrinter, setSuggestedPrinter] = useState<string | null>(null);
  const [isWindows, setIsWindows] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Detecta se está rodando no Windows através do userAgent do navegador
    const detectPlatform = async () => {
      try {
        // Em Tauri 2.x, usamos window.__TAURI_INTERNALS__ ou navigator
        const userAgent = navigator.userAgent.toLowerCase();
        setIsWindows(
          userAgent.includes('windows') ||
            userAgent.includes('win32') ||
            userAgent.includes('win64')
        );
      } catch (error) {
        console.warn('Erro ao detectar plataforma:', error);
        setIsWindows(false);
      }
    };

    detectPlatform();
  }, []);

  /**
   * Carrega a lista de impressoras do Windows
   */
  const loadPrinters = useCallback(async () => {
    if (isWindows === false) {
      setPrinters([]);
      setDefaultPrinter(null);
      setSuggestedPrinter(null);
      return;
    }

    if (isWindows === null) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Carrega dados em paralelo
      const [printerList, defaultName, suggested] = await Promise.all([
        invoke<PrinterInfo[]>('list_windows_printers'),
        invoke<string | null>('get_default_printer'),
        invoke<string | null>('suggest_best_printer'),
      ]);

      console.log('[useWindowsPrinters] Printers loaded:', {
        count: printerList.length,
        default: defaultName,
        suggested,
        printers: printerList.map((p) => ({
          name: p.name,
          isThermal: p.isThermal,
          isDefault: p.isDefault,
          status: p.statusText,
        })),
      });

      setPrinters(printerList);
      setDefaultPrinter(defaultName);
      setSuggestedPrinter(suggested);
    } catch (err) {
      console.error('[useWindowsPrinters] Error loading printers:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isWindows]);

  /**
   * Verifica se uma impressora está pronta
   */
  const checkPrinterReady = useCallback(
    async (printerName: string): Promise<boolean> => {
      try {
        if (!isWindows) return false;
        return await invoke<boolean>('is_printer_ready', { printerName });
      } catch (err) {
        console.error('[useWindowsPrinters] Error checking printer ready:', err);
        return false;
      }
    },
    [isWindows]
  );

  /**
   * Obtém informações detalhadas de uma impressora
   */
  const getPrinterInfo = useCallback(
    async (printerName: string): Promise<PrinterInfo | null> => {
      try {
        if (!isWindows) return null;
        return await invoke<PrinterInfo | null>('get_printer_info', { printerName });
      } catch (err) {
        console.error('[useWindowsPrinters] Error getting printer info:', err);
        return null;
      }
    },
    [isWindows]
  );

  /**
   * Filtra apenas impressoras térmicas
   */
  const thermalPrinters = printers.filter((p) => p.isThermal);

  /**
   * Impressora padrão se for térmica
   */
  const defaultThermalPrinter = printers.find((p) => p.isDefault && p.isThermal);

  // Carrega impressoras ao montar
  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  return {
    /** Lista de todas as impressoras */
    printers,
    /** Lista de impressoras térmicas */
    thermalPrinters,
    /** Nome da impressora padrão do Windows */
    defaultPrinter,
    /** Impressora térmica padrão (se a padrão for térmica) */
    defaultThermalPrinter,
    /** Impressora sugerida pelo sistema */
    suggestedPrinter,
    /** Se está carregando */
    isLoading,
    /** Erro se houver */
    error,
    /** Recarrega a lista de impressoras */
    refresh: loadPrinters,
    /** Verifica se impressora está pronta */
    checkPrinterReady,
    /** Obtém informações de uma impressora */
    getPrinterInfo,
  };
}

/**
 * Formata o status da impressora para exibição
 */
export function formatPrinterStatus(status: number): {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  icon: string;
} {
  if (status === 0) {
    return { text: 'Pronta', color: 'green', icon: '✅' };
  }

  // Problemas críticos
  if (status & 0x80) {
    // OFFLINE
    return { text: 'Offline', color: 'red', icon: '🔴' };
  }
  if (status & 0x2) {
    // ERROR
    return { text: 'Erro', color: 'red', icon: '❌' };
  }
  if (status & 0x10) {
    // PAPER_OUT
    return { text: 'Sem papel', color: 'red', icon: '📄' };
  }
  if (status & 0x8) {
    // PAPER_JAM
    return { text: 'Papel atolado', color: 'red', icon: '⚠️' };
  }

  // Estados de trabalho
  if (status & 0x400) {
    // PRINTING
    return { text: 'Imprimindo', color: 'yellow', icon: '🖨️' };
  }
  if (status & 0x200) {
    // BUSY
    return { text: 'Ocupada', color: 'yellow', icon: '⏳' };
  }
  if (status & 0x2000) {
    // WAITING
    return { text: 'Aguardando', color: 'yellow', icon: '⏳' };
  }
  if (status & 0x1) {
    // PAUSED
    return { text: 'Pausada', color: 'yellow', icon: '⏸️' };
  }

  return { text: `Status: 0x${status.toString(16)}`, color: 'gray', icon: '❓' };
}
