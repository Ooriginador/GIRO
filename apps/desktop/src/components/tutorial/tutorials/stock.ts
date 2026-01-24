import type { Tutorial } from '../types';

export const stockTutorial: Tutorial = {
  id: 'stock',
  name: '📦 Controle de Estoque',
  description:
    'Registre entradas de mercadorias, faça ajustes de inventário e controle validades. Estoque preciso = loja sem rupturas!',
  category: 'management',
  estimatedMinutes: 10,
  icon: 'Warehouse',
  prerequisites: ['products'],
  tags: ['estoque', 'entrada', 'saída', 'ajuste', 'validade', 'inventário'],
  steps: [
    {
      id: 'stock-intro',
      title: '📦 Controle de Estoque',
      description:
        'Estoque atualizado = cliente satisfeito! Aqui você registra compras, ajusta diferenças de inventário e monitora validades. Nunca mais fique sem produto na gôndola.',
      placement: 'center',
      route: '/stock',
    },
    {
      id: 'stock-overview',
      title: '📊 Visão Geral',
      description:
        'Dashboard completo do seu estoque! Produtos com estoque baixo ficam em 🟡 amarelo, zerados em 🔴 vermelho. Clique em qualquer linha para ver detalhes ou fazer ajustes.',
      target: '[data-tutorial="stock-table"]',
      placement: 'bottom',
      route: '/stock',
    },
    {
      id: 'stock-indicators',
      title: '🎯 Indicadores Rápidos',
      description:
        'Cards no topo showm: total de produtos cadastrados, quantos estão com estoque baixo, próximos a vencer, e valor total investido em mercadorias.',
      target: '[data-tutorial="stock-indicators"]',
      placement: 'bottom',
      route: '/stock',
    },
    {
      id: 'stock-entry-button',
      title: '📥 Nova Entrada',
      description:
        'Chegou mercadoria? Clique aqui para registrar! Serve para: compras de fornecedor, devoluções de clientes, transferências entre lojas ou bonificações.',
      target: '[data-tutorial="stock-entry-button"]',
      placement: 'bottom',
      action: 'click',
      route: '/stock',
    },
    {
      id: 'stock-entry-form',
      title: '📝 Formulário de Entrada',
      description:
        'Adicione vários produtos numa mesma entrada! Informe quantidade, custo unitário, validade e dados da nota fiscal. Tudo em um único lançamento.',
      target: '[data-tutorial="stock-entry-form"]',
      placement: 'right',
      route: '/stock/entry',
    },
    {
      id: 'stock-entry-product',
      title: '🔍 Selecionar Produto',
      description:
        'Digite o nome, código ou passe na leitora. Use o botão "+" para adicionar mais produtos à mesma entrada - assim você registra toda a nota de uma vez!',
      target: '[data-tutorial="stock-entry-product"]',
      placement: 'bottom',
      action: 'type',
      route: '/stock/entry',
    },
    {
      id: 'stock-entry-quantity',
      title: '📏 Quantidade Recebida',
      description:
        'Informe a quantidade que chegou. Para produtos pesados (açúicar, arroz a granel), informe o peso total em KG. O sistema calcula as unidades automaticamente.',
      target: '[data-tutorial="stock-entry-quantity"]',
      placement: 'bottom',
      route: '/stock/entry',
    },
    {
      id: 'stock-entry-cost',
      title: '💲 Custo Unitário',
      description:
        'Quanto você pagou por unidade? O sistema atualiza o custo médio automaticamente usando média ponderada. Isso mantém sua margem de lucro sempre correta!',
      target: '[data-tutorial="stock-entry-cost"]',
      placement: 'bottom',
      route: '/stock/entry',
    },
    {
      id: 'stock-entry-expiration',
      title: '📆 Data de Validade',
      description:
        'Registre a validade do lote! O sistema monitora e avisa quando produtos estão próximos a vencer. Assim você tem tempo de vender ou fazer promoção.',
      target: '[data-tutorial="stock-entry-expiration"]',
      placement: 'bottom',
      route: '/stock/entry',
    },
    {
      id: 'stock-entry-save',
      title: '✅ Confirmar Entrada',
      description:
        'Confira os itens, quantidades e custos. Ao salvar, o estoque de todos os produtos é atualizado instantâneamente. A entrada fica registrada para auditoria!',
      target: '[data-tutorial="stock-entry-save"]',
      placement: 'top',
      action: 'click',
      route: '/stock/entry',
    },
    {
      id: 'stock-adjustment',
      title: '🔧 Ajuste de Estoque',
      description:
        'Fez inventário e a contagem não bateu? Sem problema! O ajuste corrige a diferença mantendo tudo rastreado. Veja como funciona:',
      placement: 'center',
      route: '/stock',
    },
    {
      id: 'stock-adjust-button',
      title: '✏️ Botão de Ajuste',
      description:
        'Na lista de produtos, clique nos três pontos "⋮" e escolha "Ajustar". Informe a quantidade REAL que você contou na loja - o sistema calcula a diferença.',
      target: '[data-tutorial="stock-adjust-button"]',
      placement: 'left',
      route: '/stock',
    },
    {
      id: 'stock-adjust-reason',
      title: '📝 Motivo do Ajuste',
      description:
        'Obrigatório informar o motivo! Opções comuns: perda, quebra, furto, erro de contagem anterior, bonificação. Isso fica no histórico para auditoria e análise de perdas.',
      target: '[data-tutorial="stock-adjust-reason"]',
      placement: 'bottom',
      required: true,
      route: '/stock',
    },
    {
      id: 'stock-expiration-list',
      title: '⚠️ Lista de Validades',
      description:
        'Produtos agrupados por urgência: 🔴 Vencidos (retirar imediatamente), 🟡 Esta semana (promoção urgente), 🟢 Este mês (monitorar). Aja rápido nos críticos!',
      target: '[data-tutorial="expiration-list"]',
      placement: 'bottom',
      route: '/stock/expiration',
    },
    {
      id: 'stock-expiration-action',
      title: '🎯 Ações Rápidas',
      description:
        'Para cada produto vencendo você pode: dar baixa por perda, transferir para seção de promoção, ou corrigir a data se estava errada. Mantenha a gôndola limpa!',
      target: '[data-tutorial="expiration-actions"]',
      placement: 'left',
      route: '/stock/expiration',
    },
    {
      id: 'stock-alerts',
      title: '🔔 Alertas Automáticos',
      description:
        'O sistema gera alertas quando produtos atingem o estoque mínimo. Configure os limites em cada produto ou defina um padrão em Configurações > Alertas.',
      placement: 'center',
      route: '/stock',
    },
    {
      id: 'stock-done',
      title: '🎉 Estoque Dominado!',
      description:
        'Você agora sabe registrar entradas, fazer ajustes e controlar validades! Dica de ouro: faça inventário mensal nos itens de maior giro para manter tudo certinho.',
      placement: 'center',
      route: '/stock',
    },
  ],
};
