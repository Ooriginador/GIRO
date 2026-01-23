"use client";

import { CheckCircle2, Download } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          Pagamento Aprovado!
        </h1>
        <p className="text-gray-400 mb-8">
          Sua licença foi processada com sucesso. Você já pode baixar o GIRO e
          começar a usar.
        </p>

        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="block w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            Acessar Painel do Cliente
          </Link>

          <Link
            href="/#fazer-download"
            className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
          >
            <Download className="w-5 h-5" />
            Baixar Sistema
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Enviamos uma cópia da sua chave de licença para o seu e-mail.
        </p>
      </motion.div>
    </div>
  );
}
