import type { Tutorial } from '../types';

export const pdvBasicTutorial: Tutorial = {
  id: 'pdv-basic',
  name: 'PDV - Sua Primeira Venda',
  description:
    'Aprenda o fluxo completo de uma venda: buscar produtos, montar o carrinho, aplicar descontos e finalizar com diferentes formas de pagamento.',
  category: 'operations',
  estimatedMinutes: 10,
  icon: 'ShoppingCart',
  prerequisites: ['welcome'],
  tags: ['pdv', 'venda', 'caixa', 'pagamento', 'troco', 'básico', 'carrinho'],
  steps: [
    {
      id: 'pdv-intro',
      title: '🛒 Vamos fazer uma venda!',
      description:
        'Neste tutorial você vai aprender todo o fluxo de uma venda, desde buscar produtos até imprimir o cupom. Vamos começar!',
      placement: 'center',
      route: '/pdv',
    },
    {
      id: 'pdv-check-session',
      title: '✅ Verificar Status do Caixa',
      description:
        'No canto superior, o indicador mostra se o caixa está aberto (verde pulsante) ou fechado (cinza). Você só pode vender com o caixa aberto!',
      target: '[data-tutorial="cash-indicator"]',
      placement: 'bottom',
    },
    {
      id: 'pdv-open-cash',
      title: 'Abrindo o Caixa',
      description:
        'Se o caixa estiver fechado, clique em "Abrir Caixa" e informe o valor inicial (fundo de troco). Geralmente R$ 100 a R$ 200.',
      target: '[data-tutorial="open-cash-button"]',
      placement: 'bottom',
      action: 'click',
      skippable: true,
    },
    {
      id: 'pdv-search',
      title: '🔍 Buscar Produto (F2)',
      description:
        'Digite o nome do produto, código de barras ou código interno (MRC-XXXXX). A busca é instantânea e encontra resultados mesmo com erros de digitação. Experimente digitar "arroz"!',
      target: '[data-tutorial="product-search"]',
      placement: 'bottom',
      action: 'type',
      actionData: 'arroz',
      hotkey: 'F2',
    },
    {
      id: 'pdv-scanner',
      title: '📷 Usando o Leitor de Código de Barras',
      description:
        'Com um leitor USB conectado, basta apontar e "bipar" o produto - ele é adicionado automaticamente ao carrinho! Super rápido para atendimentos.',
      target: '[data-tutorial="product-search"]',
      placement: 'bottom',
      route: '/pdv',
    },
    {
      id: 'pdv-add-product',
      title: '➕ Adicionar ao Carrinho',
      description:
        'Clique no produto desejado ou pressione Enter para adicionar. A quantidade inicial é 1 unidade. Para adicionar múltiplos, use * (asterisco) + quantidade.',
      target: '[data-tutorial="product-search"]', // Fix: target search to keep focus
      placement: 'bottom',
      action: 'click',
      route: '/pdv',
    },
    {
      id: 'pdv-cart',
      title: '🛍️ Carrinho de Compras',
      description:
        'Aqui você vê todos os produtos da venda atual: nome, quantidade, preço unitário e subtotal de cada item. O contador no topo mostra quantos itens tem no carrinho.',
      target: '[data-tutorial="cart-items"]',
      placement: 'left',
      route: '/pdv',
    },
    {
      id: 'pdv-quantity',
      title: '🔢 Alterar Quantidade',
      description:
        'Use os botões + e - para ajustar, ou clique diretamente no número para digitar. Dica: antes de adicionar um produto, pressione F4 + número para já definir a quantidade.',
      target: '[data-tutorial="cart-item-quantity"]',
      placement: 'left',
      hotkey: 'F4',
      route: '/pdv',
    },
    {
      id: 'pdv-remove-item',
      title: 'Remover Item',
      description:
        'Para remover um item, clique no X ao lado dele ou selecione e pressione F12. Uma confirmação será solicitada.',
      target: '[data-tutorial="cart-item-remove"]',
      placement: 'left',
      hotkey: 'F12',
      route: '/pdv',
    },
    {
      id: 'pdv-totals',
      title: '💵 Painel de Totais',
      description:
        'Acompanhe em tempo real: Subtotal (soma dos itens), Desconto aplicado (se houver) e Total final da venda. Tudo atualizado automaticamente!',
      target: '[data-tutorial="cart-totals"]',
      placement: 'left',
      route: '/pdv',
    },
    {
      id: 'pdv-discount',
      title: 'Aplicar Desconto',
      description:
        'Pressione F6 para aplicar desconto na venda. Você pode dar desconto em % ou em R$. Informe o motivo do desconto.',
      target: '[data-tutorial="cart-totals"]', // Target totals if no specific button
      placement: 'top',
      hotkey: 'F6',
      route: '/pdv',
    },
    {
      id: 'pdv-finalize',
      title: '✅ Finalizar Venda (F10)',
      description:
        'Com todos os produtos no carrinho, pressione F10 ou clique em "Dinheiro", "PIX" ou "Cartão" para escolher a forma de pagamento e concluir.',
      target: '[data-tutorial="finalize-button"]',
      placement: 'top',
      action: 'click',
      hotkey: 'F10',
      route: '/pdv',
    },
    {
      id: 'pdv-payment',
      title: '💳 Forma de Pagamento',
      description:
        'Escolha entre: Dinheiro (informe o valor recebido para calcular troco), PIX (aguarde confirmação) ou Cartão (crédito/débito).',
      target: '[data-tutorial="payment-modal"]',
      placement: 'center',
      route: '/pdv',
    },
    {
      id: 'pdv-cash-payment',
      title: '💵 Pagamento em Dinheiro',
      description:
        'Digite o valor que o cliente entregou, ou use os atalhos rápidos (+R$10, +R$20, +R$50, +R$100). O sistema calcula o troco automaticamente!',
      target: '[data-tutorial="cash-amount-input"]',
      placement: 'bottom',
      route: '/pdv',
    },
    {
      id: 'pdv-confirm',
      title: '✅ Confirmar e Imprimir',
      description:
        'Confira o troco a devolver e clique em "Confirmar". O cupom é impresso automaticamente (se configurado) e a venda é registrada!',
      target: '[data-tutorial="confirm-sale-button"]',
      placement: 'bottom',
      action: 'click',
      route: '/pdv',
    },
    {
      id: 'pdv-success',
      title: '🎉 Parabéns! Venda Concluída!',
      description:
        'Você completou sua primeira venda! O estoque foi atualizado automaticamente e tudo ficou registrado no controle de caixa. Pronto para o próximo cliente!',
      placement: 'center',
      route: '/pdv',
    },
  ],
};
