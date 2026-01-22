import { TutorialProvider } from '@/components/tutorial';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// Eliminando diagnóstico não utilizado
import './styles/globals.css';

// Configuração do TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

console.log('[main.tsx] Registering global error listeners');
window.addEventListener('error', (event) => {
  console.error('[Global Error]', (event.error as Error)?.message ?? String(event.error));
});
window.addEventListener('unhandledrejection', (event) => {
  console.error(
    '[Unhandled Promise Rejection]',
    (event.reason as Error)?.message ?? String(event.reason)
  );
});

console.log('[main.tsx] Starting ReactDOM.render');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TutorialProvider>
          <App />
        </TutorialProvider>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
console.log('[main.tsx] Render called');
