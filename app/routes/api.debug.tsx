import { json } from "@remix-run/node";
export const loader = () => {
  return json({
    apiKey: process.env.SHOPIFY_API_KEY,
    secret: process.env.SHOPIFY_API_SECRET?.substring(0, 5),
    env: Object.keys(process.env).filter(k => k.startsWith('SHOPIFY'))
  });
};
