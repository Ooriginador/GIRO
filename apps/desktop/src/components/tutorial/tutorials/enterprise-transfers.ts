/**
 * Tutorial: Transferências entre Localizações
 * Movimentação de materiais entre almoxarifados e obras
 */

import type { Tutorial } from '../types';

export const enterpriseTransfersTutorial: Tutorial = {
  id: 'enterprise-transfers',
  name: 'Transferências de Material',
  description:
    'Aprenda a transferir materiais entre localizações: do almoxarifado central para obras, entre obras, ou devoluções. Rastreie cada movimentação.',
  category: 'enterprise',
  estimatedMinutes: 10,
  icon: 'ArrowLeftRight',
  prerequisites: ['enterprise-requests'],
  tags: [
    'transferências',
    'movimentação',
    'almoxarifado',
    'obra',
    'logística',
    'estoque',
    'enterprise',
  ],
  steps: [
    {
      id: 'transfers-intro',
      title: '🚚 Transferências de Material',
      description:
        'Transferências permitem mover materiais entre localizações: enviar do almoxarifado central para a obra, redistribuir entre obras, ou devolver materiais. Vamos aprender!',
      placement: 'center',
      route: '/enterprise/transfers',
    },
    {
      id: 'transfers-types',
      title: '📦 Tipos de Transferência',
      description:
        'Existem três tipos principais: Envio (almoxarifado → obra), Redistribuição (obra → outra obra) e Devolução (obra → almoxarifado). Cada tipo tem seu workflow.',
      placement: 'center',
      route: '/enterprise/transfers',
    },
    {
      id: 'transfers-list',
      title: '📋 Lista de Transferências',
      description:
        'Veja todas as transferências cadastradas. A tabela mostra código, origem, destino, quantidade de itens, data, responsável e status.',
      target: '[data-tutorial="transfers-list"]',
      placement: 'bottom',
      route: '/enterprise/transfers',
    },
    {
      id: 'transfers-filter-status',
      title: '🔍 Filtrar por Status',
      description:
        'Filtre por etapa: Pendente (aguardando separação), Em Separação, Em Trânsito, Concluída ou Cancelada.',
      target: '[data-tutorial="transfers-status-filter"]',
      placement: 'bottom',
      route: '/enterprise/transfers',
    },
    {
      id: 'transfers-filter-location',
      title: '📍 Filtrar por Localização',
      description:
        'Veja transferências de uma origem ou destino específico. Útil para acompanhar entregas para uma obra.',
      target: '[data-tutorial="transfers-location-filter"]',
      placement: 'bottom',
      route: '/enterprise/transfers',
    },
    {
      id: 'transfers-new-button',
      title: '➕ Nova Transferência',
      description:
        'Clique para criar uma nova transferência. Você precisará selecionar origem, destino e os itens a serem transferidos.',
      target: '[data-tutorial="new-transfer-button"]',
      placement: 'left',
      action: 'click',
      route: '/enterprise/transfers',
    },
    {
      id: 'transfers-form-type',
      title: '📤 Tipo de Transferência',
      description:
        'Selecione o tipo: Envio para Obra, Redistribuição ou Devolução. Isso define o fluxo e as validações aplicadas.',
      target: '[data-tutorial="transfer-form-type"]',
      placement: 'right',
      route: '/enterprise/transfers/new',
    },
    {
      id: 'transfers-form-origin',
      title: '📍 Origem',
      description:
        'Selecione a localização de onde os materiais serão retirados. Você verá o saldo disponível de cada item nessa localização.',
      target: '[data-tutorial="transfer-form-origin"]',
      placement: 'right',
      route: '/enterprise/transfers/new',
    },
    {
      id: 'transfers-form-destination',
      title: '🎯 Destino',
      description:
        'Selecione para onde os materiais serão enviados. Pode ser uma obra específica, almoxarifado secundário ou central (para devoluções).',
      target: '[data-tutorial="transfer-form-destination"]',
      placement: 'right',
      route: '/enterprise/transfers/new',
    },
    {
      id: 'transfers-form-items',
      title: '🛒 Adicionar Itens',
      description:
        'Busque os produtos a transferir. O sistema mostra o saldo na origem. Não é possível transferir mais do que o disponível.',
      target: '[data-tutorial="transfer-form-items"]',
      placement: 'right',
      route: '/enterprise/transfers/new',
    },
    {
      id: 'transfers-form-quantity',
      title: '🔢 Quantidade',
      description:
        'Informe a quantidade a transferir. O sistema valida se há saldo suficiente e destaca em vermelho se exceder.',
      target: '[data-tutorial="transfer-item-quantity"]',
      placement: 'right',
      route: '/enterprise/transfers/new',
    },
    {
      id: 'transfers-form-notes',
      title: '📝 Observações',
      description:
        'Adicione instruções especiais: "Entregar até 10h", "Material frágil", "Conferir lacres". Essas notas aparecem na separação e entrega.',
      target: '[data-tutorial="transfer-form-notes"]',
      placement: 'right',
      route: '/enterprise/transfers/new',
    },
    {
      id: 'transfers-create',
      title: '💾 Criar Transferência',
      description:
        'Revise os dados e clique em "Criar". A transferência será criada com status "Pendente" e o almoxarifado será notificado.',
      target: '[data-tutorial="transfer-create-button"]',
      placement: 'top',
      action: 'click',
      route: '/enterprise/transfers/new',
    },
    {
      id: 'transfers-detail',
      title: '📊 Detalhes da Transferência',
      description:
        'A página de detalhes mostra todos os dados: itens, quantidades, timeline de eventos e ações disponíveis conforme o status.',
      target: '[data-tutorial="transfer-detail"]',
      placement: 'bottom',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-separation',
      title: '📦 Separar Itens',
      description:
        'O almoxarife inicia a separação. Para cada item, marque como separado quando estiver pronto. O status muda para "Em Separação".',
      target: '[data-tutorial="transfer-separation"]',
      placement: 'right',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-dispatch',
      title: '🚛 Despachar',
      description:
        'Com tudo separado, clique em "Despachar". A transferência muda para "Em Trânsito". Informe o transportador e previsão de chegada.',
      target: '[data-tutorial="transfer-dispatch-button"]',
      placement: 'left',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-in-transit',
      title: '🛣️ Em Trânsito',
      description:
        'Material a caminho! O destino pode acompanhar o status. Se houver problemas, é possível registrar ocorrências.',
      target: '[data-tutorial="transfer-in-transit"]',
      placement: 'center',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-receive',
      title: '✅ Confirmar Recebimento',
      description:
        'Quando o material chegar ao destino, o responsável confere e confirma o recebimento. O saldo é automaticamente atualizado.',
      target: '[data-tutorial="transfer-receive-button"]',
      placement: 'left',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-partial',
      title: '⚠️ Recebimento Parcial',
      description:
        'Recebeu menos que o esperado? Registre a quantidade real recebida. O sistema cria automaticamente uma ocorrência para investigação.',
      target: '[data-tutorial="transfer-partial-receive"]',
      placement: 'right',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-history',
      title: '📜 Histórico',
      description:
        'Cada ação fica registrada: quem criou, separou, despachou e recebeu. Data e hora de cada evento para auditoria completa.',
      target: '[data-tutorial="transfer-history"]',
      placement: 'left',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-print',
      title: '🖨️ Imprimir Romaneio',
      description:
        'Gere o romaneio de transferência para impressão. Documento oficial com lista de itens, assinaturas e código de rastreamento.',
      target: '[data-tutorial="transfer-print-button"]',
      placement: 'left',
      route: '/enterprise/transfers/:id',
    },
    {
      id: 'transfers-complete',
      title: '🎉 Excelente!',
      description:
        'Você dominou as transferências de material! Agora sabe enviar para obras, redistribuir e devolver materiais. Próximo: conheça as Localizações de Estoque.',
      placement: 'center',
      route: '/enterprise/transfers',
    },
  ],
};
