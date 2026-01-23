"use client";

import type { ReleaseData } from "@/lib/github";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";

export function CTASection({
  latestRelease,
}: {
  latestRelease?: ReleaseData | null;
}) {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white relative overflow-hidden">
      {/* Grid de fundo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Mais de 1.000 negócios confiam no GIRO
          </div>

          {/* Título */}
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Pronto para transformar
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">
              seu negócio?
            </span>
          </h2>

          {/* Descrição */}
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Comece agora e veja como o GIRO pode simplificar a gestão do seu
            comércio
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#precos"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 transition-all duration-300 hover:scale-105"
            >
              Adquirir Licença
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            {latestRelease ? (
              <div className="relative group">
                <Link
                  href="/downloads"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  Baixar Agora
                </Link>
              </div>
            ) : (
              <Link
                href="/downloads"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                Ver Downloads
              </Link>
            )}
          </div>

          {/* Garantia */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                ✓
              </div>
              Instalação em 5 minutos
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                ✓
              </div>
              Suporte em português
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                ✓
              </div>
              Atualizações gratuitas
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
