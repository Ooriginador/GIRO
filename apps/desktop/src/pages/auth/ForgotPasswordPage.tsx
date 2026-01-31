/**
 * ForgotPasswordPage - Recuperação de senha
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { passwordApi, type PasswordResetResponse } from '@/lib/auth-api';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PasswordResetResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await passwordApi.requestPasswordReset({ email });
      setResponse(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao solicitar recuperação de senha. Verifique o email e tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (response) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center">Email Enviado!</CardTitle>
            <CardDescription className="text-center">
              Instruções para recuperação de senha foram enviadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {response.sentTo ? (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Verifique a caixa de entrada de <strong>{response.sentTo}</strong> e siga as
                  instruções para redefinir sua senha.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Seu token de recuperação:</p>
                  <code className="block bg-muted p-3 rounded text-sm font-mono break-all">
                    {response.token}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Guarde este token em local seguro. Válido até{' '}
                    {new Date(response.expiresAt).toLocaleString('pt-BR')}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/login')} className="flex-1">
                Voltar ao Login
              </Button>
              {!response.sentTo && (
                <Button onClick={() => navigate('/auth/reset-password')} className="flex-1">
                  Usar Token
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Esqueceu a Senha?</CardTitle>
          <CardDescription>Digite seu email para receber instruções de recuperação</CardDescription>
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
              <Label htmlFor="email">Email Cadastrado</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Digite o email cadastrado no sistema</p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/login')}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button type="submit" disabled={isLoading || !email} className="flex-1">
                {isLoading ? 'Enviando...' : 'Enviar Instruções'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
