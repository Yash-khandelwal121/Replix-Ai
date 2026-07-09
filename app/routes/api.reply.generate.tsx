import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { generateReply } from "../lib/claude.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const reviewId = formData.get("reviewId")?.toString();
  const tone = formData.get("tone")?.toString() || "professional";
  const length = formData.get("length")?.toString() || "medium";
  const intent = formData.get("intent")?.toString();

  if (!reviewId || intent !== "generate") {
    return json({ error: "Missing parameters or invalid intent" }, { status: 400 });
  }

  const [review, settings] = await Promise.all([
    db.review.findUnique({ where: { id: reviewId, shop } }),
    db.shopSettings.findUnique({ where: { shop } })
  ]);

  if (!review) {
    return json({ error: "Review not found" }, { status: 404 });
  }

  if (!settings?.claudeApiKey) {
    return json({ error: "Claude API Key is not configured. Please add it in Settings." }, { status: 400 });
  }

  try {
    const generatedText = await generateReply({
      review: review.body,
      customerName: review.customerName,
      productName: review.productName || "our product",
      rating: review.rating,
      tone,
      length,
      brandVoice: settings.brandVoicePrompt || undefined,
      signature: settings.defaultSignature || undefined,
      apiKey: settings.claudeApiKey
    });

    // Upsert Reply
    await db.reply.upsert({
      where: { reviewId: review.id },
      create: { shop, reviewId: review.id, body: generatedText, tone, length },
      update: { body: generatedText, tone, length, updatedAt: new Date() }
    });

    // Update Review status if pending
    if (review.status === "pending") {
      await db.review.update({ where: { id: review.id }, data: { status: "replied" } });
    }

    await db.usageLog.create({
      data: { shop, action: "generate", reviewId: review.id }
    });

    return json({ reply: generatedText });
  } catch (err: any) {
    console.error("AI Generation error:", err);
    return json({ error: err.message || "Failed to generate reply" }, { status: 500 });
  }
};
