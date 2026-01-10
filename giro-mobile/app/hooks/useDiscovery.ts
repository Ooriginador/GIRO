/**
 * Hook para gerenciar descoberta de desktops via mDNS
 */

import { discoveryService } from '@lib/discovery';
import { useConnectionStore } from '@stores/connectionStore';
import type { DiscoveredDesktop } from '@types/connection';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDiscoveryResult {
  desktops: DiscoveredDesktop[];
  isSearching: boolean;
  error: string | null;
  startDiscovery: () => Promise<void>;
  stopDiscovery: () => void;
  refresh: () => Promise<void>;
}

interface UseDiscoveryOptions {
  autoStart?: boolean;
  timeout?: number;
}

export function useDiscovery(options: UseDiscoveryOptions = {}): UseDiscoveryResult {
  const { autoStart = false, timeout = 10000 } = options;

  const [desktops, setDesktops] = useState<DiscoveredDesktop[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setDiscoveredDesktops, addDiscoveredDesktop, removeDiscoveredDesktop } =
    useConnectionStore();

  const isMountedRef = useRef(true);

  const handleFound = useCallback(
    (desktop: DiscoveredDesktop) => {
      if (!isMountedRef.current) return;

      setDesktops((prev) => {
        const exists = prev.find((d) => d.id === desktop.id);
        if (exists) {
          return prev.map((d) => (d.id === desktop.id ? desktop : d));
        }
        return [...prev, desktop];
      });

      addDiscoveredDesktop(desktop);
    },
    [addDiscoveredDesktop]
  );

  const handleLost = useCallback(
    (desktop: DiscoveredDesktop) => {
      if (!isMountedRef.current) return;

      setDesktops((prev) => prev.filter((d) => d.id !== desktop.id));
      removeDiscoveredDesktop(desktop.id);
    },
    [removeDiscoveredDesktop]
  );

  const handleError = useCallback((err: Error) => {
    if (!isMountedRef.current) return;

    setError(err.message);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    discoveryService.onFound(handleFound);
    discoveryService.onLost(handleLost);
    discoveryService.onError(handleError);

    return () => {
      isMountedRef.current = false;
      discoveryService.offFound(handleFound);
      discoveryService.offLost(handleLost);
      discoveryService.offError(handleError);
      discoveryService.stopDiscovery();
    };
  }, [handleFound, handleLost, handleError]);

  const startDiscovery = useCallback(async () => {
    setError(null);
    setIsSearching(true);
    setDesktops([]);

    try {
      const found = await discoveryService.discover({ timeout });

      if (isMountedRef.current) {
        setDesktops(found);
        setDiscoveredDesktops(found);
        setIsSearching(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError((err as Error).message);
        setIsSearching(false);
      }
    }
  }, [timeout, setDiscoveredDesktops]);

  const stopDiscovery = useCallback(() => {
    discoveryService.stopDiscovery();
    setIsSearching(false);
  }, []);

  const refresh = useCallback(async () => {
    await startDiscovery();
  }, [startDiscovery]);

  // Auto-start se configurado
  useEffect(() => {
    if (autoStart) {
      startDiscovery();
    }
  }, [autoStart, startDiscovery]);

  return {
    desktops,
    isSearching,
    error,
    startDiscovery,
    stopDiscovery,
    refresh,
  };
}
