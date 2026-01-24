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
  const { success } = useToast();

  useEffect(() => {
    let unlistenSync: () => void;
    let unlistenStock: () => void;

    async function setupListeners() {
      // Sincronização completa finalizada
      unlistenSync = await listen('network:sync-completed', () => {
        console.log('🔄 Network Sync Completed. Invaliding all queries.');
        queryClient.invalidateQueries();
        success('Sincronização', 'Dados atualizados via rede');
      });

      // Atualização de estoque pontual
      unlistenStock = await listen('network:stock-updated', (event) => {
        console.log('📦 Network Stock Updated:', event.payload);
        queryClient.invalidateQueries({ queryKey: productKeys.all });
        // Se quisermos ser mais específicos:
        // queryClient.invalidateQueries({ queryKey: productKeys.detail(event.payload.productId) });
      });
    }

    setupListeners();

    return () => {
      if (unlistenSync) unlistenSync();
      if (unlistenStock) unlistenStock();
    };
  }, [queryClient, success]);
}
