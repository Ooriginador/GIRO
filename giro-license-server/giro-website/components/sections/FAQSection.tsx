"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "O GIRO funciona sem internet?",
    answer:
      "Sim! O GIRO Desktop funciona 100% offline. Todos os dados ficam salvos localmente no seu computador. A conexão com internet só é necessária para ativar a licença e sincronizar com o app mobile.",
  },
  {
    question: "Preciso pagar mensalidade?",
    answer:
      "Depende do plano escolhido. O plano Mensal tem renovação automática de R$ 99,90/mês. O plano Anual é R$ 999/ano. Já o plano Vitalício é pagamento único de R$ 2.499 e você nunca mais paga.",
  },
  {
    question: "Quantos produtos posso cadastrar?",
    answer:
      "Ilimitados! O GIRO não tem limite de produtos, vendas ou clientes. Você pode cadastrar quantos produtos precisar.",
  },
  {
    question: "Funciona em quantos computadores?",
    answer:
      "Cada licença é vinculada a um único computador. Se você tem mais de um caixa, precisará de uma licença para cada máquina. Entre em contato para licenças múltiplas com desconto.",
  },
  {
    question: "Quais impressoras térmicas são compatíveis?",
    answer:
      "O GIRO funciona com impressoras térmicas de 80mm e 58mm que usam protocolo ESC/POS. Marcas como Elgin, Bematech, Epson e outras são compatíveis.",
  },
  {
    question: "Como funciona o suporte?",
    answer:
      "Oferecemos suporte via WhatsApp de segunda a sexta, das 9h às 18h. Planos anuais e vitalícios têm prioridade no atendimento.",
  },
  {
    question: "Posso migrar meus dados de outro sistema?",
    answer:
      "Sim! Podemos ajudar a importar seus produtos e clientes de planilhas Excel ou de outros sistemas. Entre em contato para mais detalhes.",
  },
  {
    question: "O app mobile é pago separadamente?",
    answer:
      "Não! O app mobile (Android e iOS) já está incluído em todos os planos sem custo adicional.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-slate-600">
            Tire suas dúvidas sobre o GIRO
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="border border-slate-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold text-slate-900 pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-6 pb-5"
                >
                  <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA adicional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-slate-600 mb-4">Não encontrou sua dúvida?</p>
          <a
            href="https://wa.me/5551999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
          >
            Falar com Suporte no WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}
