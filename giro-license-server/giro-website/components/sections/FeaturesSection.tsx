'use client';

import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  DollarSign,
  HardDrive,
  Package,
  Printer,
  Shield,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: ShoppingCart,
    title: 'PDV Completo',
    description:
      'Interface rápida e intuitiva para vendas. Suporte a múltiplos métodos de pagamento.',
  },
  {
    icon: Package,
    title: 'Controle de Estoque',
    description: 'Gestão completa de produtos, categorias, validades e movimentações.',
  },
  {
    icon: DollarSign,
    title: 'Fiado Inteligente',
    description: 'Controle de crediário com histórico, limites e alertas automáticos.',
  },
  {
    icon: Printer,
    title: 'Impressora Térmica',
    description: 'Integração nativa com impressoras térmicas 80mm e 58mm.',
  },
  {
    icon: HardDrive,
    title: '100% Offline',
    description: 'Funciona sem internet. Dados salvos localmente com backup automático.',
  },
  {
    icon: Smartphone,
    title: 'App Mobile',
    description: 'Acompanhe vendas, estoque e alertas pelo celular (Android/iOS).',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    description: 'Dashboards e relatórios detalhados de vendas, estoque e lucro.',
  },
  {
    icon: Users,
    title: 'Multi-Usuário',
    description: 'Cadastro de funcionários com controle de permissões e histórico.',
  },
  {
    icon: AlertCircle,
    title: 'Alertas Inteligentes',
    description: 'Notificações de estoque baixo, produtos vencendo e metas.',
  },
  {
    icon: Shield,
    title: 'Sistema de Tutoriais',
    description: 'Guias interativos para facilitar o uso de todas as funcionalidades.',
  },
  {
    icon: TrendingUp,
    title: 'Controle de Caixa',
    description: 'Abertura, fechamento e sangrias com relatório completo.',
  },
  {
    icon: Zap,
    title: 'Alta Performance',
    description: 'Desenvolvido em Rust e React. Rápido mesmo com milhares de produtos.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Tudo que seu negócio precisa</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Sistema completo com funcionalidades pensadas para pequenos e médios comércios
          </p>
        </motion.div>

        {/* Grid de Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-emerald-500"
            >
              {/* Ícone */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Título */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>

              {/* Descrição */}
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>

              {/* Efeito hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
