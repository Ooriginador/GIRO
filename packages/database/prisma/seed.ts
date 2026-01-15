// ════════════════════════════════════════════════════════════════════════════
// MERCEARIAS - Database Seed Script
// ════════════════════════════════════════════════════════════════════════════
// Popula o banco de dados com dados iniciais
// ════════════════════════════════════════════════════════════════════════════

import { EmployeeRole, PrismaClient, ProductUnit, SettingType } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// ════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ════════════════════════════════════════════════════════════════════════════

async function seedCategories() {
  console.log('🏷️  Criando categorias...');

  const categories = [
    { name: 'Bebidas', color: '#3b82f6', icon: 'wine', sortOrder: 1 },
    { name: 'Laticínios', color: '#f59e0b', icon: 'milk', sortOrder: 2 },
    { name: 'Carnes', color: '#ef4444', icon: 'beef', sortOrder: 3 },
    { name: 'Hortifrúti', color: '#22c55e', icon: 'apple', sortOrder: 4 },
    { name: 'Padaria', color: '#d97706', icon: 'croissant', sortOrder: 5 },
    { name: 'Limpeza', color: '#06b6d4', icon: 'sparkles', sortOrder: 6 },
    { name: 'Higiene', color: '#ec4899', icon: 'bath', sortOrder: 7 },
    { name: 'Mercearia', color: '#8b5cf6', icon: 'package', sortOrder: 8 },
    { name: 'Frios', color: '#64748b', icon: 'snowflake', sortOrder: 9 },
    { name: 'Congelados', color: '#0ea5e9', icon: 'thermometer-snowflake', sortOrder: 10 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
  }

  console.log(`   ✅ ${categories.length} categorias criadas`);
}

async function seedEmployee() {
  console.log('👤 Criando funcionários...');

  const admin = await prisma.employee.upsert({
    where: { cpf: '00000000000' },
    update: {},
    create: {
      name: 'Administrador',
      cpf: '00000000000',
      pin: hashPin('8899'),
      password: hashPassword('admin123'),
      role: EmployeeRole.ADMIN,
      email: 'admin@mercearias.local',
    },
  });

  const cashier = await prisma.employee.upsert({
    where: { cpf: '11111111111' },
    update: {},
    create: {
      name: 'Operador de Caixa',
      cpf: '11111111111',
      pin: hashPin('0000'),
      password: null,
      role: EmployeeRole.CASHIER,
      email: 'caixa@mercearias.local',
    },
  });

  const manager = await prisma.employee.upsert({
    where: { cpf: '22222222222' },
    update: {},
    create: {
      name: 'Gerente',
      cpf: '22222222222',
      pin: hashPin('9999'),
      password: hashPassword('gerente123'),
      role: EmployeeRole.MANAGER,
      email: 'gerente@mercearias.local',
    },
  });

  console.log(`   ✅ Admin criado (PIN: 8899, Senha: admin123)`);
  console.log(`   ✅ Operador criado (PIN: 0000)`);
  console.log(`   ✅ Gerente criado (PIN: 9999, Senha: gerente123)`);
  return admin;
}

async function seedSettings() {
  console.log('⚙️  Criando configurações padrão...');

  const settings = [
    // General
    {
      key: 'company.name',
      value: 'Minha Mercearia',
      group: 'company',
      type: SettingType.STRING,
      description: 'Nome do estabelecimento',
    },
    {
      key: 'company.cnpj',
      value: '',
      group: 'company',
      type: SettingType.STRING,
      description: 'CNPJ do estabelecimento',
    },
    {
      key: 'company.address',
      value: '',
      group: 'company',
      type: SettingType.STRING,
      description: 'Endereço completo',
    },
    {
      key: 'company.phone',
      value: '',
      group: 'company',
      type: SettingType.STRING,
      description: 'Telefone de contato',
    },

    // PDV
    {
      key: 'pdv.auto_print_receipt',
      value: 'true',
      group: 'pdv',
      type: SettingType.BOOLEAN,
      description: 'Imprimir cupom automaticamente após venda',
    },
    {
      key: 'pdv.auto_open_drawer',
      value: 'true',
      group: 'pdv',
      type: SettingType.BOOLEAN,
      description: 'Abrir gaveta automaticamente em vendas dinheiro',
    },
    {
      key: 'pdv.allow_sale_zero_stock',
      value: 'true',
      group: 'pdv',
      type: SettingType.BOOLEAN,
      description: 'Permitir venda com estoque zerado',
    },
    {
      key: 'pdv.beep_on_scan',
      value: 'true',
      group: 'pdv',
      type: SettingType.BOOLEAN,
      description: 'Tocar beep ao escanear produto',
    },

    // Printer
    {
      key: 'printer.enabled',
      value: 'false',
      group: 'printer',
      type: SettingType.BOOLEAN,
      description: 'Impressora habilitada',
    },
    {
      key: 'printer.type',
      value: 'epson',
      group: 'printer',
      type: SettingType.STRING,
      description: 'Tipo da impressora (epson, elgin, bematech)',
    },
    {
      key: 'printer.connection',
      value: 'usb',
      group: 'printer',
      type: SettingType.STRING,
      description: 'Tipo de conexão (usb, serial, network)',
    },
    {
      key: 'printer.port',
      value: '',
      group: 'printer',
      type: SettingType.STRING,
      description: 'Porta da impressora',
    },
    {
      key: 'printer.width',
      value: '48',
      group: 'printer',
      type: SettingType.NUMBER,
      description: 'Largura do cupom em caracteres',
    },

    // Scale
    {
      key: 'scale.enabled',
      value: 'false',
      group: 'scale',
      type: SettingType.BOOLEAN,
      description: 'Balança habilitada',
    },
    {
      key: 'scale.type',
      value: 'toledo',
      group: 'scale',
      type: SettingType.STRING,
      description: 'Tipo da balança (toledo, filizola, elgin)',
    },
    {
      key: 'scale.port',
      value: 'COM1',
      group: 'scale',
      type: SettingType.STRING,
      description: 'Porta serial da balança',
    },

    // Alerts
    {
      key: 'alerts.expiration_critical_days',
      value: '3',
      group: 'alerts',
      type: SettingType.NUMBER,
      description: 'Dias para alerta crítico de vencimento',
    },
    {
      key: 'alerts.expiration_warning_days',
      value: '7',
      group: 'alerts',
      type: SettingType.NUMBER,
      description: 'Dias para alerta de atenção de vencimento',
    },
    {
      key: 'alerts.expiration_notice_days',
      value: '15',
      group: 'alerts',
      type: SettingType.NUMBER,
      description: 'Dias para aviso de vencimento',
    },

    // Backup
    {
      key: 'backup.auto_enabled',
      value: 'true',
      group: 'backup',
      type: SettingType.BOOLEAN,
      description: 'Backup automático habilitado',
    },
    {
      key: 'backup.frequency',
      value: 'daily',
      group: 'backup',
      type: SettingType.STRING,
      description: 'Frequência do backup (daily, weekly)',
    },
    {
      key: 'backup.time',
      value: '03:00',
      group: 'backup',
      type: SettingType.STRING,
      description: 'Horário do backup automático',
    },
    {
      key: 'backup.keep_days',
      value: '7',
      group: 'backup',
      type: SettingType.NUMBER,
      description: 'Dias para manter backups locais',
    },
    {
      key: 'backup.gdrive_enabled',
      value: 'false',
      group: 'backup',
      type: SettingType.BOOLEAN,
      description: 'Backup no Google Drive habilitado',
    },

    // Discount limits by role
    {
      key: 'discount.max_cashier',
      value: '5',
      group: 'discount',
      type: SettingType.NUMBER,
      description: 'Desconto máximo para caixa (%)',
    },
    {
      key: 'discount.max_manager',
      value: '20',
      group: 'discount',
      type: SettingType.NUMBER,
      description: 'Desconto máximo para gerente (%)',
    },

    // Theme
    {
      key: 'theme.mode',
      value: 'light',
      group: 'theme',
      type: SettingType.STRING,
      description: 'Tema (light, dark, system)',
    },
    {
      key: 'theme.primary_color',
      value: '#6366f1',
      group: 'theme',
      type: SettingType.STRING,
      description: 'Cor primária',
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        type: setting.type,
        group: setting.group,
        description: setting.description,
      },
      create: setting,
    });
  }

  console.log(`   ✅ ${settings.length} configurações criadas`);
}

