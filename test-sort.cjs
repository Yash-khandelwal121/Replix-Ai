const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reviews = await prisma.review.findMany({
    where: { productId: '10268415951131', status: 'published' },
    orderBy: { createdAt: 'asc' },
    skip: 0,
    take: 10,
    include: { reply: true }
  });
  console.log("Oldest reviews:", JSON.stringify(reviews, null, 2));
}
main().finally(() => prisma.$disconnect());
