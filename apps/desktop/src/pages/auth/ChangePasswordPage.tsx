/**
 * ChangePasswordPage - Alteração de senha do usuário logado
 */

import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { passwordApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ChangePasswordPageProps {
  isFirstLogin?: boolean;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ isFirstLogin = false }) => {
  const navigate = useNavigate();
  const { employee } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validation = usePasswordValidation(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employee) {
      setError('Usuário não autenticado');
      return;
    }

    // Validações
    if (!isFirstLogin && !currentPassword.trim()) {
      setError('Senha atual é obrigatória');
      return;
    }

    if (!validation.isValid) {
      setError('Nova senha não atende aos requisitos de segurança');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (!isFirstLogin && currentPassword === newPassword) {
      setError('A nova senha deve ser diferente da atual');
      return;
    }

    setIsLoading(true);

    try {
      await passwordApi.changePassword({
        employeeId: employee.id,
        currentPassword: isFirstLogin ? undefined : currentPassword,
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao alterar senha. Verifique os dados e tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    if (isFirstLogin) {
      navigate('/'); // Redirecionar para dashboard
    } else {
      navigate(-1); // Voltar à página anterior
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
            <CardTitle className="text-center">Senha Alterada!</CardTitle>
            <CardDescription className="text-center">
              Sua senha foi atualizada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSuccess} className="w-full">
              {isFirstLogin ? 'Ir para Dashboard' : 'Continuar'}
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
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>{isFirstLogin ? 'Configure sua Senha' : 'Alterar Senha'}</CardTitle>
          </div>
          <CardDescription>
            {isFirstLogin
              ? 'Por segurança, defina uma senha forte para sua conta'
              : 'Digite sua senha atual e escolha uma nova'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isFirstLogin && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este é seu primeiro acesso. Defina uma senha forte que contenha letras, números e
                  caracteres especiais.
                </AlertDescription>
              </Alert>
            )}

            {!isFirstLogin && (
              <PasswordInput
                id="current-password"
                label="Senha Atual"
                placeholder="Digite sua senha atual"
                value={currentPassword}
                onChange={setCurrentPassword}
                required
                autoFocus
                disabled={isLoading}
                autoComplete="current-password"
              />
            )}

            <PasswordInput
              id="new-password"
              label="Nova Senha"
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={setNewPassword}
              required
              autoFocus={isFirstLogin}
              disabled={isLoading}
              autoComplete="new-password"
            />

            {newPassword && <PasswordStrengthIndicator password={newPassword} />}

            <PasswordInput
              id="confirm-password"
              label="Confirmar Nova Senha"
              placeholder="Digite novamente"
              value={confirmPassword}
              onChange={setConfirmPassword}
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
              {!isFirstLogin && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  (!isFirstLogin && !currentPassword) ||
                  !validation.isValid ||
                  newPassword !== confirmPassword
                }
                className={isFirstLogin ? 'w-full' : 'flex-1'}
              >
                {isLoading ? 'Salvando...' : isFirstLogin ? 'Definir Senha' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
