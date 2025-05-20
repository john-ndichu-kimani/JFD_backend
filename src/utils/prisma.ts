import { PrismaClient } from '@prisma/client';

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export default prisma;