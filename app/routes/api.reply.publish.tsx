import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { publishReply } from "../lib/judgeMe.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const reviewId = formData.get("reviewId")?.toString();
  const intent = formData.get("intent")?.toString();

  if (!reviewId || (intent !== "publish" && intent !== "delete")) {
    return json({ error: "Missing parameters or invalid intent" }, { status: 400 });
  }

  const [review, reply, settings] = await Promise.all([
    db.review.findUnique({ where: { id: reviewId, shop } }),
    db.reply.findUnique({ where: { reviewId } }),
    db.shopSettings.findUnique({ where: { shop } })
  ]);

  if (!review) {
    return json({ error: "Review not found" }, { status: 404 });
  }

  if (intent === "delete") {
    try {
      await db.reply.deleteMany({ where: { reviewId: review.id } });
      await db.review.delete({ where: { id: review.id } });
      await db.usageLog.create({ data: { shop, action: "delete", reviewId: review.id } });
      return json({ success: true, action: "delete" });
    } catch (err: any) {
      return json({ error: err.message || "Failed to delete review" }, { status: 500 });
    }
  }

  if (!reply) {
    return json({ error: "Reply not found" }, { status: 404 });
  }

  const provider = review.provider?.toLowerCase() || "judgeme";

  try {
    if (provider === "judgeme") {
      if (!settings?.judgeMeApiToken) {
        return json({ error: "Judge.me API Token is not configured." }, { status: 400 });
      }
      if (!review.judgeMeId) {
         return json({ error: "Judge.me Review ID missing." }, { status: 400 });
      }
      await publishReply(review.judgeMeId, reply.body, settings.judgeMeApiToken);
    } else if (provider === "loox") {
      if (!settings?.looxApiToken) {
        return json({ error: "Loox API Token is not configured." }, { status: 400 });
      }
      // TODO: Implement actual Loox API call
      console.log("Mock Loox publish:", review.id);
    } else if (provider === "manual" || provider === "csv") {
      // Just mark as published in the local DB
      console.log(`Publishing ${provider} review locally:`, review.id);
    } else {
      return json({ error: "Unknown provider" }, { status: 400 });
    }

    // Update local DB to mark as published
    await db.review.update({
      where: { id: review.id },
      data: { status: "published" }
    });

    await db.reply.update({
      where: { reviewId: review.id },
      data: { publishedAt: new Date() }
    });

    await db.usageLog.create({
      data: { shop, action: "publish", reviewId: review.id }
    });

    return json({ success: true, action: "publish" });
  } catch (err: any) {
    console.error("Publish error:", err);
    return json({ error: err.message || "Failed to publish reply to Judge.me" }, { status: 500 });
  }
};
