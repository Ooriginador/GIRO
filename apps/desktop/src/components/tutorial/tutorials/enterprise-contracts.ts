/**
 * Tutorial: Gestão de Contratos
 * Workflow completo de criação e gerenciamento de contratos/obras
 */

import type { Tutorial } from '../types';

export const enterpriseContractsTutorial: Tutorial = {
  id: 'enterprise-contracts',
  name: 'Gestão de Contratos',
  description:
    'Aprenda a cadastrar, gerenciar e acompanhar contratos de obras. Defina clientes, orçamentos, prazos e vincule frentes de trabalho.',
  category: 'enterprise',
  estimatedMinutes: 12,
  icon: 'FileText',
  prerequisites: ['enterprise-intro'],
  tags: ['contratos', 'obras', 'projetos', 'clientes', 'orçamento', 'cronograma', 'enterprise'],
  steps: [
    {
      id: 'contracts-intro',
      title: '📋 Gestão de Contratos',
      description:
        'Contratos são a base do GIRO Enterprise. Cada contrato representa uma obra ou projeto, com cliente, orçamento, cronograma e equipe. Vamos aprender a gerenciá-los!',
      placement: 'center',
      route: '/enterprise/contracts',
    },
    {
      id: 'contracts-list',
      title: '📄 Lista de Contratos',
      description:
        'Aqui você vê todos os contratos cadastrados. Os cards mostram código, nome, cliente, status e progresso. Use os filtros para encontrar contratos específicos.',
      target: '[data-tutorial="contracts-list"]',
      placement: 'bottom',
      route: '/enterprise/contracts',
    },
    {
      id: 'contracts-filter-status',
      title: '🔍 Filtrar por Status',
      description:
        'Filtre contratos por status: Planejamento (azul), Ativo (verde), Suspenso (amarelo), Concluído (cinza) ou Cancelado (vermelho). Foque no que é mais importante agora.',
      target: '[data-tutorial="contracts-status-filter"]',
      placement: 'bottom',
      route: '/enterprise/contracts',
    },
    {
      id: 'contracts-search',
      title: '🔎 Busca Rápida',
      description:
        'Digite o nome do contrato, código ou cliente para encontrar rapidamente. A busca é instantânea e filtra enquanto você digita.',
      target: '[data-tutorial="contracts-search"]',
      placement: 'bottom',
      route: '/enterprise/contracts',
    },
    {
      id: 'contracts-new-button',
      title: '➕ Novo Contrato',
      description:
        'Clique em "Novo Contrato" para cadastrar uma nova obra. Você precisará informar dados básicos, cliente, orçamento e datas.',
      target: '[data-tutorial="new-contract-button"]',
      placement: 'left',
      action: 'click',
      route: '/enterprise/contracts',
    },
    {
      id: 'contracts-form-basic',
      title: '📝 Dados Básicos',
      description:
        'Preencha o código do contrato (ex: CT-2026-001), nome descritivo e uma descrição opcional. O código deve ser único e seguir o padrão da empresa.',
      target: '[data-tutorial="contract-form-basic"]',
      placement: 'right',
      route: '/enterprise/contracts/new',
    },
    {
      id: 'contracts-form-client',
      title: '🏢 Cliente e Localização',
      description:
        'Informe o nome do cliente e a localização da obra (cidade/estado ou endereço completo). Isso ajuda a organizar por região.',
      target: '[data-tutorial="contract-form-client"]',
      placement: 'right',
      route: '/enterprise/contracts/new',
    },
    {
      id: 'contracts-form-dates',
      title: '📅 Cronograma',
      description:
        'Defina as datas de início previsto e término previsto. O sistema calculará automaticamente o progresso conforme as datas avançam.',
      target: '[data-tutorial="contract-form-dates"]',
      placement: 'right',
      route: '/enterprise/contracts/new',
    },
    {
      id: 'contracts-form-budget',
      title: '💰 Orçamento',
      description:
        'Informe o valor total do contrato. Isso será usado para calcular o consumo de materiais e o progresso financeiro do projeto.',
      target: '[data-tutorial="contract-form-budget"]',
      placement: 'right',
      route: '/enterprise/contracts/new',
    },
    {
      id: 'contracts-form-manager',
      title: '👤 Gestor Responsável',
      description:
        'Selecione o gestor de contratos responsável. Ele receberá notificações e terá permissão para aprovar requisições de alto valor.',
      target: '[data-tutorial="contract-form-manager"]',
      placement: 'right',
      route: '/enterprise/contracts/new',
    },
    {
      id: 'contracts-form-status',
      title: '🚦 Status Inicial',
      description:
        'Defina o status inicial: geralmente "Planejamento" para novos contratos, ou "Ativo" se a obra já começou. O status pode ser alterado depois.',
      target: '[data-tutorial="contract-form-status"]',
      placement: 'right',
      route: '/enterprise/contracts/new',
    },
    {
      id: 'contracts-save',
      title: '💾 Salvar Contrato',
      description:
        'Revise os dados e clique em "Salvar" para criar o contrato. Você será redirecionado para a página de detalhes onde pode adicionar frentes de obra.',
      target: '[data-tutorial="contract-save-button"]',
      placement: 'top',
      action: 'click',
      route: '/enterprise/contracts/new',
    },
    {
      id: 'contracts-detail',
      title: '📊 Detalhes do Contrato',
      description:
        'A página de detalhes mostra todas as informações do contrato, frentes de obra vinculadas, histórico de requisições e indicadores de progresso.',
      target: '[data-tutorial="contract-detail"]',
      placement: 'bottom',
      route: '/enterprise/contracts/:id',
    },
    {
      id: 'contracts-add-workfront',
      title: '🏭 Adicionar Frente de Obra',
      description:
        'Clique em "Nova Frente" para criar uma frente de trabalho. Frentes representam áreas ou disciplinas da obra: montagem, civil, tubulação, elétrica, etc.',
      target: '[data-tutorial="add-workfront-button"]',
      placement: 'left',
      route: '/enterprise/contracts/:id',
    },
    {
      id: 'contracts-progress',
      title: '📈 Acompanhamento',
      description:
        'Acompanhe o progresso do contrato: físico (% das atividades concluídas) e financeiro (% do orçamento consumido). Use os gráficos para análise detalhada.',
      target: '[data-tutorial="contract-progress"]',
      placement: 'left',
      route: '/enterprise/contracts/:id',
    },
    {
      id: 'contracts-status-change',
      title: '🔄 Alterar Status',
      description:
        'Use o menu de ações para alterar o status: suspender obra, retomar, concluir ou cancelar. Cada mudança é registrada no histórico.',
      target: '[data-tutorial="contract-actions"]',
      placement: 'left',
      route: '/enterprise/contracts/:id',
    },
    {
      id: 'contracts-complete',
      title: '✅ Parabéns!',
      description:
        'Você aprendeu a gerenciar contratos no GIRO Enterprise! Próximo passo: aprenda a criar e gerenciar Frentes de Obra e suas atividades.',
      placement: 'center',
      route: '/enterprise/contracts',
    },
  ],
};
