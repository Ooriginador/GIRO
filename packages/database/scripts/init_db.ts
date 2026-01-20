import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: process.cwd() + '/.env' });

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Applying recommended PRAGMA settings...');
    // Use queryRaw for PRAGMA since some PRAGMA statements return values
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA wal_autocheckpoint = 1000;');

    console.log('Running WAL checkpoint (TRUNCATE)...');
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');

    console.log('Database initialization complete.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
