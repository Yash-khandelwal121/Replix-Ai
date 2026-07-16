import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { fetchReviews } from "../lib/judgeMe.server";
import { detectSentiment } from "../lib/sentiment.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const settings = await db.shopSettings.findUnique({ where: { shop } });
  
  if (!settings?.judgeMeApiToken) {
    // Generate dummy reviews if no token is configured for demo purposes
    const demoReviews = [
      { customerName: "Alice Smith", rating: 5, body: "Absolutely love this product! It's amazing and fits perfectly.", sentiment: "positive" },
      { customerName: "Bob Jones", rating: 2, body: "Not what I expected. The quality is a bit lacking.", sentiment: "negative" },
      { customerName: "Charlie Brown", rating: 4, body: "Good value for money, but shipping was slow.", sentiment: "neutral" },
      { customerName: "Diana Prince", rating: 5, body: "Will definitely buy again. Customer service was excellent.", sentiment: "positive" },
      { customerName: "Evan Davis", rating: 1, body: "Terrible experience. The item broke after one use.", sentiment: "negative" }
    ];

    let syncedCount = 0;
    for (const r of demoReviews) {
      await db.review.create({
        data: {
          shop,
          judgeMeId: `demo-${Date.now()}-${syncedCount}`,
          customerName: r.customerName,
          rating: r.rating,
          body: r.body,
          status: "pending",
          provider: "judgeme",
          sentiment: r.sentiment,
          createdAt: new Date(Date.now() - syncedCount * 86400000)
        }
      });
      syncedCount++;
    }

    return json({ success: true, synced: syncedCount, isDemo: true });
  }

  try {
    const data = await fetchReviews(shop, settings.judgeMeApiToken, 1, 50); // Fetching first 50 for demo
    
    if (!data || !data.reviews) {
      return json({ error: "No reviews found or invalid token." }, { status: 400 });
    }

    let syncedCount = 0;

    for (const judgeReview of data.reviews) {
      // Basic mapping from Judge.me payload to our schema
      const mappedData = {
        shop,
        judgeMeId: judgeReview.id.toString(),
        customerName: judgeReview.reviewer?.name || "Anonymous",
        customerEmail: judgeReview.reviewer?.email || null,
        productId: judgeReview.product?.external_id?.toString() || null,
        productName: judgeReview.product?.title || null,
        productImage: judgeReview.product?.image_url || null,
        rating: judgeReview.rating,
        title: judgeReview.title || null,
        body: judgeReview.body || "",
        sentiment: detectSentiment(judgeReview.body || "", judgeReview.rating),
      };

      await db.review.upsert({
        where: { shop_judgeMeId: { shop, judgeMeId: mappedData.judgeMeId } },
        create: mappedData,
        update: mappedData
      });

      syncedCount++;
    }

    await db.usageLog.create({
      data: { shop, action: "sync", reviewId: null }
    });

    return json({ success: true, synced: syncedCount });
  } catch (err: any) {
    console.error("Sync error:", err);
    return json({ error: err.message || "Failed to sync reviews from Judge.me" }, { status: 500 });
  }
};
