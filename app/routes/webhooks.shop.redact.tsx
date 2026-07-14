import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  
  // Shop redact logic
  await db.shopSettings.delete({ where: { shop } }).catch(() => {});
  // Delete other shop data here if necessary according to business logic.
  
  return new Response(null, { status: 200 });
};
