"use client";

import { XCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function FailurePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          Ops! Algo deu errado
        </h1>
        <p className="text-gray-400 mb-8">
          Não conseguimos processar o seu pagamento. Nenhuma cobrança foi
          realizada.
        </p>

        <div className="space-y-4">
          <Link
            href="/#precos"
            className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-gray-100 text-black font-semibold rounded-xl transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
            Tentar Novamente
          </Link>

          <Link
            href="/dashboard"
            className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
          >
            Voltar ao Painel
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Se o problema persistir, entre em contato com nosso suporte via
          WhatsApp.
        </p>
      </motion.div>
    </div>
  );
}
