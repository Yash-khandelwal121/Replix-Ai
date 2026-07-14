import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  
  // Customer redact logic
  if (payload && payload.customer && payload.customer.email) {
    const email = payload.customer.email;
    await db.review.updateMany({
      where: { shop, customerEmail: email },
      data: { customerName: "Redacted", customerEmail: "redacted@example.com", customerAvatar: null }
    });
  }
  
  return new Response(null, { status: 200 });
};
