/**
 * Hook para gerenciar scanner de código de barras
 */

import { useProductsStore } from '@stores/productsStore';
import { useSettingsStore } from '@stores/settingsStore';
import type { Product } from '@types/product';
import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseScannerResult {
  // Permissions
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;

  // State
  isScanning: boolean;
  isProcessing: boolean;
  lastScannedCode: string | null;
  scannedProduct: Product | null;
  error: string | null;
  torchEnabled: boolean;

  // Actions
  startScanning: () => void;
  stopScanning: () => void;
  toggleTorch: () => void;
  handleBarCodeScanned: (data: { type: string; data: string }) => void;
  clearResult: () => void;

  // Refs para CameraView
  cameraRef: React.RefObject<CameraView>;
}

interface UseScannerOptions {
  onScan?: (barcode: string, product: Product | null) => void;
  onError?: (error: string) => void;
  autoFetch?: boolean;
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN = 1500; // 1.5 segundos entre scans

export function useScanner(options: UseScannerOptions = {}): UseScannerResult {
  const { onScan, onError, autoFetch = true, cooldownMs = DEFAULT_COOLDOWN } = options;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const lastScanTimeRef = useRef<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const { scannerVibration, scannerSound, setScannerTorch } = useSettingsStore();
  const { addToScanHistory, getProductByBarcode } = useProductsStore();
  const { getProduct, isConnected } = useWebSocket();

  // Solicitar permissão de câmera
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  // Verificar permissão ao montar
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Carregar som de beep
  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(require('@assets/sounds/beep.mp3'));
        if (isMounted) {
          soundRef.current = sound;
        }
      } catch {
        // Som não é crítico, ignorar erro
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playFeedback = useCallback(async () => {
    // Vibração
    if (scannerVibration) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Som
    if (scannerSound && soundRef.current) {
      try {
        await soundRef.current.replayAsync();
      } catch {
        // Ignorar erro de som
      }
    }
  }, [scannerVibration, scannerSound]);

  const handleBarCodeScanned = useCallback(
    async (scanData: { type: string; data: string }) => {
      const now = Date.now();

      // Cooldown para evitar scans repetidos
      if (now - lastScanTimeRef.current < cooldownMs) {
        return;
      }

      // Evitar processar o mesmo código em sequência
      if (scanData.data === lastScannedCode && isProcessing) {
        return;
      }

      lastScanTimeRef.current = now;
      setIsProcessing(true);
      setError(null);
      setLastScannedCode(scanData.data);

      await playFeedback();

      let product: Product | null = null;

      // Primeiro, verificar cache local
      const cachedProduct = getProductByBarcode(scanData.data);
      if (cachedProduct) {
        product = cachedProduct;
      } else if (autoFetch && isConnected) {
        // Buscar no servidor
        try {
          product = await getProduct(scanData.data);
        } catch (err) {
          const errorMessage = (err as Error).message || 'Erro ao buscar produto';
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }

      setScannedProduct(product);
      addToScanHistory(scanData.data, product);

      onScan?.(scanData.data, product);
      setIsProcessing(false);
    },
    [
      cooldownMs,
      lastScannedCode,
      isProcessing,
      playFeedback,
      getProductByBarcode,
      autoFetch,
      isConnected,
      getProduct,
      addToScanHistory,
      onScan,
      onError,
    ]
  );

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setError(null);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  const toggleTorch = useCallback(() => {
    setTorchEnabled((prev) => {
      const newValue = !prev;
      setScannerTorch(newValue);
      return newValue;
    });
  }, [setScannerTorch]);

  const clearResult = useCallback(() => {
    setLastScannedCode(null);
    setScannedProduct(null);
    setError(null);
  }, []);

  return {
    hasPermission,
    requestPermission,
    isScanning,
    isProcessing,
    lastScannedCode,
    scannedProduct,
    error,
    torchEnabled,
    startScanning,
    stopScanning,
    toggleTorch,
    handleBarCodeScanned,
    clearResult,
    cameraRef,
  };
}