async function seedSampleProducts() {
  console.log('📦 Criando produtos de exemplo...');

  // Buscar categorias
  const bebidas = await prisma.category.findUnique({ where: { name: 'Bebidas' } });
  const laticinios = await prisma.category.findUnique({ where: { name: 'Laticínios' } });
  const padaria = await prisma.category.findUnique({ where: { name: 'Padaria' } });
  const mercearia = await prisma.category.findUnique({ where: { name: 'Mercearia' } });

  if (!bebidas || !laticinios || !padaria || !mercearia) {
    console.log('   ⚠️  Categorias não encontradas, pulando produtos de exemplo');
    return;
  }

  const products = [
    // Bebidas
    {
      internalCode: 'MRC-00001',
      barcode: '7891234567890',
      name: 'Refrigerante Cola 2L',
      categoryId: bebidas.id,
      salePrice: 9.99,
      costPrice: 6.5,
      unit: ProductUnit.UNIT,
      currentStock: 50,
    },
    {
      internalCode: 'MRC-00002',
      barcode: '7891234567891',
      name: 'Água Mineral 500ml',
      categoryId: bebidas.id,
      salePrice: 2.5,
      costPrice: 1.2,
      unit: ProductUnit.UNIT,
      currentStock: 100,
    },
    {
      internalCode: 'MRC-00003',
      barcode: '7891234567892',
      name: 'Suco de Laranja 1L',
      categoryId: bebidas.id,
      salePrice: 7.9,
      costPrice: 4.5,
      unit: ProductUnit.UNIT,
      currentStock: 30,
    },

    // Laticínios
    {
      internalCode: 'MRC-00004',
      barcode: '7891234567893',
      name: 'Leite Integral 1L',
      categoryId: laticinios.id,
      salePrice: 5.99,
      costPrice: 4.2,
      unit: ProductUnit.UNIT,
      currentStock: 40,
    },
    {
      internalCode: 'MRC-00005',
      barcode: '7891234567894',
      name: 'Queijo Mussarela',
      categoryId: laticinios.id,
      salePrice: 45.9,
      costPrice: 32.0,
      unit: ProductUnit.KILOGRAM,
      currentStock: 5,
      isWeighted: true,
    },
    {
      internalCode: 'MRC-00006',
      barcode: '7891234567895',
      name: 'Iogurte Natural 170g',
      categoryId: laticinios.id,
      salePrice: 3.49,
      costPrice: 2.1,
      unit: ProductUnit.UNIT,
      currentStock: 25,
    },

    // Padaria
    {
      internalCode: 'MRC-00007',
      barcode: null,
      name: 'Pão Francês',
      categoryId: padaria.id,
      salePrice: 18.9,
      costPrice: 12.0,
      unit: ProductUnit.KILOGRAM,
      currentStock: 10,
      isWeighted: true,
    },
    {
      internalCode: 'MRC-00008',
      barcode: '7891234567896',
      name: 'Pão de Forma 500g',
      categoryId: padaria.id,
      salePrice: 7.99,
      costPrice: 5.0,
      unit: ProductUnit.UNIT,
      currentStock: 15,
    },

    // Mercearia
    {
      internalCode: 'MRC-00009',
      barcode: '7891234567897',
      name: 'Arroz Tipo 1 5kg',
      categoryId: mercearia.id,
      salePrice: 24.9,
      costPrice: 18.0,
      unit: ProductUnit.UNIT,
      currentStock: 20,
    },
    {
      internalCode: 'MRC-00010',
      barcode: '7891234567898',
      name: 'Feijão Carioca 1kg',
      categoryId: mercearia.id,
      salePrice: 8.99,
      costPrice: 6.0,
      unit: ProductUnit.UNIT,
      currentStock: 35,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { internalCode: prod.internalCode },
      update: prod,
      create: prod,
    });
  }

  console.log(`   ✅ ${products.length} produtos de exemplo criados`);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  🌱 MERCEARIAS - Database Seed');
  console.log('════════════════════════════════════════════════════════════════\n');

  try {
    await seedCategories();
    await seedEmployee();
    await seedSettings();
    await seedSampleProducts();

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('  ✅ Seed concluído com sucesso!');
    console.log('════════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Erro durante o seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
