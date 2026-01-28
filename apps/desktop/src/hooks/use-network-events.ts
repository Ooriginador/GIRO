import { networkLogger as log } from '@/lib/logger';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { productKeys } from './use-products';
import { useToast } from './use-toast';

/**
 * Hook para ouvir eventos de rede (Master/Satellite)
 * e sincronizar o estado local/cache
 */
export function useNetworkEvents() {
  const queryClient = useQueryClient();
  const { success, warning } = useToast();

  useEffect(() => {
    let unlistenSync: () => void;
    let unlistenStock: () => void;
    let unlistenReconnecting: () => void;
    let unlistenError: () => void;

    async function setupListeners() {
      // Sincronização completa finalizada
      unlistenSync = await listen('network:sync-completed', () => {
        log.info('🔄 Network Sync Completed. Invaliding all queries.');
        queryClient.invalidateQueries();
        success('Sincronização', 'Dados atualizados via rede');
      });

      // Atualização de estoque pontual
      unlistenStock = await listen('network:stock-updated', (event) => {
        log.info('📦 Network Stock Updated:', event.payload);
        queryClient.invalidateQueries({ queryKey: productKeys.all });
      });

      // Tentativa de reconexão
      unlistenReconnecting = await listen<number>('network:reconnecting', (event) => {
        const attempt = event.payload;
        log.warn(`🔄 Reconectando ao Master... Tentativa #${attempt}`);
        if (attempt === 1) {
          warning('Rede', 'Conexão perdida. Reconectando...');
        }
      });

      // Erro de rede
      unlistenError = await listen<string>('network:error', (event) => {
        log.error('❌ Network Error:', event.payload);
      });
    }

    setupListeners();

    return () => {
      if (unlistenSync) unlistenSync();
      if (unlistenStock) unlistenStock();
      if (unlistenReconnecting) unlistenReconnecting();
      if (unlistenError) unlistenError();
    };
  }, [queryClient, success, warning]);
}
