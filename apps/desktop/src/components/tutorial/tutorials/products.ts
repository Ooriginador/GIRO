import type { Tutorial } from '../types';

export const productsTutorial: Tutorial = {
  id: 'products',
  name: 'Gestão de Produtos',
  description:
    'Aprenda a cadastrar, editar e organizar seu catálogo. Defina preços, categorias, margem de lucro e controle o estoque mínimo.',
  category: 'management',
  estimatedMinutes: 12,
  icon: 'Package',
  prerequisites: ['welcome'],
  tags: ['produtos', 'cadastro', 'categoria', 'preço', 'código de barras', 'gestão', 'margem'],
  steps: [
    {
      id: 'prod-intro',
      title: '📦 Seu Catálogo de Produtos',
      description:
        'Um bom cadastro de produtos é fundamental para vendas rápidas e relatórios precisos. Vamos aprender a manter tudo organizado!',
      placement: 'center',
      route: '/products',
    },
    {
      id: 'prod-list',
      title: '📝 Lista de Produtos',
      description:
        'Aqui estão todos os produtos cadastrados. Clique nos cabeçalhos das colunas para ordenar por nome, preço, estoque ou categoria.',
      target: '[data-tutorial="products-table"]',
      placement: 'bottom',
      route: '/products',
    },
    {
      id: 'prod-search',
      title: '🔍 Buscar Produtos',
      description:
        'Digite o nome, código interno (MRC-XXXXX) ou código de barras para encontrar rapidamente. A busca é instantânea!',
      target: '[data-tutorial="products-search"]',
      placement: 'bottom',
      action: 'type',
      actionData: 'arroz',
      route: '/products',
    },
    {
      id: 'prod-filters',
      title: 'Filtros',
      description:
        'Filtre por categoria, status (ativo/inativo) ou nível de estoque. Combine filtros para encontrar exatamente o que precisa.',
      target: '[data-tutorial="products-filters"]',
      placement: 'bottom',
      route: '/products',
    },
    {
      id: 'prod-new-button',
      title: '➕ Cadastrar Novo Produto',
      description:
        'Clique em "Novo Produto" para abrir o formulário de cadastro. Vamos criar um produto juntos!',
      target: '[data-tutorial="new-product-button"]',
      placement: 'bottom',
      action: 'click',
      route: '/products/new',
    },
    {
      id: 'prod-form-name',
      title: '✏️ Nome do Produto',
      description:
        'Digite um nome descritivo e completo. Por exemplo: "Arroz Branco Tio João 5kg" é melhor que apenas "Arroz". Isso facilita a busca no PDV!',
      target: '[data-tutorial="product-name"]',
      placement: 'bottom',
      action: 'type',
      required: true,
      route: '/products/new',
    },
    {
      id: 'prod-form-barcode',
      title: '🏷️ Código de Barras',
      description:
        'Escaneie ou digite o EAN-13 (13 dígitos) da embalagem. Se o produto não tiver código de barras, deixe em branco - o sistema gera um código interno automático.',
      target: '[data-tutorial="product-barcode"]',
      placement: 'bottom',
      route: '/products/new',
    },
    {
      id: 'prod-form-internal',
      title: 'Código Interno',
      description:
        'Gerado automaticamente pelo sistema (MRC-00001, MRC-00002...). Você também pode usar para buscar no PDV.',
      target: '[data-tutorial="product-internal-code"]',
      placement: 'bottom',
      route: '/products/new',
    },
    {
      id: 'prod-form-category',
      title: '📁 Categoria',
      description:
        'Selecione a categoria do produto (ex: Mercearia, Bebidas, Hortifruti). Categorias bem organizadas ajudam nos relatórios e na busca.',
      target: '[data-tutorial="product-category"]',
      placement: 'bottom',
      required: true,
      route: '/products/new',
    },
    {
      id: 'prod-form-unit',
      title: '📏 Unidade de Medida',
      description:
        'Escolha: UNIDADE (UN) para itens contáveis como latas e pacotes, ou QUILOGRAMA (KG) para produtos vendidos por peso.',
      target: '[data-tutorial="product-unit"]',
      placement: 'bottom',
      route: '/products/new',
    },
    {
      id: 'prod-form-weighted',
      title: '⚖️ Produto Pesável',
      description:
        'Ative esta opção para frutas, verduras, carnes e frios. O PDV solicitará o peso e pode integrar com a balança automaticamente.',
      target: '[data-tutorial="product-weighted"]',
      placement: 'bottom',
      route: '/products/new',
    },
    {
      id: 'prod-form-prices',
      title: '💰 Preços (Custo e Venda)',
      description:
        'Informe o preço de CUSTO (quanto você pagou) e o preço de VENDA (quanto vai cobrar). A margem de lucro é calculada automaticamente!',
      target: '[data-tutorial="product-prices"]',
      placement: 'bottom',
      required: true,
      route: '/products/new',
    },
    {
      id: 'prod-form-margin',
      title: '📈 Margem de Lucro',
      description:
        'A margem é calculada: (Venda - Custo) / Custo × 100. Verde = lucro saudável, Amarelo = margem baixa, Vermelho = prejuízo! Ajuste os preços se necessário.',
      target: '[data-tutorial="product-margin"]',
      placement: 'left',
      route: '/products/new',
    },
    {
      id: 'prod-form-stock',
      title: '📦 Estoque Inicial e Mínimo',
      description:
        'Defina o estoque atual e o estoque mínimo de alerta. Quando atingir o mínimo, você receberá uma notificação para repor!',
      target: '[data-tutorial="product-stock"]',
      placement: 'bottom',
      route: '/products/new',
    },
    {
      id: 'prod-form-save',
      title: '✅ Salvar Produto',
      description:
        'Revise os dados e clique em "Salvar". O produto estará disponível imediatamente no PDV para vendas!',
      target: '[data-tutorial="product-save"]',
      placement: 'top',
      action: 'click',
      route: '/products/new',
    },
    {
      id: 'prod-edit',
      title: 'Editar Produto',
      description:
        'Para editar, clique no produto na lista ou no ícone de lápis. Você pode alterar todos os campos.',
      target: '[data-tutorial="product-edit"]',
      placement: 'left',
      route: '/products',
    },
    {
      id: 'prod-deactivate',
      title: '🚫 Desativar vs Excluir',
      description:
        'Produtos com histórico de vendas não podem ser excluídos (para manter relatórios). Use "Desativar" - ele some do PDV mas mantém o histórico.',
      target: '[data-tutorial="product-status"]',
      placement: 'left',
      route: '/products',
    },
    {
      id: 'prod-categories',
      title: '📂 Gerenciar Categorias',
      description:
        'Clique em "Categorias" para criar, editar ou reorganizar. Boas categorias = relatórios mais úteis!',
      target: '[data-tutorial="categories-link"]',
      placement: 'right',
      route: '/products/categories',
    },
    {
      id: 'prod-done',
      title: '✅ Produtos Dominados!',
      description:
        'Você aprendeu a gerenciar produtos. Mantenha seu catálogo organizado para facilitar as vendas!',
      placement: 'center',
    },
  ],
};
