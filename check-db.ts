import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const reviews = await prisma.review.findMany({
    include: { reply: true },
    where: { status: 'replied' }
  });
  console.log(Found  replied reviews.);
  
  if (reviews.length > 0) {
    const rev = reviews[0];
    console.log(Review ID: );
    console.log(Status: );
    console.log(Reply Exists: );
    if (rev.reply) {
      console.log(Reply ID: );
      console.log(Reply Body Length: );
      console.log(Reply Body Preview: ...);
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
