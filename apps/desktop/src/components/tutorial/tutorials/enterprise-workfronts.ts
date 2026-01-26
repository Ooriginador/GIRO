/**
 * Tutorial: Frentes de Obra
 * Gestão de frentes de trabalho e atividades
 */

import type { Tutorial } from '../types';

export const enterpriseWorkfrontsTutorial: Tutorial = {
  id: 'enterprise-workfronts',
  name: 'Frentes de Obra',
  description:
    'Aprenda a criar frentes de trabalho, cadastrar atividades, atribuir responsáveis e acompanhar o progresso de cada área da obra.',
  category: 'enterprise',
  estimatedMinutes: 10,
  icon: 'Hammer',
  prerequisites: ['enterprise-contracts'],
  tags: ['frentes', 'obra', 'atividades', 'responsáveis', 'progresso', 'tarefas', 'enterprise'],
  steps: [
    {
      id: 'workfronts-intro',
      title: '🏭 Frentes de Obra',
      description:
        'Frentes de obra representam áreas ou disciplinas de um projeto: Montagem, Civil, Tubulação, Elétrica, Instrumentação, etc. Cada frente tem suas próprias atividades e responsáveis.',
      placement: 'center',
      route: '/enterprise/workfronts',
    },
    {
      id: 'workfronts-list',
      title: '📋 Lista de Frentes',
      description:
        'Veja todas as frentes de obra cadastradas. Você pode filtrar por contrato, status ou responsável. Os cards mostram o progresso de cada frente.',
      target: '[data-tutorial="workfronts-list"]',
      placement: 'bottom',
      route: '/enterprise/workfronts',
    },
    {
      id: 'workfronts-filter-contract',
      title: '🔍 Filtrar por Contrato',
      description:
        'Selecione um contrato específico para ver apenas suas frentes de obra. Útil quando você gerencia múltiplos projetos.',
      target: '[data-tutorial="workfronts-contract-filter"]',
      placement: 'bottom',
      route: '/enterprise/workfronts',
    },
    {
      id: 'workfronts-card',
      title: '🎯 Card da Frente',
      description:
        'Cada card mostra: nome da frente, contrato vinculado, supervisor responsável, número de atividades e barra de progresso. Clique para ver detalhes.',
      target: '[data-tutorial="workfront-card"]',
      placement: 'right',
      action: 'click',
      route: '/enterprise/workfronts',
    },
    {
      id: 'workfronts-detail',
      title: '📊 Detalhes da Frente',
      description:
        'A página de detalhes mostra todas as informações da frente: atividades, materiais alocados, histórico de requisições e indicadores de desempenho.',
      target: '[data-tutorial="workfront-detail"]',
      placement: 'bottom',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-activities',
      title: '📝 Lista de Atividades',
      description:
        'Aqui você vê todas as atividades da frente. Cada atividade tem descrição, responsável, prazo e status. O progresso da frente é calculado com base nas atividades concluídas.',
      target: '[data-tutorial="workfront-activities"]',
      placement: 'top',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-new-activity',
      title: '➕ Nova Atividade',
      description:
        'Clique para adicionar uma nova atividade. Defina o que precisa ser feito, quem é o responsável e qual o prazo de entrega.',
      target: '[data-tutorial="new-activity-button"]',
      placement: 'left',
      action: 'click',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-activity-form',
      title: '📋 Cadastro de Atividade',
      description:
        'Preencha: descrição da atividade, funcionário responsável, data de início, data prevista de término e prioridade (baixa, normal, alta, urgente).',
      target: '[data-tutorial="activity-form"]',
      placement: 'right',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-activity-status',
      title: '🚦 Status da Atividade',
      description:
        'Atividades passam por status: Pendente → Em Andamento → Concluída. Você também pode marcar como Bloqueada se houver impedimento (falta de material, aguardando aprovação, etc).',
      target: '[data-tutorial="activity-status"]',
      placement: 'left',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-materials',
      title: '📦 Materiais Alocados',
      description:
        'Veja os materiais previstos para esta frente e o que já foi requisitado/entregue. Isso ajuda a planejar requisições e evitar falta de material.',
      target: '[data-tutorial="workfront-materials"]',
      placement: 'top',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-request-material',
      title: '🛒 Requisitar Material',
      description:
        'Precisa de material? Clique em "Nova Requisição" para solicitar diretamente para esta frente de obra. Os itens já virão pré-selecionados.',
      target: '[data-tutorial="request-material-button"]',
      placement: 'left',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-progress',
      title: '📈 Indicadores de Progresso',
      description:
        'Acompanhe: % de atividades concluídas, atividades em atraso, produtividade da equipe e consumo de materiais. Use para identificar gargalos.',
      target: '[data-tutorial="workfront-progress"]',
      placement: 'left',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-team',
      title: '👥 Equipe da Frente',
      description:
        'Veja os funcionários alocados nesta frente: supervisor, técnicos e auxiliares. Cada pessoa pode ter atividades atribuídas.',
      target: '[data-tutorial="workfront-team"]',
      placement: 'right',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-reports',
      title: '📊 Relatórios',
      description:
        'Exporte relatórios da frente: atividades pendentes, materiais utilizados, produtividade, cronograma físico. Use para reuniões de acompanhamento.',
      target: '[data-tutorial="workfront-reports"]',
      placement: 'left',
      route: '/enterprise/workfronts/:id',
    },
    {
      id: 'workfronts-complete',
      title: '✅ Muito bem!',
      description:
        'Você dominou a gestão de frentes de obra! Agora você pode criar atividades, acompanhar progresso e gerenciar equipes. Próximo: aprenda sobre Requisições de Material.',
      placement: 'center',
      route: '/enterprise/workfronts',
    },
  ],
};
