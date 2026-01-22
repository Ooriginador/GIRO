import { Component, ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      '[ErrorBoundary] Error caught:',
      (error as Error)?.message ?? String(error),
      errorInfo?.componentStack ?? ''
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 text-red-900 border-4 border-red-500 rounded-xl m-10">
          <h1 className="text-2xl font-bold mb-4">Ops! O sistema encontrou um erro crítico.</h1>
          <p className="mb-4">Este erro impediu a renderização da tela.</p>
          <pre className="bg-red-100 p-4 rounded text-xs overflow-auto">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Tentar Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const RouteMonitor = () => {
  const location = useLocation();
  useEffect(() => {
    console.log(
      `[RouteMonitor] 🧭 Navigation: ${location.pathname}${location.search}${location.hash}`
    );

    // Check if root is literally empty
    const root = document.getElementById('root');
    if (root && root.innerHTML.trim() === '') {
      console.warn('[RouteMonitor] ⚠️ Root element is EMPTY but React is executing RouteMonitor');
    }
  }, [location]);
  return null;
};
