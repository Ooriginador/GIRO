'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, Download, Shield, Star, Zap } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 99.9,
    period: '/mês',
    description: 'Ideal para testar o sistema',
    features: [
      '1 licença por máquina',
      'Todas as funcionalidades',
      'Suporte por email',
      'Atualizações incluídas',
      'GIRO Mobile incluído',
    ],
    cta: 'Começar Agora',
    popular: false,
  },
  {
    id: 'semiannual',
    name: 'Semestral',
    price: 599.4,
    originalPrice: 599.4,
    period: '/6 meses',
    description: 'Economia de 14%',
    features: [
      'Tudo do plano Mensal',
      '14% de desconto',
      'Suporte prioritário',
      'Backup em nuvem',
      'Relatórios avançados',
    ],
    cta: 'Escolher Semestral',
    popular: false,
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 999.0,
    originalPrice: 1198.8,
    period: '/ano',
    description: 'Mais popular - 17% off',
    features: [
      'Tudo do plano Semestral',
      '17% de desconto',
      'Dashboard web completo',
      'Alertas push no celular',
      'Suporte via WhatsApp',
    ],
    cta: 'Escolher Anual',
    popular: true,
  },
  {
    id: 'lifetime',
    name: 'Vitalício',
    price: 2499.0,
    period: ' (pagamento único)',
    description: 'Pague uma vez, use para sempre',
    features: [
      'Licença permanente',
      '2 anos de suporte incluído',
      '5 anos de validação online',
      'Modo offline após 5 anos',
      'Atualizações por 2 anos',
      'Prioridade no suporte',
    ],
    cta: 'Comprar Vitalício',
    popular: false,
    isLifetime: true,
  },
];

export default function PricingPage() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/register">
              <Button>Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <Badge className="mb-4" variant="secondary">
            <Zap className="w-3 h-3 mr-1" />
            Oferta de Lançamento
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Escolha o plano ideal para seu negócio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema de PDV completo para mercearias, padarias e minimercados.
            <br />
            Funciona 100% offline com sincronização em nuvem.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-105' : ''
                } ${
                  plan.isLifetime ? 'bg-gradient-to-b from-amber-50 to-white border-amber-300' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">
                      <Star className="w-3 h-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                {plan.isLifetime && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500">
                      <Shield className="w-3 h-3 mr-1" />
                      Melhor Custo-Benefício
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    {plan.originalPrice && (
                      <div className="text-sm text-muted-foreground line-through">
                        {formatCurrency(plan.originalPrice)}
                      </div>
                    )}
                    <span className="text-4xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={`/register?plan=${plan.id}`}>
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Todos os planos incluem</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Download Imediato</h3>
              <p className="text-sm text-muted-foreground">
                Baixe e instale em minutos. Funciona em Windows e Linux.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Licença por Hardware</h3>
              <p className="text-sm text-muted-foreground">
                Sua licença é vinculada à máquina. Transferência fácil pelo painel.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Funciona Offline</h3>
              <p className="text-sm text-muted-foreground">
                Nunca para. Sincroniza automaticamente quando conectar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">O que acontece quando minha licença expira?</h3>
              <p className="text-muted-foreground">
                O sistema continua funcionando em modo leitura por 7 dias. Você pode consultar
                dados, mas não pode fazer novas vendas. Renove para continuar operando.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Posso trocar de computador?</h3>
              <p className="text-muted-foreground">
                Sim! Basta acessar o painel e fazer a transferência da licença. O processo é
                instantâneo e você pode fazer em qualquer momento.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">O que inclui a licença vitalícia?</h3>
              <p className="text-muted-foreground">
                A licença vitalícia inclui 2 anos de suporte e atualizações, 5 anos de validação com
                o servidor, e após isso o sistema funciona 100% offline para sempre.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Vocês emitem nota fiscal?</h3>
              <p className="text-muted-foreground">
                Sim! Emitimos NFS-e para todas as vendas. A nota é enviada automaticamente para o
                email cadastrado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para profissionalizar seu negócio?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Comece agora e tenha seu sistema funcionando em menos de 10 minutos.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Criar Conta Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 GIRO - Sistema PDV. Todos os direitos reservados.</p>
          <p className="mt-2">
            Desenvolvido por <strong>Arkheion Corp</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}
