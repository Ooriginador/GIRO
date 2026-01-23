'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Headphones, Loader2, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

const plans = {
  monthly: {
    name: 'Mensal',
    price: 'R$ 99,90',
    period: '/mês',
    description: 'Ideal para testar o sistema',
    badge: '',
  },
  semiannual: {
    name: 'Semestral',
    price: 'R$ 599,40',
    period: '/6 meses',
    description: 'Economia de R$ 5 por mês',
    badge: 'Popular',
  },
  annual: {
    name: 'Anual',
    price: 'R$ 999,00',
    period: '/ano',
    description: 'Economia de R$ 16 por mês',
    badge: 'Melhor Valor',
  },
  lifetime: {
    name: 'Vitalício',
    price: 'R$ 2.499,00',
    period: 'único',
    description: '2 anos suporte + uso eterno',
    badge: 'Para Sempre',
  },
};

type PlanType = keyof typeof plans;

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planParam = searchParams.get('plan') as PlanType | null;

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(planParam || 'monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company: '',
    document: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simular registro
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Redirecionar para checkout
    router.push(`/checkout?plan=${selectedPlan}`);
  };

  const validateStep1 = () => {
    return formData.name && formData.email && formData.phone;
  };

  const validateStep2 = () => {
    return (
      formData.password &&
      formData.password === formData.confirmPassword &&
      formData.password.length >= 8
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            GIRO
          </Link>
          <div className="flex gap-4">
            <Link href="/pricing">
              <Button variant="ghost">Preços</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Já tenho conta</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <Link
            href="/pricing"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para preços
          </Link>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Criar sua conta</CardTitle>
                  <CardDescription>
                    Preencha os dados abaixo para começar a usar o GIRO
                  </CardDescription>
                  {/* Progress indicator */}
                  <div className="flex gap-2 mt-4">
                    <div
                      className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`}
                    />
                    <div
                      className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}
                    />
                    <div
                      className={`h-1 flex-1 rounded ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    {/* Step 1 - Dados pessoais */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <h3 className="font-medium mb-4">Dados pessoais</h3>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Nome completo</Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="Seu nome completo"
                              value={formData.name}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="seu@email.com"
                              value={formData.email}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="phone">WhatsApp</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              placeholder="(11) 99999-9999"
                              value={formData.phone}
                              onChange={handleChange}
                              required
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          className="w-full mt-6"
                          onClick={() => setStep(2)}
                          disabled={!validateStep1()}
                        >
                          Continuar
                        </Button>
                      </div>
                    )}

                    {/* Step 2 - Segurança */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <h3 className="font-medium mb-4">Criar senha</h3>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                              id="password"
                              name="password"
                              type="password"
                              placeholder="Mínimo 8 caracteres"
                              value={formData.password}
                              onChange={handleChange}
                              required
                              minLength={8}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirmar senha</Label>
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type="password"
                              placeholder="Digite a senha novamente"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              required
                            />
                            {formData.confirmPassword &&
                              formData.password !== formData.confirmPassword && (
                                <p className="text-sm text-red-500">As senhas não conferem</p>
                              )}
                          </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                          <Button type="button" variant="outline" onClick={() => setStep(1)}>
                            Voltar
                          </Button>
                          <Button
                            type="button"
                            className="flex-1"
                            onClick={() => setStep(3)}
                            disabled={!validateStep2()}
                          >
                            Continuar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3 - Empresa */}
                    {step === 3 && (
                      <div className="space-y-4">
                        <h3 className="font-medium mb-4">Dados da empresa (opcional)</h3>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="company">Nome da empresa</Label>
                            <Input
                              id="company"
                              name="company"
                              placeholder="Sua empresa ou estabelecimento"
                              value={formData.company}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="document">CPF/CNPJ</Label>
                            <Input
                              id="document"
                              name="document"
                              placeholder="Para emissão de NF"
                              value={formData.document}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                          <Button type="button" variant="outline" onClick={() => setStep(2)}>
                            Voltar
                          </Button>
                          <Button type="submit" className="flex-1" disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Criando conta...
                              </>
                            ) : (
                              'Ir para pagamento'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Plano selecionado */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Plano selecionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(Object.keys(plans) as PlanType[]).map((planKey) => {
                      const plan = plans[planKey];
                      return (
                        <button
                          key={planKey}
                          type="button"
                          onClick={() => setSelectedPlan(planKey)}
                          className={`w-full p-3 rounded-lg border text-left transition ${
                            selectedPlan === planKey
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{plan.name}</span>
                            {plan.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {plan.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-lg font-bold text-primary">{plan.price}</div>
                          <div className="text-xs text-muted-foreground">{plan.period}</div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Benefits */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">7 dias grátis</div>
                        <div className="text-xs text-muted-foreground">
                          Cancele a qualquer momento
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Ativação imediata</div>
                        <div className="text-xs text-muted-foreground">
                          Após confirmação do pagamento
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Headphones className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Suporte humanizado</div>
                        <div className="text-xs text-muted-foreground">
                          Via WhatsApp em horário comercial
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 GIRO - Sistema PDV. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
