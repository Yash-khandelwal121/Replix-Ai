const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const review = await prisma.review.findFirst({
    where: { productName: { contains: 'Track', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(review, null, 2));
}

main().finally(() => prisma.$disconnect());
