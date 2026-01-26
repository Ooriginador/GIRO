import { authLogger as log } from '@/lib/logger';
/**
 * @file LoginPage - Tela de login
 * @description Autenticação por PIN de funcionário
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authenticateEmployee } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { Lock } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { login } = useAuthStore();
  const { isConfigured } = useBusinessProfile();

  useEffect(() => {
    log.debug(' Mounted');
    inputRef.current?.focus();
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleLogin = async () => {
    if (pin.length < 4) {
      setError('PIN deve ter pelo menos 4 dígitos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Chama o backend Rust via Tauri
      const employee = await authenticateEmployee(pin);

      if (employee) {
        // Login bem-sucedido
        login({
          id: employee.id,
          name: employee.name,
          role: employee.role,
          email: employee.email,
          pin,
        });

        // Redireciona baseado no status de configuração
        if (!isConfigured) {
          // Primeira vez - mostrar wizard de perfil
          navigate('/wizard');
        } else {
          // Já configurado - ir para dashboard
          navigate('/');
        }
      } else {
        setError('PIN incorreto');
        setPin('');
      }
    } catch (err) {
      console.error('Erro ao autenticar:', (err as Error)?.message ?? String(err));
      setError('Erro ao autenticar. Verifique se o servidor está rodando.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleNumberClick(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Enter' && pin.length >= 4) {
      handleLogin();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/logo.png" alt="GIRO" className="h-16 w-16 rounded-xl" />
          </div>
          <CardTitle className="text-2xl">GIRO</CardTitle>
          <CardDescription>
            <p>Digite seu PIN para entrar</p>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Display do PIN */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex h-12 w-10 items-center justify-center rounded-lg border-2 text-2xl font-bold transition-colors',
                  i < pin.length
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted bg-muted/50'
                )}
              >
                {i < pin.length ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Erro */}
          {error && <p className="text-center text-sm text-destructive">{error}</p>}

          {/* Teclado Numérico */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map((key) => (
              <Button
                key={key}
                variant={key === 'C' ? 'destructive' : 'outline'}
                size="lg"
                className="h-14 text-xl font-medium"
                onClick={() => {
                  if (key === 'C') handleClear();
                  else if (key === '←') handleBackspace();
                  else handleNumberClick(key);
                }}
              >
                {key}
              </Button>
            ))}
          </div>

          {/* Botão de Login */}
          <Button
            className="w-full h-12 text-lg"
            disabled={pin.length < 4 || isLoading}
            onClick={handleLogin}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Entrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Entrar
              </span>
            )}
          </Button>

          {/* Versão do sistema */}
          <p className="text-center text-xs text-muted-foreground">GIRO v1.0.0</p>
        </CardContent>
      </Card>
    </div>
  );
};
