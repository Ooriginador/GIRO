"use client";

import { Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-blue-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          Pagamento em Processamento
        </h1>
        <p className="text-gray-400 mb-8">
          Estamos aguardando a confirmação do seu pagamento. Isso pode levar
          alguns minutos dependendo do método escolhido.
        </p>

        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            Acompanhar no Painel
            <ExternalLink className="w-4 h-4" />
          </Link>

          <Link
            href="/"
            className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
          >
            Voltar para a Home
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Assim que o pagamento for aprovado, você receberá um e-mail de
          confirmação.
        </p>
      </motion.div>
    </div>
  );
}
