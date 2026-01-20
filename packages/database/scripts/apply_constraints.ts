import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: process.cwd() + '/.env' });

async function main() {
  const prisma = new PrismaClient();
  try {
    const sqlPath = path.join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260120163000_add_constraints',
      'migration.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log('Applying DB constraints from', sqlPath);
    // Split by semicolon and execute statements safely
    // Some statements contain semicolons inside triggers, so execute whole file
    await prisma.$executeRawUnsafe(sql);
    console.log('Constraints applied successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
