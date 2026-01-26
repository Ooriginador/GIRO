/**
 * Seed para perfil Enterprise (Almoxarifado Industrial)
 * Execute: pnpm prisma db seed --preview-feature
 */

import { PrismaClient, BusinessType, EmployeeRole, StockLocationType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEnterprise() {
  console.log('🏢 Iniciando seed Enterprise...\n');

  // 1. Configuração do perfil Enterprise
  console.log('📋 Criando configuração do perfil...');
  await prisma.businessConfig.upsert({
    where: { id: 'enterprise-config' },
    update: {},
    create: {
      id: 'enterprise-config',
      type: BusinessType.ENTERPRISE,
      name: 'Almoxarifado Industrial',
      description: 'Gestão de materiais para obras e projetos industriais',
      features: {
        pdv: false,
        inventory: true,
        contracts: true,
        workFronts: true,
        materialRequests: true,
        stockTransfers: true,
        multiLocation: true,
        activities: true,
        costCenters: true,
        reports: true,
      },
      labels: {
        product: 'Material',
        products: 'Materiais',
        customer: 'Colaborador',
        customers: 'Colaboradores',
        sale: 'Requisição',
        sales: 'Requisições',
        category: 'Categoria',
        supplier: 'Fornecedor',
      },
      settings: {
        requireApproval: true,
        approvalThreshold: 5000.0,
        lowStockAlertDays: 7,
        defaultRequisitionPriority: 'NORMAL',
      },
    },
  });

  // 2. Categorias padrão para Enterprise
  console.log('📦 Criando categorias...');
  const categories = [
    { name: 'Material Elétrico', icon: 'Zap', color: '#F59E0B' },
    { name: 'Material de Construção', icon: 'HardHat', color: '#6B7280' },
    { name: 'EPIs', icon: 'Shield', color: '#EF4444' },
    { name: 'Ferramentas', icon: 'Wrench', color: '#3B82F6' },
    { name: 'Material Hidráulico', icon: 'Droplet', color: '#06B6D4' },
    { name: 'Material de Acabamento', icon: 'Paintbrush', color: '#8B5CF6' },
    { name: 'Material de Soldagem', icon: 'Flame', color: '#F97316' },
    { name: 'Consumíveis', icon: 'Package', color: '#10B981' },
    { name: 'Material de Fixação', icon: 'Anchor', color: '#64748B' },
    { name: 'Tubulação e Conexões', icon: 'GitBranch', color: '#0EA5E9' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        name_businessType: {
          name: cat.name,
          businessType: BusinessType.ENTERPRISE,
        },
      },
      update: { icon: cat.icon, color: cat.color },
      create: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        businessType: BusinessType.ENTERPRISE,
        isActive: true,
      },
    });
  }

  // 3. Fornecedores de exemplo
  console.log('🏭 Criando fornecedores...');
  const suppliers = [
    {
      name: 'Distribuidora Elétrica Norte',
      document: '12.345.678/0001-90',
      email: 'comercial@eletricanorte.com.br',
      phone: '(81) 3333-1111',
    },
    {
      name: 'Materiais Construção Sul',
      document: '23.456.789/0001-01',
      email: 'vendas@construcaosul.com.br',
      phone: '(81) 3333-2222',
    },
    {
      name: 'EPIs Segurança Total',
      document: '34.567.890/0001-12',
      email: 'atendimento@segurancatotal.com.br',
      phone: '(81) 3333-3333',
    },
    {
      name: 'Ferragens Industrial',
      document: '45.678.901/0001-23',
      email: 'vendas@ferragensindustrial.com.br',
      phone: '(81) 3333-4444',
    },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { document: sup.document },
      update: {},
      create: {
        ...sup,
        businessType: BusinessType.ENTERPRISE,
        isActive: true,
      },
    });
  }

  // 4. Locais de estoque
  console.log('📍 Criando locais de estoque...');
  const centralWarehouse = await prisma.stockLocation.upsert({
    where: { code: 'ALM-CENTRAL' },
    update: {},
    create: {
      code: 'ALM-CENTRAL',
      name: 'Almoxarifado Central',
      type: StockLocationType.CENTRAL,
      address: 'Sede Administrativa - Galpão Principal',
      isActive: true,
      businessType: BusinessType.ENTERPRISE,
    },
  });

  // 5. Colaboradores de exemplo
  console.log('👥 Criando colaboradores...');
  const employees = [
    {
      code: 'EMP-001',
      name: 'Carlos Administrador',
      email: 'carlos.admin@empresa.com',
      role: EmployeeRole.ADMIN,
      pin: '1234',
    },
    {
      code: 'EMP-002',
      name: 'Maria Gerente de Contrato',
      email: 'maria.gerente@empresa.com',
      role: EmployeeRole.CONTRACT_MANAGER,
      pin: '2345',
    },
    {
      code: 'EMP-003',
      name: 'João Supervisor',
      email: 'joao.supervisor@empresa.com',
      role: EmployeeRole.SUPERVISOR,
      pin: '3456',
    },
    {
      code: 'EMP-004',
      name: 'Ana Almoxarife',
      email: 'ana.almoxarife@empresa.com',
      role: EmployeeRole.WAREHOUSE,
      pin: '4567',
    },
    {
      code: 'EMP-005',
      name: 'Pedro Requisitante',
      email: 'pedro.requisitante@empresa.com',
      role: EmployeeRole.REQUESTER,
      pin: '5678',
    },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { code: emp.code },
      update: {},
      create: {
        ...emp,
        businessType: BusinessType.ENTERPRISE,
        isActive: true,
      },
    });
  }

  // 6. Materiais de exemplo
  console.log('🧱 Criando materiais...');
  const materials = [
    { code: 'MAT-001', name: 'Cimento CP-II 50kg', unit: 'SC', minStock: 100, costPrice: 32.0 },
    { code: 'MAT-002', name: 'Areia Média m³', unit: 'M3', minStock: 50, costPrice: 120.0 },
    { code: 'MAT-003', name: 'Brita 1 m³', unit: 'M3', minStock: 30, costPrice: 150.0 },
    { code: 'MAT-004', name: 'Vergalhão CA-50 10mm', unit: 'BR', minStock: 200, costPrice: 45.0 },
    { code: 'MAT-005', name: 'Cabo Flexível 2.5mm²', unit: 'M', minStock: 500, costPrice: 2.5 },
    { code: 'MAT-006', name: 'Disjuntor 20A', unit: 'UN', minStock: 50, costPrice: 18.0 },
    { code: 'MAT-007', name: 'Tubo PVC 100mm', unit: 'BR', minStock: 100, costPrice: 35.0 },
    { code: 'MAT-008', name: 'Capacete de Segurança', unit: 'UN', minStock: 30, costPrice: 25.0 },
    { code: 'MAT-009', name: 'Luva de Proteção', unit: 'PR', minStock: 50, costPrice: 15.0 },
    { code: 'MAT-010', name: 'Óculos de Segurança', unit: 'UN', minStock: 30, costPrice: 12.0 },
  ];

  const categoryElectric = await prisma.category.findFirst({
    where: { name: 'Material Elétrico', businessType: BusinessType.ENTERPRISE },
  });
  const categoryConstruction = await prisma.category.findFirst({
    where: { name: 'Material de Construção', businessType: BusinessType.ENTERPRISE },
  });
  const categoryEPI = await prisma.category.findFirst({
    where: { name: 'EPIs', businessType: BusinessType.ENTERPRISE },
  });

  for (const mat of materials) {
    let categoryId = categoryConstruction?.id;
    if (mat.code.includes('005') || mat.code.includes('006')) {
      categoryId = categoryElectric?.id;
    } else if (mat.code.includes('008') || mat.code.includes('009') || mat.code.includes('010')) {
      categoryId = categoryEPI?.id;
    }

    await prisma.product.upsert({
      where: { code: mat.code },
      update: {},
      create: {
        code: mat.code,
        name: mat.name,
        unit: mat.unit,
        minStock: mat.minStock,
        costPrice: mat.costPrice,
        salePrice: mat.costPrice * 1.3,
        categoryId,
        businessType: BusinessType.ENTERPRISE,
        isActive: true,
      },
    });
  }

  // 7. Estoque inicial no Almoxarifado Central
  console.log('📊 Criando estoque inicial...');
  const products = await prisma.product.findMany({
    where: { businessType: BusinessType.ENTERPRISE },
  });

  for (const product of products) {
    const initialStock = product.minStock ? product.minStock * 2 : 100;

    await prisma.stockBalance.upsert({
      where: {
        productId_locationId: {
          productId: product.id,
          locationId: centralWarehouse.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        locationId: centralWarehouse.id,
        quantity: initialStock,
        reservedQuantity: 0,
        lastUpdated: new Date(),
      },
    });
  }

  console.log('\n✅ Seed Enterprise concluído com sucesso!');
  console.log('   - Configuração: 1');
  console.log(`   - Categorias: ${categories.length}`);
  console.log(`   - Fornecedores: ${suppliers.length}`);
  console.log(`   - Colaboradores: ${employees.length}`);
  console.log(`   - Materiais: ${materials.length}`);
  console.log('   - Local de estoque: 1 (Almoxarifado Central)');
}

// Executar seed
seedEnterprise()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
