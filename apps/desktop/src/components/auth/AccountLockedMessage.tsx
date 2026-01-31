import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';

interface AccountLockedMessageProps {
  failedAttempts: number;
  lockoutRemainingSeconds?: number;
}

export function AccountLockedMessage({
  failedAttempts,
  lockoutRemainingSeconds,
}: AccountLockedMessageProps) {
  // Conversão segura de segundos para mm:ss
  const remaining = lockoutRemainingSeconds || 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  if (remaining > 0) {
    return (
      <Alert
        variant="destructive"
        className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
      >
        <Clock className="h-4 w-4" />
        <AlertTitle>Conta Bloqueada Temporariamente</AlertTitle>
        <AlertDescription>
          Muitas tentativas falhadas. Tente novamente em <strong>{timeDisplay}</strong>.
        </AlertDescription>
      </Alert>
    );
  }

  if (failedAttempts > 0) {
    const attemptsLeft = 5 - failedAttempts;
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Senha incorreta. {attemptsLeft} tentativa(s) restante(s) antes do bloqueio.</span>
      </div>
    );
  }

  return null;
}
