/**
 * Tutorial: Localizações de Estoque
 * Gestão de múltiplas localizações e saldos
 */

import type { Tutorial } from '../types';

export const enterpriseLocationsTutorial: Tutorial = {
  id: 'enterprise-locations',
  name: 'Localizações de Estoque',
  description:
    'Configure e gerencie múltiplas localizações de estoque: almoxarifado central, containers em obra, depósitos temporários. Controle saldos por local.',
  category: 'enterprise',
  estimatedMinutes: 8,
  icon: 'MapPin',
  prerequisites: ['enterprise-transfers'],
  tags: ['localizações', 'almoxarifado', 'container', 'depósito', 'saldo', 'estoque', 'enterprise'],
  steps: [
    {
      id: 'locations-intro',
      title: '📍 Localizações de Estoque',
      description:
        'No Enterprise, você pode ter múltiplas localizações de estoque: almoxarifado central, containers em obras, depósitos temporários. Cada local tem seus próprios saldos!',
      placement: 'center',
      route: '/enterprise/locations',
    },
    {
      id: 'locations-list',
      title: '🗺️ Lista de Localizações',
      description:
        'Veja todas as localizações cadastradas. Os cards mostram nome, tipo, endereço, responsável e quantidade de itens em estoque.',
      target: '[data-tutorial="locations-list"]',
      placement: 'bottom',
      route: '/enterprise/locations',
    },
    {
      id: 'locations-types',
      title: '🏷️ Tipos de Localização',
      description:
        'Existem tipos pré-definidos: Almoxarifado Central (principal), Almoxarifado Obra (container), Depósito Temporário e Área de Staging. Cada tipo tem características específicas.',
      target: '[data-tutorial="locations-type-filter"]',
      placement: 'bottom',
      route: '/enterprise/locations',
    },
    {
      id: 'locations-new-button',
      title: '➕ Nova Localização',
      description:
        'Clique para cadastrar uma nova localização. Você definirá nome, tipo, endereço e responsável.',
      target: '[data-tutorial="new-location-button"]',
      placement: 'left',
      action: 'click',
      route: '/enterprise/locations',
    },
    {
      id: 'locations-form-name',
      title: '📝 Nome da Localização',
      description:
        'Escolha um nome descritivo e único. Exemplos: "Almoxarifado Central - Sede", "Container Obra CT-2026-001", "Depósito Temporário Campo".',
      target: '[data-tutorial="location-form-name"]',
      placement: 'right',
      route: '/enterprise/locations/new',
    },
    {
      id: 'locations-form-code',
      title: '🔤 Código',
      description:
        'Defina um código curto para identificação rápida. Exemplos: ALM-CENTRAL, CT-001-ALM, DEP-TEMP-01. Será usado em etiquetas e relatórios.',
      target: '[data-tutorial="location-form-code"]',
      placement: 'right',
      route: '/enterprise/locations/new',
    },
    {
      id: 'locations-form-type',
      title: '🏷️ Tipo',
      description:
        'Selecione o tipo que melhor descreve: Almoxarifado Central (estoque principal), Almoxarifado Obra (na obra), Depósito (armazenagem temporária) ou Staging (área de expedição).',
      target: '[data-tutorial="location-form-type"]',
      placement: 'right',
      route: '/enterprise/locations/new',
    },
    {
      id: 'locations-form-address',
      title: '🏠 Endereço',
      description:
        'Informe o endereço físico da localização. Importante para logística de transferências e rastreabilidade.',
      target: '[data-tutorial="location-form-address"]',
      placement: 'right',
      route: '/enterprise/locations/new',
    },
    {
      id: 'locations-form-manager',
      title: '👤 Responsável',
      description:
        'Selecione o funcionário responsável por esta localização. Ele receberá notificações de transferências e requisições.',
      target: '[data-tutorial="location-form-manager"]',
      placement: 'right',
      route: '/enterprise/locations/new',
    },
    {
      id: 'locations-form-contract',
      title: '📋 Contrato Vinculado',
      description:
        'Para localizações em obra, vincule ao contrato correspondente. Isso facilita relatórios e controle de consumo por projeto.',
      target: '[data-tutorial="location-form-contract"]',
      placement: 'right',
      route: '/enterprise/locations/new',
      skippable: true,
    },
    {
      id: 'locations-save',
      title: '💾 Salvar',
      description:
        'Revise os dados e clique em "Salvar". A localização estará disponível para transferências e requisições.',
      target: '[data-tutorial="location-save-button"]',
      placement: 'top',
      action: 'click',
      route: '/enterprise/locations/new',
    },
    {
      id: 'locations-detail',
      title: '📊 Detalhes da Localização',
      description:
        'A página de detalhes mostra informações completas: dados cadastrais, saldo de produtos, histórico de movimentações e indicadores.',
      target: '[data-tutorial="location-detail"]',
      placement: 'bottom',
      route: '/enterprise/locations/:id',
    },
    {
      id: 'locations-stock',
      title: '📦 Saldo de Estoque',
      description:
        'Veja todos os produtos e quantidades nesta localização. A tabela mostra código, nome, quantidade, valor e última movimentação.',
      target: '[data-tutorial="location-stock"]',
      placement: 'top',
      route: '/enterprise/locations/:id',
    },
    {
      id: 'locations-search-product',
      title: '🔍 Buscar Produto',
      description:
        'Procure um produto específico no estoque desta localização. Útil para verificar disponibilidade antes de uma requisição.',
      target: '[data-tutorial="location-stock-search"]',
      placement: 'bottom',
      route: '/enterprise/locations/:id',
    },
    {
      id: 'locations-movements',
      title: '📈 Histórico de Movimentações',
      description:
        'Veja todas as entradas e saídas desta localização: requisições atendidas, transferências recebidas/enviadas e ajustes de inventário.',
      target: '[data-tutorial="location-movements"]',
      placement: 'top',
      route: '/enterprise/locations/:id',
    },
    {
      id: 'locations-transfer-from',
      title: '📤 Transferir Daqui',
      description:
        'Atalho para criar uma transferência com origem nesta localização. Os produtos já aparecem pré-filtrados.',
      target: '[data-tutorial="location-transfer-from"]',
      placement: 'left',
      route: '/enterprise/locations/:id',
    },
    {
      id: 'locations-transfer-to',
      title: '📥 Receber Aqui',
      description:
        'Atalho para criar uma transferência com destino nesta localização. Ideal para solicitar materiais do almoxarifado central.',
      target: '[data-tutorial="location-transfer-to"]',
      placement: 'left',
      route: '/enterprise/locations/:id',
    },
    {
      id: 'locations-export',
      title: '📊 Exportar Relatório',
      description:
        'Exporte a posição de estoque em PDF ou Excel. Útil para inventário físico, prestação de contas e auditorias.',
      target: '[data-tutorial="location-export-button"]',
      placement: 'left',
      route: '/enterprise/locations/:id',
    },
    {
      id: 'locations-complete',
      title: '✅ Muito bem!',
      description:
        'Você aprendeu a gerenciar localizações de estoque! Agora pode criar almoxarifados em obras, controlar saldos e transferir materiais. Próximo: aprenda sobre Inventário.',
      placement: 'center',
      route: '/enterprise/locations',
    },
  ],
};
