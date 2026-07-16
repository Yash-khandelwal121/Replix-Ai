import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function test() {
  try {
    const shop = "foot-store-yash.myshopify.com";
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    console.log("Checking DB connection...");
    
    const [pendingCount, publishedToday, reviews, replies, thisWeekReviews, lastWeekReviews] = await Promise.all([
      db.review.count({ where: { shop, status: "pending" } }),
      db.reply.count({ 
        where: { 
          shop, 
          publishedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } 
        } 
      }),
      db.review.findMany({ where: { shop }, select: { rating: true } }),
      db.reply.count({ where: { shop } }),
      db.review.count({
        where: { shop, createdAt: { gte: sevenDaysAgo } }
      }),
      db.review.count({
        where: { shop, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }
      })
    ]);

    console.log("Success!", {
      pendingCount, publishedToday, reviews: reviews.length, replies, thisWeekReviews, lastWeekReviews
    });
  } catch (e) {
    console.error("Error in loader logic:", e);
  } finally {
    await db.$disconnect();
  }
}

test();
