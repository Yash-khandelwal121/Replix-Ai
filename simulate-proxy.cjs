const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const where = {
    productId: '10268415951131',
    status: 'published'
  };
  console.log("Prisma Where Clause:", JSON.stringify(where, null, 2));

  const [reviews, totalCount] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10,
      include: { reply: true }
    }),
    prisma.review.count({ where })
  ]);
  
  const hasMore = reviews.length < totalCount;

  console.log("Returned Reviews Array:", JSON.stringify(reviews, null, 2));
  
  const jsonResponse = { reviews, totalCount, hasMore };
  console.log("JSON Response to Storefront:", JSON.stringify(jsonResponse, null, 2));
}

main().finally(() => prisma.$disconnect());
