import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Seedha direct URL. Na koi error, na koi nakhra. — ab env se aata hai, hardcoded nahi.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Prevents Next.js dev's hot-reload from creating a fresh PrismaClient (and a
// fresh DB connection pool) on every file save — a very common cause of
// "too many connections" errors in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;