import type { Page } from '@playwright/test';
import { Faker, fakerPT_BR } from '@faker-js/faker';

// Tipos para o Mock
type MockProduct = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  min_stock_quantity: number;
  unit: string;
  category_id: string | null;
  supplier_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type MockEmployee = {
  id: string;
  name: string;
  pin: string;
  role: 'ADMIN' | 'MANAGER' | 'STOCK' | 'CASHIER' | 'SELLER';
  is_active: boolean;
  created_at: string;
};

// Faker configurado para PT-BR
const faker = new Faker({ locale: [fakerPT_BR] });

/**
 * Injeta dados realistas no Web Mock do navegador (localStorage)
 * Deve ser chamado no setup do teste (beforeEach ou setup global)
 */
export const seedWebMock = async (page: Page) => {
  const seedData = await page.evaluate(async () => {
    // Geradores embutidos no contexto do browser para evitar serialização complexa
    const generateId = () => Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    // Produtos Realistas (Mercado + Motopeças)
    const products: MockProduct[] = [];

    // Categorias básicas para gerar coerência
    const categories = [
      { id: 'cat-alimentos', name: 'Alimentos' },
      { id: 'cat-bebidas', name: 'Bebidas' },
      { id: 'cat-pecas', name: 'Peças Moto' },
      { id: 'cat-leite', name: 'Laticínios' },
    ];

    // 100 Produtos Aleatórios
    for (let i = 0; i < 100; i++) {
      const isMoto = Math.random() > 0.7; // 30% motopeças
      const price = parseFloat((Math.random() * 100 + 1).toFixed(2));

      products.push({
        id: generateId(),
        name: isMoto ? `Kit Relação ${i}` : `Produto Mercado ${i}`, // Simplificando string generation no browser
        description: 'Produto gerado automaticamente para simulação',
        sku: `SKU-${1000 + i}`,
        barcode: isMoto ? `789000${1000 + i}` : `789123${1000 + i}`, // Barcodes previsíveis para teste
        price: price,
        cost_price: parseFloat((price * 0.6).toFixed(2)),
        stock_quantity: Math.floor(Math.random() * 500),
        min_stock_quantity: 10,
        unit: 'UN',
        category_id: isMoto ? 'cat-pecas' : 'cat-alimentos',
        supplier_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    // Produtos "Conhecidos" para os testes acharem fácil
    products.push({
      id: 'prod-arroz',
      name: 'Arroz Branco Tipo 1 5kg',
      description: 'Arroz de primeira',
      sku: 'ARROZ-01',
      barcode: '7891234567890',
      price: 29.9,
      cost_price: 22.5,
      stock_quantity: 1000,
      min_stock_quantity: 50,
      unit: 'PCT',
      category_id: 'cat-alimentos',
      supplier_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    products.push({
      id: 'prod-oleo',
      name: 'Óleo Motor 20w50',
      description: null,
      sku: 'OLEO-01',
      barcode: '7890001112223',
      price: 35.0,
      cost_price: 18.0,
      stock_quantity: 50,
      min_stock_quantity: 5,
      unit: 'L',
      category_id: 'cat-pecas',
      supplier_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // Funcionários para as roles
    const employees: MockEmployee[] = [
      {
        id: 'emp-admin',
        name: 'Administrador Padrão',
        pin: '8899',
        role: 'ADMIN',
        is_active: true,
        created_at: now,
      },
      {
        id: 'emp-stock',
        name: 'João Estoquista',
        pin: '1111',
        role: 'STOCK',
        is_active: true,
        created_at: now,
      },
      {
        id: 'emp-seller',
        name: 'Maria Vendedora',
        pin: '2222',
        role: 'SELLER',
        is_active: true,
        created_at: now,
      },
      {
        id: 'emp-cashier',
        name: 'Pedro Caixa',
        pin: '3333',
        role: 'CASHIER',
        is_active: true,
        created_at: now,
      },
    ];

    // Monta o objeto DB
    const db = {
      products,
      employees,
      categories,
      sales: [],
      customers: [],
      suppliers: [],
      cashSessionHistory: [],
      currentCashSession: null,
    };

    localStorage.setItem('__giro_web_mock_db__', JSON.stringify(db));
    return db;
  });

  console.log(`✅ Web Mock Seeded: ${seedData.products.length} produtos.`);
};
