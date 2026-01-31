import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect, useState } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const { validatePassword } = useAuthStore();
  const [strength, setStrength] = useState({
    score: 0,
    feedback: [] as string[],
    isValid: false,
  });

  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, feedback: [], isValid: false });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await validatePassword(password);
        setStrength(result);
      } catch (error) {
        console.error('Failed to validate password strength:', error);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [password, validatePassword]);

  if (!password) return null;

  // Cores baseadas no score (0-4)
  const colors = [
    'bg-red-500', // 0: Muito fraca
    'bg-orange-500', // 1: Fraca
    'bg-yellow-500', // 2: Média
    'bg-blue-500', // 3: Forte
    'bg-green-500', // 4: Muito forte
  ];

  const labels = ['Muito Fraca', 'Fraca', 'Média', 'Forte', 'Muito Forte'];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground font-medium">Força da senha:</span>
        <span
          className={cn(
            'text-xs font-bold transition-colors',
            strength.score < 2
              ? 'text-red-500'
              : strength.score < 3
              ? 'text-yellow-500'
              : 'text-green-500'
          )}
        >
          {labels[strength.score]}
        </span>
      </div>

      <div className="flex gap-1 h-1.5 w-full">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              'h-full flex-1 rounded-full transition-all duration-300',
              index < strength.score ? colors[strength.score] : 'bg-muted'
            )}
          />
        ))}
      </div>

      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 mt-2">
          {strength.feedback.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
