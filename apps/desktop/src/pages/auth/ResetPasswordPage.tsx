/**
 * ResetPasswordPage - Confirmação de reset de senha com token
 */

import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { passwordApi } from '@/lib/auth-api';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validation = usePasswordValidation(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!token.trim()) {
      setError('Token é obrigatório');
      return;
    }

    if (!validation.isValid) {
      setError('Senha não atende aos requisitos de segurança');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      await passwordApi.resetPasswordWithToken({
        token: token.trim(),
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao redefinir senha. Verifique se o token está correto e não expirou.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Senha Redefinida!</CardTitle>
            <CardDescription className="text-center">
              Sua senha foi alterada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>Digite o token recebido e sua nova senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="token">Token de Recuperação</Label>
              <Input
                id="token"
                type="text"
                placeholder="Cole o token recebido por email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                autoFocus={!tokenFromUrl}
                disabled={isLoading}
                className="font-mono text-sm"
              />
            </div>

            <PasswordInput
              id="new-password"
              label="Nova Senha"
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />

            {newPassword && <PasswordStrengthIndicator password={newPassword} />}

            <PasswordInput
              id="confirm-password"
              label="Confirmar Senha"
              placeholder="Digite novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              error={
                confirmPassword && newPassword !== confirmPassword
                  ? 'As senhas não coincidem'
                  : undefined
              }
              autoComplete="new-password"
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/login')}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading || !token || !validation.isValid || newPassword !== confirmPassword
                }
                className="flex-1"
              >
                {isLoading ? 'Salvando...' : 'Redefinir Senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
