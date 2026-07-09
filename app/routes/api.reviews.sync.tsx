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
    return json({ error: "Judge.me API Token is not configured. Please add it in Settings." }, { status: 400 });
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
