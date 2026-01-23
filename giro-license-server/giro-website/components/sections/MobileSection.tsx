"use client";

import { motion } from "framer-motion";
import {
  Bell,
  Clock,
  Package,
  Smartphone,
  TrendingUp,
  Wifi,
} from "lucide-react";
import Image from "next/image";

const mobileFeatures = [
  {
    icon: TrendingUp,
    title: "Acompanhe Vendas",
    description: "Veja vendas em tempo real, mesmo sem internet no desktop",
  },
  {
    icon: Package,
    title: "Consulte Estoque",
    description: "Verifique produtos, preços e estoque na palma da mão",
  },
  {
    icon: Bell,
    title: "Alertas Inteligentes",
    description: "Receba notificações de estoque baixo e produtos vencendo",
  },
  {
    icon: Wifi,
    title: "Sincronização WiFi",
    description: "Dados sincronizados automaticamente via rede local",
  },
  {
    icon: Clock,
    title: "Inventário Rápido",
    description: "Faça contagem de estoque direto pelo celular",
  },
];

import type { MobileReleaseData } from "@/lib/github";

// ... (imports remain)

export function MobileSection({
  latestMobileRelease,
}: {
  latestMobileRelease?: MobileReleaseData | null;
}) {
  return (
    <section
      id="mobile"
      className="py-24 bg-slate-900 text-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Conteúdo */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm mb-6">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Aplicativo Mobile Incluído
            </div>

            {/* Título */}
            <h2 className="text-4xl font-bold mb-6">
              Gerencie seu negócio de{" "}
              <span className="bg-linear-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">
                qualquer lugar
              </span>
            </h2>

            {/* Descrição */}
            <p className="text-xl text-slate-300 mb-8">
              Com o app GIRO Mobile (Android/iOS), você acompanha seu negócio em
              tempo real, mesmo quando não está na loja.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {mobileFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-linear-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Disponibilidade */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              {latestMobileRelease?.apk ? (
                <a
                  href={latestMobileRelease.apk}
                  className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg group hover:bg-emerald-500/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] text-emerald-400 uppercase tracking-wider">
                      Android
                    </span>
                    <span className="block text-sm font-semibold text-white">
                      Baixar APK v{latestMobileRelease.version}
                    </span>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg group hover:bg-white/10 transition-colors cursor-not-allowed">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider">
                      Android
                    </span>
                    <span className="block text-sm font-semibold text-slate-300">
                      Em Breve na Play Store
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg group hover:bg-white/10 transition-colors cursor-not-allowed">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-lg grayscale group-hover:grayscale-0 transition-all">
                    🍎
                  </span>
                </div>
                <div className="text-left">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider">
                    iOS
                  </span>
                  <span className="block text-sm font-semibold text-slate-300">
                    Em Breve na App Store
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mockup do celular */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Placeholder para screenshot do mobile */}
            <div className="relative mx-auto w-[300px] h-[600px]">
              {/* Frame do celular */}
              <div className="absolute inset-0 bg-slate-800 rounded-[3rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-slate-700 rounded-[2.5rem] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" />

                  {/* Screenshot real */}
                  <Image
                    src="/screenshots/mobile.png"
                    alt="GIRO Mobile App"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Efeito de brilho */}
              <div className="absolute -inset-4 bg-linear-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
