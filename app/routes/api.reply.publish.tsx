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

  if (!reviewId || intent !== "publish") {
    return json({ error: "Missing parameters or invalid intent" }, { status: 400 });
  }

  const [review, reply, settings] = await Promise.all([
    db.review.findUnique({ where: { id: reviewId, shop } }),
    db.reply.findUnique({ where: { reviewId } }),
    db.shopSettings.findUnique({ where: { shop } })
  ]);

  if (!review || !reply) {
    return json({ error: "Review or Reply not found" }, { status: 404 });
  }

  if (!settings?.judgeMeApiToken) {
    return json({ error: "Judge.me API Token is not configured." }, { status: 400 });
  }

  try {
    await publishReply(review.judgeMeId, reply.body, settings.judgeMeApiToken);

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

    return json({ success: true });
  } catch (err: any) {
    console.error("Publish error:", err);
    return json({ error: err.message || "Failed to publish reply to Judge.me" }, { status: 500 });
  }
};
