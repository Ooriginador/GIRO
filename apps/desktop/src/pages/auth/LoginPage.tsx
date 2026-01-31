import { authLogger as log } from '@/lib/logger';
/**
 * @file LoginPage - Tela de login
 * @description Autenticação por PIN ou Senha (Dual Auth)
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordLoginForm } from '@/components/auth/PasswordLoginForm';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: FC = () => {
  const [mode, setMode] = useState<'pin' | 'password'>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { loginWithPin } = useAuthStore();
  const { isConfigured } = useBusinessProfile();

  useEffect(() => {
    log.debug(' Mounted');
    if (mode === 'pin') {
      inputRef.current?.focus();
    }
  }, [mode]);

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
      // Chama o backend Rust via Store (novo sistema de auth)
      await loginWithPin(pin);

      // Redireciona baseado no status de configuração
      if (!isConfigured) {
        // Primeira vez - mostrar wizard de perfil
        navigate('/wizard');
      } else {
        // Já configurado - ir para dashboard
        navigate('/');
      }
    } catch (err) {
      console.error('Erro ao autenticar:', (err as Error)?.message ?? String(err));
      setError('PIN incorreto ou erro de conexão.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== 'pin') return;

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
            {mode === 'pin' 
              ? 'Digite seu PIN para entrar' 
              : 'Login Administrativo'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === 'pin' ? (
            <div className="space-y-6">
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
                    disabled={isLoading}
                  >
                    {key}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full h-12 text-lg" 
                  onClick={handleLogin}
                  disabled={pin.length < 4 || isLoading}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-primary"
                  onClick={() => setMode('password')}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Sou Administrador/Gerente
                </Button>
              </div>
            </div>
          ) : (
            <>
              <PasswordLoginForm onBack={() => setMode('pin')} />
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Versão (fora do card) */}
      <div className="fixed bottom-4 text-xs text-muted-foreground">
        GIRO v1.0.0
      </div>
    </div>
  );
};
