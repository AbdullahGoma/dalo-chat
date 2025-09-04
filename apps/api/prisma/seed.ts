import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: '123456',
    },
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
