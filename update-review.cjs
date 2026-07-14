const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.review.updateMany({
    where: { productId: '10268415951131' },
    data: { status: 'published' }
  });
}
main().finally(() => prisma.$disconnect());
