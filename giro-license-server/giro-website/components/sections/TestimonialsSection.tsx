'use client';

import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Carlos Silva',
    business: 'Mercearia do Bairro',
    city: 'São Paulo, SP',
    rating: 5,
    text: 'O GIRO transformou minha mercearia. Agora sei exatamente o que tenho em estoque e o lucro de cada produto. Recomendo!',
    avatar: 'CS',
  },
  {
    name: 'Ana Rodrigues',
    business: 'Padaria Pão Quente',
    city: 'Rio de Janeiro, RJ',
    rating: 5,
    text: 'Sistema muito completo e fácil de usar. A impressora térmica economizou muito papel. Melhor investimento que fiz!',
    avatar: 'AR',
  },
  {
    name: 'João Pereira',
    business: 'Açougue Central',
    city: 'Belo Horizonte, MG',
    rating: 5,
    text: 'Funciona offline perfeito! Nunca mais perdi vendas por falta de internet. O app mobile é excelente para conferir estoque.',
    avatar: 'JP',
  },
];

export function TestimonialsSection() {
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
          <h2 className="text-4xl font-bold text-slate-900 mb-4">O que nossos clientes dizem</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Depoimentos reais de empreendedores que confiam no GIRO
          </p>
        </motion.div>

        {/* Grid de depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative p-8 bg-white rounded-2xl shadow-lg border border-slate-200"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-emerald-500/20" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Texto */}
              <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.text}"</p>

              {/* Autor */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-600">{testimonial.business}</p>
                  <p className="text-xs text-slate-500">{testimonial.city}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
