/**
 * @file InitialSetupPage - Wizard de Configuração Inicial
 * @description Primeira tela após instalação - cria o primeiro admin
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateFirstAdmin } from '@/hooks/useSetup';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { CheckCircle2, Loader2, Shield, UserPlus } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormData {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  pin: string;
  confirmPin: string;
}

interface FormErrors {
  name?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  pin?: string;
  confirmPin?: string;
}

export const InitialSetupPage: FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'welcome' | 'form' | 'success'>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    pin: '',
    confirmPin: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { login } = useAuthStore();
  const createAdmin = useCreateFirstAdmin();

  useEffect(() => {
    // No mount check if admin exists - if they are here manually we should probably let them work
    // but the Guard in App.tsx already sends them here if needed.
  }, []);

  const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;

    // Validação básica de CPF
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(10))) return false;

    return true;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    const cleanedCPF = formData.cpf.replace(/\D/g, '');
    if (!cleanedCPF) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(cleanedCPF)) {
      newErrors.cpf = 'CPF inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.pin) {
      newErrors.pin = 'PIN é obrigatório';
    } else if (formData.pin.length < 4) {
      newErrors.pin = 'PIN deve ter pelo menos 4 dígitos';
    } else if (formData.pin.length > 6) {
      newErrors.pin = 'PIN deve ter no máximo 6 dígitos';
    } else if (!/^\d+$/.test(formData.pin)) {
      newErrors.pin = 'PIN deve conter apenas números';
    }

    if (formData.pin !== formData.confirmPin) {
      newErrors.confirmPin = 'PINs não conferem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const admin = await createAdmin.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        pin: formData.pin,
      });

      // Login imediato para hidratar o estado
      login({
        id: admin.id,
        name: admin.name,
        role: 'ADMIN',
        email: admin.email,
        pin: formData.pin,
      });

      setStep('success');

      // Redirecionar para o wizard de perfil de negócio após breve sucesso
      setTimeout(() => {
        navigate('/wizard', { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Erro ao criar admin:', err);
      setErrors({ name: 'Erro ao criar administrador. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCPF = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
    if (!match) return value;

    let formatted = match[1] || '';
    if (match[2]) formatted += `.${match[2]}`;
    if (match[3]) formatted += `.${match[3]}`;
    if (match[4]) formatted += `-${match[4]}`;

    return formatted;
  };

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
    if (!match) return value;

    let formatted = '';
    if (match[1]) formatted += `(${match[1]}`;
    if (match[2]) formatted += `) ${match[2]}`;
    if (match[3]) formatted += `-${match[3]}`;

    return formatted || '';
  };

  if (step === 'welcome') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl">Bem-vindo ao GIRO!</CardTitle>
            <CardDescription className="text-base">
              Sistema de Gestão Comercial Completo
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4 rounded-lg border bg-muted/50 p-6">
              <h3 className="font-semibold">🎉 Primeira execução detectada</h3>
              <p className="text-sm text-muted-foreground">
                Para começar a usar o GIRO, vamos criar o primeiro administrador do sistema. Este
                usuário terá acesso total e poderá cadastrar outros funcionários posteriormente.
              </p>

              <div className="space-y-2 text-sm">
                <h4 className="font-medium">O administrador poderá:</h4>
                <ul className="space-y-1 pl-5 text-muted-foreground">
                  <li className="list-disc">Cadastrar e gerenciar funcionários</li>
                  <li className="list-disc">Configurar o sistema completo</li>
                  <li className="list-disc">Acessar todos os relatórios</li>
                  <li className="list-disc">Realizar vendas e operações de caixa</li>
                </ul>
              </div>
            </div>

            <Button onClick={() => setStep('form')} className="w-full" size="lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Criar Primeiro Administrador
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>

            <h2 className="mb-2 text-2xl font-bold">Administrador Criado!</h2>
            <p className="mb-6 text-muted-foreground">Redirecionando para seleção de perfil...</p>

            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Criar Primeiro Administrador</CardTitle>
          <CardDescription>Preencha os dados do administrador principal do sistema</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setErrors({ ...errors, name: undefined });
                }}
                className={cn(errors.name && 'border-destructive')}
                placeholder="João da Silva"
                autoFocus
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <Label htmlFor="cpf">
                CPF <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => {
                  const formatted = formatCPF(e.target.value);
                  setFormData({ ...formData, cpf: formatted });
                  setErrors({ ...errors, cpf: undefined });
                }}
                className={cn(errors.cpf && 'border-destructive')}
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Telefone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setFormData({ ...formData, phone: formatted });
                  setErrors({ ...errors, phone: undefined });
                }}
                className={cn(errors.phone && 'border-destructive')}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setErrors({ ...errors, email: undefined });
                }}
                className={cn(errors.email && 'border-destructive')}
                placeholder="admin@exemplo.com"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            {/* PIN */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pin">
                  PIN (4-6 dígitos) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, pin: value });
                    setErrors({ ...errors, pin: undefined, confirmPin: undefined });
                  }}
                  className={cn(errors.pin && 'border-destructive')}
                  placeholder="••••"
                  maxLength={6}
                />
                {errors.pin && <p className="text-sm text-destructive">{errors.pin}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPin">
                  Confirmar PIN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  value={formData.confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, confirmPin: value });
                    setErrors({ ...errors, confirmPin: undefined });
                  }}
                  className={cn(errors.confirmPin && 'border-destructive')}
                  placeholder="••••"
                  maxLength={6}
                />
                {errors.confirmPin && (
                  <p className="text-sm text-destructive">{errors.confirmPin}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('welcome')}
                className="w-full"
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Criar Administrador
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSetupPage;
