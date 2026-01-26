/**
 * Tutorial: Requisições de Material
 * Workflow completo de requisição, aprovação e entrega
 */

import type { Tutorial } from '../types';

export const enterpriseRequestsTutorial: Tutorial = {
  id: 'enterprise-requests',
  name: 'Requisições de Material',
  description:
    'Domine o fluxo completo de requisições: criar solicitação, aprovar, separar no almoxarifado e entregar na obra. Controle total do consumo de materiais.',
  category: 'enterprise',
  estimatedMinutes: 15,
  icon: 'ClipboardList',
  prerequisites: ['enterprise-workfronts'],
  tags: [
    'requisições',
    'materiais',
    'solicitação',
    'aprovação',
    'separação',
    'entrega',
    'almoxarifado',
    'enterprise',
  ],
  steps: [
    {
      id: 'requests-intro',
      title: '📦 Requisições de Material',
      description:
        'O módulo de requisições é o coração do almoxarifado. Aqui você solicita materiais, acompanha aprovações, separa itens e registra entregas. Vamos dominar esse fluxo!',
      placement: 'center',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-workflow',
      title: '⚡ Entendendo o Workflow',
      description:
        'Requisições passam por etapas: RASCUNHO → PENDENTE → APROVADO → EM SEPARAÇÃO → SEPARADO → ENTREGUE. Cada etapa tem responsáveis e pode ter requisitos específicos.',
      placement: 'center',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-list',
      title: '📋 Lista de Requisições',
      description:
        'Veja todas as requisições do sistema. A tabela mostra código, solicitante, frente de obra, data, valor estimado, prioridade e status atual.',
      target: '[data-tutorial="requests-list"]',
      placement: 'bottom',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-stats',
      title: '📊 Estatísticas Rápidas',
      description:
        'Os cards no topo mostram: requisições pendentes de aprovação, em separação, urgentes e total do dia. Use para priorizar seu trabalho.',
      target: '[data-tutorial="requests-stats"]',
      placement: 'bottom',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-filter-status',
      title: '🔍 Filtrar por Status',
      description:
        'Filtre requisições por etapa do workflow. Por exemplo: veja apenas "Pendentes" se você é aprovador, ou "Em Separação" se você é almoxarife.',
      target: '[data-tutorial="requests-status-filter"]',
      placement: 'bottom',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-filter-priority',
      title: '🚨 Filtrar por Prioridade',
      description:
        'Requisições urgentes aparecem em destaque (vermelho). Filtre por prioridade para atender primeiro as mais críticas.',
      target: '[data-tutorial="requests-priority-filter"]',
      placement: 'bottom',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-new-button',
      title: '➕ Nova Requisição',
      description:
        'Clique para criar uma nova requisição de material. Você precisará selecionar o contrato, frente de obra e os itens desejados.',
      target: '[data-tutorial="new-request-button"]',
      placement: 'left',
      action: 'click',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-form-header',
      title: '📝 Cabeçalho da Requisição',
      description:
        'Selecione o contrato e a frente de obra de destino. Defina a prioridade (Normal, Alta ou Urgente) e uma justificativa opcional.',
      target: '[data-tutorial="request-form-header"]',
      placement: 'right',
      route: '/enterprise/requests/new',
    },
    {
      id: 'requests-form-items',
      title: '🛒 Adicionar Itens',
      description:
        'Busque produtos pelo nome ou código. Informe a quantidade desejada para cada item. O sistema mostra o saldo disponível em cada localização.',
      target: '[data-tutorial="request-form-items"]',
      placement: 'right',
      route: '/enterprise/requests/new',
    },
    {
      id: 'requests-form-search',
      title: '🔎 Busca de Produtos',
      description:
        'Digite o nome, código ou código de barras. Os resultados mostram: descrição, unidade, saldo disponível e localização. Selecione e defina a quantidade.',
      target: '[data-tutorial="request-item-search"]',
      placement: 'bottom',
      route: '/enterprise/requests/new',
    },
    {
      id: 'requests-form-quantity',
      title: '🔢 Quantidade e Observação',
      description:
        'Informe a quantidade necessária. Você pode adicionar uma observação por item (ex: "Entregar até 14h", "Priorizar parafusos inox").',
      target: '[data-tutorial="request-item-quantity"]',
      placement: 'right',
      route: '/enterprise/requests/new',
    },
    {
      id: 'requests-form-total',
      title: '💰 Valor Estimado',
      description:
        'O sistema calcula automaticamente o valor total estimado da requisição. Requisições de alto valor precisam de aprovação de níveis superiores.',
      target: '[data-tutorial="request-form-total"]',
      placement: 'top',
      route: '/enterprise/requests/new',
    },
    {
      id: 'requests-save-draft',
      title: '📄 Salvar como Rascunho',
      description:
        'Ainda não terminou? Salve como rascunho para continuar depois. Rascunhos não entram no fluxo de aprovação.',
      target: '[data-tutorial="request-save-draft"]',
      placement: 'top',
      route: '/enterprise/requests/new',
    },
    {
      id: 'requests-submit',
      title: '📨 Enviar para Aprovação',
      description:
        'Clique em "Enviar" para submeter a requisição. Ela mudará para status "Pendente" e o aprovador será notificado.',
      target: '[data-tutorial="request-submit-button"]',
      placement: 'top',
      action: 'click',
      route: '/enterprise/requests/new',
    },
    {
      id: 'requests-approval-flow',
      title: '✅ Fluxo de Aprovação',
      description:
        'Quem aprova depende do valor: até R$ 50.000 (Supervisor), até R$ 200.000 (Gestor de Contratos), acima disso (Admin). O aprovador pode aprovar, aprovar parcialmente ou rejeitar.',
      placement: 'center',
      route: '/enterprise/requests',
    },
    {
      id: 'requests-approve',
      title: '👍 Aprovar Requisição',
      description:
        'Como aprovador, revise os itens e clique em "Aprovar". Você pode ajustar quantidades (aprovação parcial) ou rejeitar com justificativa.',
      target: '[data-tutorial="request-approve-button"]',
      placement: 'left',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-separation',
      title: '📦 Separação no Almoxarifado',
      description:
        'Após aprovada, a requisição vai para "Em Separação". O almoxarife localiza os itens, confere quantidades e prepara para entrega.',
      target: '[data-tutorial="request-separation"]',
      placement: 'right',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-separate-items',
      title: '✔️ Marcar Itens Separados',
      description:
        'Para cada item, clique em "Separar" quando estiver pronto. Se não houver estoque suficiente, registre a quantidade real separada.',
      target: '[data-tutorial="request-separate-items"]',
      placement: 'right',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-finish-separation',
      title: '📋 Finalizar Separação',
      description:
        'Com todos os itens separados, clique em "Concluir Separação". A requisição fica pronta para entrega na obra.',
      target: '[data-tutorial="request-finish-separation"]',
      placement: 'top',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-delivery',
      title: '🚚 Registrar Entrega',
      description:
        'Quando os materiais chegarem na obra, registre a entrega. Informe quem recebeu, data/hora e local de entrega.',
      target: '[data-tutorial="request-delivery-button"]',
      placement: 'left',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-signature',
      title: '✍️ Assinatura de Recebimento',
      description:
        'O recebedor pode assinar digitalmente na tela (touch/mouse) confirmando o recebimento. Isso fica registrado para auditoria.',
      target: '[data-tutorial="request-signature"]',
      placement: 'center',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-history',
      title: '📜 Histórico da Requisição',
      description:
        'Cada ação fica registrada: quem criou, quem aprovou, quem separou, quem entregou. Rastreabilidade completa para auditoria.',
      target: '[data-tutorial="request-history"]',
      placement: 'left',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-print',
      title: '🖨️ Imprimir Requisição',
      description:
        'Gere um PDF da requisição para impressão. Útil para conferência física no almoxarifado ou registro em obra.',
      target: '[data-tutorial="request-print-button"]',
      placement: 'left',
      route: '/enterprise/requests/:id',
    },
    {
      id: 'requests-complete',
      title: '🎉 Excelente!',
      description:
        'Você dominou o fluxo completo de requisições de material! Da solicitação à entrega, passando por aprovação e separação. Próximo: aprenda sobre Transferências entre Localizações.',
      placement: 'center',
      route: '/enterprise/requests',
    },
  ],
};
