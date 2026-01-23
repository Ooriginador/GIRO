"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { ImageCompareSlider } from "@/components/ui/ImageCompareSlider";

const screenshots = [
  {
    id: "pdv",
    title: "PDV Completo",
    description: "Interface rápida e intuitiva para vendas",
    dark: "/screenshots/pdvdark.png",
    light: "/screenshots/pdvlight.png",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Visão geral do seu negócio em tempo real",
    dark: "/screenshots/dashboarddark.png",
    light: "/screenshots/dashboardlight.png",
  },
  {
    id: "produtos",
    title: "Gestão de Produtos",
    description: "Cadastro completo com categorias e imagens",
    dark: "/screenshots/produtosdark.png",
    light: "/screenshots/produtoslight.png",
  },
  {
    id: "estoque",
    title: "Controle de Estoque",
    description: "Acompanhe movimentações e alertas",
    dark: "/screenshots/estoquedark.png",
    light: "/screenshots/estoquelight.png",
  },
  {
    id: "relatorios",
    title: "Relatórios Detalhados",
    description: "Analytics e dashboards em tempo real",
    dark: "/screenshots/relatoriosdark.png",
    light: "/screenshots/relatorioslight.png",
  },
  {
    id: "caixa",
    title: "Controle de Caixa",
    description: "Abertura, fechamento e sangrias",
    dark: "/screenshots/caixadark.png",
    light: "/screenshots/caixalight.png",
  },
  {
    id: "configuracoes",
    title: "Configurações",
    description: "Personalize o sistema para seu negócio",
    dark: "/screenshots/configuracoesdark.png",
    light: "/screenshots/configuracoeslight.png",
  },
  {
    id: "clientes",
    title: "Cadastro de Clientes",
    description: "Gerencie sua carteira de clientes",
    dark: "/screenshots/clientesdark.png",
    light: "/screenshots/clienteslight.png",
  },
  {
    id: "fornecedores",
    title: "Fornecedores",
    description: "Controle seus parceiros comerciais",
    dark: "/screenshots/fornecedoresdark.png",
    light: "/screenshots/fornecedoreslight.png",
  },
  {
    id: "funcionarios",
    title: "Funcionários",
    description: "Gestão de equipe com permissões",
    dark: "/screenshots/funcionariosdark.png",
    light: "/screenshots/funcionarioslight.png",
  },
  {
    id: "alertas",
    title: "Centro de Alertas",
    description: "Notificações de estoque e validade",
    dark: "/screenshots/alertasdark.png",
    light: "/screenshots/alertaslight.png",
  },
  {
    id: "hardware",
    title: "Integração Hardware",
    description: "Impressoras, balanças e leitoras",
    dark: "/screenshots/hardwaredark.png",
    light: "/screenshots/hardwarelight.png",
  },
  {
    id: "fiscal",
    title: "Módulo Fiscal",
    description: "NFC-e e documentos fiscais",
    dark: "/screenshots/fiscaldark.png",
    light: "/screenshots/fiscallight.png",
  },
  {
    id: "os",
    title: "Ordens de Serviço",
    description: "Gestão completa para oficinas",
    dark: "/screenshots/ordemdeservicodark.png",
    light: "/screenshots/ordemdeservicoLight.png",
  },
  {
    id: "garantias",
    title: "Gestão de Garantias",
    description: "Controle de garantias de serviços",
    dark: "/screenshots/garantiasdark.png",
    light: "/screenshots/garantiasLight.png",
  },
];

export function ShowcaseSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % screenshots.length);
  };

  const prev = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + screenshots.length) % screenshots.length,
    );
  };

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const currentScreenshot = screenshots[currentIndex];

  return (
    <section
      id="recursos"
      className="py-24 bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Veja o GIRO em ação
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Interface moderna com tema claro e escuro. Arraste para comparar!
          </p>
        </motion.div>

        {/* Comparison Slider */}
        <div className="relative max-w-5xl mx-auto">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="shadow-2xl"
          >
            <ImageCompareSlider
              darkImage={currentScreenshot.dark}
              lightImage={currentScreenshot.light}
              darkAlt={`${currentScreenshot.title} - Tema Escuro`}
              lightAlt={`${currentScreenshot.title} - Tema Claro`}
            />
          </motion.div>

          {/* Title and description */}
          <div className="text-center mt-6">
            <h3 className="text-xl font-semibold text-slate-900">
              {currentScreenshot.title}
            </h3>
            <p className="text-slate-600">{currentScreenshot.description}</p>
          </div>

          {/* Navigation Controls */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
            aria-label="Screenshot anterior"
          >
            <ChevronLeft className="w-6 h-6 text-slate-900" />
          </button>

          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
            aria-label="Próximo screenshot"
          >
            <ChevronRight className="w-6 h-6 text-slate-900" />
          </button>

          {/* Indicators */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-emerald-500"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Ver screenshot ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Thumbnails Grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3 mt-12 max-w-5xl mx-auto">
          {screenshots.map((screenshot, index) => (
            <motion.button
              key={screenshot.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => setCurrentIndex(index)}
              className={`group relative p-2 rounded-xl border-2 transition-all ${
                index === currentIndex
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-300 bg-white"
              }`}
            >
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={screenshot.dark}
                  alt={screenshot.title}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p className="text-xs font-medium text-slate-900 mt-1 truncate text-center">
                {screenshot.title}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
