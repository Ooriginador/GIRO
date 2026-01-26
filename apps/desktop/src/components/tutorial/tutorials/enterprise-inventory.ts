/**
 * Tutorial: Inventário Rotativo
 * Contagem e ajuste de estoque com suporte mobile
 */

import type { Tutorial } from '../types';

export const enterpriseInventoryTutorial: Tutorial = {
  id: 'enterprise-inventory',
  name: 'Inventário Rotativo',
  description:
    'Realize inventários físicos com apoio do app mobile. Conte produtos, identifique divergências e faça ajustes de estoque de forma organizada.',
  category: 'enterprise',
  estimatedMinutes: 12,
  icon: 'ClipboardCheck',
  prerequisites: ['enterprise-locations'],
  tags: [
    'inventário',
    'contagem',
    'estoque',
    'ajuste',
    'mobile',
    'auditoria',
    'divergência',
    'enterprise',
  ],
  steps: [
    {
      id: 'inventory-intro',
      title: '📋 Inventário Rotativo',
      description:
        'O inventário rotativo permite verificar fisicamente o estoque de forma organizada. Você pode fazer inventários completos ou parciais (por categoria, localização ou amostragem).',
      placement: 'center',
      route: '/enterprise/inventory',
    },
    {
      id: 'inventory-types',
      title: '📊 Tipos de Inventário',
      description:
        'Existem três tipos: Completo (todos os itens), Parcial (categoria ou localização específica) e Por Amostragem (itens selecionados aleatoriamente). Cada um tem seu caso de uso.',
      placement: 'center',
      route: '/enterprise/inventory',
    },
    {
      id: 'inventory-list',
      title: '📋 Inventários em Andamento',
      description:
        'Veja todos os inventários: planejados, em andamento, pendentes de aprovação e concluídos. A tabela mostra data, tipo, localização, responsável e progresso.',
      target: '[data-tutorial="inventory-list"]',
      placement: 'bottom',
      route: '/enterprise/inventory',
    },
    {
      id: 'inventory-new-button',
      title: '➕ Iniciar Inventário',
      description:
        'Clique para criar um novo inventário. Você definirá tipo, escopo, localização e equipe de contagem.',
      target: '[data-tutorial="new-inventory-button"]',
      placement: 'left',
      action: 'click',
      route: '/enterprise/inventory',
    },
    {
      id: 'inventory-form-type',
      title: '🏷️ Tipo de Inventário',
      description:
        'Selecione: Completo (recomendado anualmente), Parcial (mensal por categoria) ou Amostragem (semanal para itens críticos).',
      target: '[data-tutorial="inventory-form-type"]',
      placement: 'right',
      route: '/enterprise/inventory/new',
    },
    {
      id: 'inventory-form-location',
      title: '📍 Localização',
      description:
        'Selecione a localização a ser inventariada. Para inventário completo da empresa, selecione "Todas as localizações".',
      target: '[data-tutorial="inventory-form-location"]',
      placement: 'right',
      route: '/enterprise/inventory/new',
    },
    {
      id: 'inventory-form-category',
      title: '📂 Categoria (Opcional)',
      description:
        'Para inventário parcial, selecione a categoria de produtos. Deixe em branco para incluir todas.',
      target: '[data-tutorial="inventory-form-category"]',
      placement: 'right',
      route: '/enterprise/inventory/new',
      skippable: true,
    },
    {
      id: 'inventory-form-team',
      title: '👥 Equipe de Contagem',
      description:
        'Selecione os funcionários que farão a contagem. Eles receberão notificação e terão acesso via app mobile.',
      target: '[data-tutorial="inventory-form-team"]',
      placement: 'right',
      route: '/enterprise/inventory/new',
    },
    {
      id: 'inventory-form-schedule',
      title: '📅 Agendamento',
      description:
        'Defina data e horário de início. O inventário pode ser imediato ou agendado. A equipe receberá lembrete.',
      target: '[data-tutorial="inventory-form-schedule"]',
      placement: 'right',
      route: '/enterprise/inventory/new',
    },
    {
      id: 'inventory-start',
      title: '🚀 Iniciar Inventário',
      description:
        'Clique em "Iniciar" para começar. O sistema gerará a lista de itens a contar e bloqueará movimentações na localização (opcional).',
      target: '[data-tutorial="inventory-start-button"]',
      placement: 'top',
      action: 'click',
      route: '/enterprise/inventory/new',
    },
    {
      id: 'inventory-in-progress',
      title: '📊 Inventário em Andamento',
      description:
        'Acompanhe o progresso em tempo real: itens contados, pendentes e com divergência. Os contadores atualizam via app mobile.',
      target: '[data-tutorial="inventory-progress"]',
      placement: 'bottom',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-mobile',
      title: '📱 Contagem via Mobile',
      description:
        'A equipe usa o app GIRO Mobile para contar: escaneiam o código de barras e informam a quantidade encontrada. Os dados sincronizam em tempo real!',
      placement: 'center',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-desktop-count',
      title: '💻 Contagem pelo Desktop',
      description:
        'Também é possível registrar contagens diretamente aqui. Busque o produto, informe a quantidade contada e confirme.',
      target: '[data-tutorial="inventory-desktop-count"]',
      placement: 'right',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-barcode',
      title: '📷 Leitor de Código de Barras',
      description:
        'Conecte um leitor USB e escaneie os produtos. O sistema identifica automaticamente e posiciona no campo de quantidade.',
      target: '[data-tutorial="inventory-barcode"]',
      placement: 'bottom',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-blind-count',
      title: '🔒 Contagem Cega (Opcional)',
      description:
        'No modo de contagem cega, o sistema não mostra o saldo esperado. Isso evita viés e força uma contagem real. Recomendado para auditorias.',
      target: '[data-tutorial="inventory-blind-toggle"]',
      placement: 'left',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-divergences',
      title: '⚠️ Divergências',
      description:
        'Quando a contagem difere do saldo do sistema, aparece como divergência. Itens com divergência são destacados em amarelo (parcial) ou vermelho (grande).',
      target: '[data-tutorial="inventory-divergences"]',
      placement: 'top',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-recount',
      title: '🔄 Solicitar Recontagem',
      description:
        'Para itens com grande divergência, solicite uma segunda contagem. Outra pessoa da equipe refaz a contagem para confirmar.',
      target: '[data-tutorial="inventory-recount-button"]',
      placement: 'left',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-finish',
      title: '✅ Finalizar Contagem',
      description:
        'Com todos os itens contados, clique em "Finalizar". O sistema gerará o relatório de divergências para análise.',
      target: '[data-tutorial="inventory-finish-button"]',
      placement: 'top',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-review',
      title: '📝 Revisar Divergências',
      description:
        'Analise cada divergência: pode ser erro de contagem, furto, perda, ou erro de registro anterior. Documente o motivo.',
      target: '[data-tutorial="inventory-review"]',
      placement: 'top',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-adjust',
      title: '🔧 Aprovar Ajustes',
      description:
        'O gestor revisa e aprova os ajustes. Cada ajuste precisa de justificativa. O sistema atualiza os saldos automaticamente.',
      target: '[data-tutorial="inventory-approve-button"]',
      placement: 'left',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-report',
      title: '📊 Relatório Final',
      description:
        'Gere o relatório completo do inventário: itens contados, divergências encontradas, ajustes realizados e assinaturas. Exporte em PDF para arquivo.',
      target: '[data-tutorial="inventory-report-button"]',
      placement: 'left',
      route: '/enterprise/inventory/:id',
    },
    {
      id: 'inventory-history',
      title: '📜 Histórico',
      description:
        'Consulte inventários anteriores para comparação e auditoria. Veja evolução de acuracidade ao longo do tempo.',
      target: '[data-tutorial="inventory-history"]',
      placement: 'right',
      route: '/enterprise/inventory',
    },
    {
      id: 'inventory-complete',
      title: '🎉 Parabéns!',
      description:
        'Você completou todos os tutoriais do GIRO Enterprise! Agora você domina: Contratos, Frentes de Obra, Requisições, Transferências, Localizações e Inventário. Excelente trabalho!',
      placement: 'center',
      route: '/enterprise/inventory',
    },
  ],
};
