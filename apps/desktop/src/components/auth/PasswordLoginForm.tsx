import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountLockedMessage } from './AccountLockedMessage';
import { PasswordInput } from './PasswordInput';

interface PasswordLoginFormProps {
  onBack: () => void;
}

export function PasswordLoginForm({ onBack }: PasswordLoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutDuration, setLockoutDuration] = useState(0);

  const navigate = useNavigate();
  const { loginWithPassword } = useAuthStore();
  const { isConfigured } = useBusinessProfile();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithPassword(username, password);

      // Sucesso - redirecionar
      if (!isConfigured) {
        navigate('/wizard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const message = err.message || 'Erro ao autenticar';

      if (message === 'PASSWORD_CHANGE_REQUIRED') {
        navigate('/auth/change-password');
        return;
      }

      if (message.includes('Conta bloqueada por')) {
        // Parse da mensagem para extrair tentativas e duração
        // "Conta bloqueada por 5 tentativas falhadas. Tente novamente em X segundos"
        const attemptsMatch = message.match(/por (\d+) tentativas/);
        const secondsMatch = message.match(/em (\d+) segundos/);

        if (attemptsMatch) setFailedAttempts(parseInt(attemptsMatch[1]));
        if (secondsMatch) setLockoutDuration(parseInt(secondsMatch[1]));
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {/* Mensagem de Bloqueio/Erro */}
      <div className="space-y-2">
        {(failedAttempts > 0 || lockoutDuration > 0) && (
          <AccountLockedMessage
            failedAttempts={failedAttempts}
            lockoutDurationMinutes={15}
            lockoutRemainingSeconds={lockoutDuration}
          />
        )}

        {error && !error.includes('Conta bloqueada') && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Usuário ou CPF</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Digite seu usuário"
            autoFocus
            disabled={isLoading || lockoutDuration > 0}
          />
        </div>

        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Digite sua senha"
          disabled={isLoading || lockoutDuration > 0}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/auth/forgot-password')}
            className="text-sm text-primary hover:underline"
            disabled={isLoading}
          >
            Esqueceu a senha?
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="w-1/3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button type="submit" className="w-2/3" disabled={isLoading || lockoutDuration > 0}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar com Senha'
          )}
        </Button>
      </div>
    </form>
  );
}
