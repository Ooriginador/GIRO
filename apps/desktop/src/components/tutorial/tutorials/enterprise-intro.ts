/**
 * Tutorial: Introdução ao GIRO Enterprise
 * Visão geral do módulo de gestão de almoxarifado para empresas de engenharia
 */

import type { Tutorial } from '../types';

export const enterpriseIntroTutorial: Tutorial = {
  id: 'enterprise-intro',
  name: 'Introdução ao Enterprise',
  description:
    'Conheça o módulo Enterprise do GIRO: gestão completa de almoxarifado para empresas de engenharia e EPC. Contratos, frentes de obra, requisições e muito mais.',
  category: 'enterprise',
  estimatedMinutes: 8,
  icon: 'Building2',
  prerequisites: ['welcome'],
  tags: ['enterprise', 'almoxarifado', 'engenharia', 'EPC', 'introdução', 'contratos', 'obras'],
  steps: [
    {
      id: 'enterprise-welcome',
      title: '🏗️ Bem-vindo ao GIRO Enterprise!',
      description:
        'O GIRO Enterprise é o módulo de gestão de almoxarifado desenvolvido especialmente para empresas de engenharia e EPC (Engineering, Procurement and Construction). Vamos conhecer os principais recursos!',
      placement: 'center',
      route: '/enterprise',
    },
    {
      id: 'enterprise-dashboard',
      title: '📊 Dashboard Principal',
      description:
        'Este é o painel de controle do Enterprise. Aqui você encontra os principais KPIs: contratos ativos, requisições pendentes, transferências em andamento e alertas importantes.',
      target: '[data-tutorial="enterprise-dashboard"]',
      placement: 'bottom',
      route: '/enterprise',
    },
    {
      id: 'enterprise-kpis',
      title: '📈 Indicadores Chave (KPIs)',
      description:
        'Os cards de KPI mostram números importantes em tempo real: total de contratos, requisições aguardando aprovação, itens em separação e alertas de estoque. Clique em qualquer card para ir direto à lista correspondente.',
      target: '[data-tutorial="enterprise-kpis"]',
      placement: 'bottom',
      route: '/enterprise',
    },
    {
      id: 'enterprise-menu',
      title: '📂 Menu Enterprise',
      description:
        'No menu lateral você encontra acesso rápido a todos os módulos: Contratos, Frentes de Obra, Requisições, Transferências, Localizações e Atividades.',
      target: '[data-tutorial="enterprise-menu"]',
      placement: 'right',
      route: '/enterprise',
    },
    {
      id: 'enterprise-contracts-intro',
      title: '📋 Contratos/Obras',
      description:
        'Gerencie todos os contratos da empresa. Cada contrato representa uma obra ou projeto, com cliente, orçamento, prazos e frentes de trabalho vinculadas.',
      target: '[data-tutorial="contracts-link"]',
      placement: 'right',
      route: '/enterprise',
      action: 'click',
    },
    {
      id: 'enterprise-workfronts-intro',
      title: '🏭 Frentes de Obra',
      description:
        'Dentro de cada contrato, você pode criar frentes de obra (montagem, civil, tubulação, etc). Cada frente tem atividades, responsáveis e materiais alocados.',
      target: '[data-tutorial="workfronts-link"]',
      placement: 'right',
      route: '/enterprise/contracts',
    },
    {
      id: 'enterprise-requests-intro',
      title: '📦 Requisições de Material',
      description:
        'O coração do almoxarifado! Requisições permitem solicitar materiais para as frentes de obra. O workflow inclui: Rascunho → Pendente → Aprovado → Em Separação → Entregue.',
      target: '[data-tutorial="requests-link"]',
      placement: 'right',
      route: '/enterprise/contracts',
    },
    {
      id: 'enterprise-transfers-intro',
      title: '🚚 Transferências',
      description:
        'Transfira materiais entre localizações: do almoxarifado central para obras, entre obras, ou devoluções. Cada transferência é rastreada com origem, destino e responsável.',
      target: '[data-tutorial="transfers-link"]',
      placement: 'right',
      route: '/enterprise/contracts',
    },
    {
      id: 'enterprise-locations-intro',
      title: '📍 Localizações de Estoque',
      description:
        'Crie múltiplas localizações: Almoxarifado Central, Container Obra X, Depósito Temporário. Cada localização tem seus próprios saldos de estoque.',
      target: '[data-tutorial="locations-link"]',
      placement: 'right',
      route: '/enterprise/contracts',
    },
    {
      id: 'enterprise-permissions',
      title: '🔐 Permissões por Cargo',
      description:
        'O Enterprise tem cargos específicos: Gestor de Contratos, Supervisor, Almoxarife e Solicitante. Cada cargo tem limites de aprovação e permissões diferentes.',
      placement: 'center',
      route: '/enterprise',
    },
    {
      id: 'enterprise-workflow',
      title: '⚡ Workflows de Aprovação',
      description:
        'Requisições passam por um fluxo de aprovação baseado em valor: até R$ 50.000 (Supervisor), até R$ 200.000 (Gestor de Contratos), acima (Admin). Isso garante controle e governança.',
      placement: 'center',
      route: '/enterprise',
    },
    {
      id: 'enterprise-complete',
      title: '🎉 Pronto para começar!',
      description:
        'Você conheceu a visão geral do GIRO Enterprise. Agora explore os tutoriais específicos de cada módulo: Contratos, Requisições, Transferências e mais. Bom trabalho!',
      placement: 'center',
      route: '/enterprise',
    },
  ],
};
