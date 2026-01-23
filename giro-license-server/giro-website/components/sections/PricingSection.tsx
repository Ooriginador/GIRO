'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Building2, Check, Crown, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Mensal',
    price: '99,90',
    period: '/mês',
    icon: Zap,
    description: 'Ideal para começar sem compromisso',
    features: [
      '1 licença de uso',
      'Desktop Windows/Linux',
      'App Mobile Android/iOS',
      'Suporte por WhatsApp',
      'Atualizações incluídas',
      'Backup automático',
    ],
    cta: 'Assinar Agora',
    popular: false,
  },
  {
    name: 'Semestral',
    price: '599,40',
    period: '/6 meses',
    icon: Zap,
    description: 'Economia de 14% em relação ao mensal',
    features: [
      '1 licença de uso',
      'Desktop Windows/Linux',
      'App Mobile Android/iOS',
      'Suporte prioritário',
      'Atualizações incluídas',
      'Backup automático',
      'Economia de 14%',
    ],
    cta: 'Assinar Agora',
    popular: false,
  },
  {
    name: 'Anual',
    price: '999,00',
    period: '/ano',
    icon: Crown,
    description: '2 meses grátis + economia de R$ 200',
    badge: 'Mais Popular',
    features: [
      '1 licença de uso',
      'Desktop Windows/Linux',
      'App Mobile Android/iOS',
      'Suporte prioritário',
      'Atualizações incluídas',
      'Backup automático',
      '2 meses grátis',
      'Economia de R$ 200',
    ],
    cta: 'Assinar Agora',
    popular: true,
  },
  {
    name: 'Vitalício',
    price: '2.499,00',
    period: 'pagamento único',
    icon: Building2,
    description: 'Licença permanente - 5 anos de suporte',
    features: [
      '1 licença permanente',
      'Desktop Windows/Linux',
      'App Mobile Android/iOS',
      '5 anos de suporte',
      'Atualizações vitalícias',
      'Backup automático',
      'Sem mensalidades',
      'Melhor custo-benefício',
    ],
    cta: 'Comprar Agora',
    popular: false,
  },
];

export function PricingSection() {
  const handleSubscribe = async (plan: string, interval: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Por favor, faça login para continuar a compra.');
      window.location.href = `/login?redirect=/#precos`;
      return;
    }

    try {
      // In a real app, this would redirect to Stripe
      // const session = await createCheckoutSession(plan, interval);
      // window.location.href = session.url;

      console.log('Checkout:', { plan, interval });

      const { createMercadoPagoPreference } = await import('@/lib/api');
      // Convert "99,90" to 99.90
      const price = parseFloat(
        plans
          .find((p) => p.name.toLowerCase() === plan)
          ?.price.replace('.', '')
          .replace(',', '.') || '0'
      );

      const res = await createMercadoPagoPreference(`Plano GIRO ${plan}`, price);
      if (res.init_point) window.location.href = res.init_point;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erro ao iniciar checkout. Tente novamente.');
    }
  };

  return (
    <section id="precos" className="py-24 bg-linear-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Planos transparentes</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Escolha o plano ideal para o seu negócio. Sem taxas ocultas, sem surpresas.
          </p>
        </motion.div>

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                'relative p-8 bg-white rounded-2xl shadow-lg border-2 transition-all duration-300',
                plan.popular
                  ? 'border-emerald-500 shadow-emerald-500/20 scale-105'
                  : 'border-slate-200 hover:border-emerald-300'
              )}
            >
              {/* Badge Popular */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-linear-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold rounded-full shadow-lg">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Ícone */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-linear-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <plan.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
              </div>

              {/* Descrição */}
              <p className="text-slate-600 text-sm mb-6">{plan.description}</p>

              {/* Preço */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">R$</span>
                  <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                </div>
                <span className="text-slate-600 text-sm">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() =>
                  handleSubscribe(
                    plan.name.toLowerCase(),
                    plan.period.includes('ano')
                      ? 'yearly'
                      : plan.period.includes('6 meses')
                      ? 'semiannual'
                      : 'monthly'
                  )
                }
                className={cn(
                  'w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300',
                  plan.popular
                    ? 'bg-linear-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-emerald-500/50'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                )}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Nota de rodapé */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-slate-500 text-sm mt-12"
        >
          💳 Aceitamos PIX, Cartão de Crédito (até 12x) e Boleto
        </motion.p>
      </div>
    </section>
  );
}
