import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.SHOPIFY_API_SECRET || "default_dev_secret_key_that_is_long_enough";
const ALGORITHM = "aes-256-cbc";

function decrypt(text: string): string {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join("!"), "hex"); // ! was used but should be colon. Actually, textParts.join(":")
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}

async function run() {
  const shop = "foot-store-yash.myshopify.com";
  const settings = await prisma.shopSettings.findUnique({ where: { shop } });

  if (!settings) {
    console.log("No settings found for shop");
    return;
  }

  const tokenInDb = settings.huggingFaceApiToken || "";
  console.log("--- Token Analysis ---");
  console.log("HF Token Exists: " + (tokenInDb ? "true" : "false"));
  console.log("HF Token Prefix: " + tokenInDb.substring(0, 8));
  console.log("HF Token Length: " + tokenInDb.length);

  console.log("\n--- Executing Fetch with Encrypted Token (as in api.reply.generate.tsx) ---");
  const model = "mistralai/Mistral-7B-Instruct-v0.2";
  const url = "https://router.huggingface.co/v1/chat/completions";
  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: "You are an expert Shopify customer support assistant." },
      { role: "user", content: "Customer: Test\nProduct: Test\nRating: 5/5 stars\nReview: Test" }
    ],
    max_tokens: 500,
    temperature: 0.7,
    stream: false
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + tokenInDb,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  console.log("\n--- HTTP Response ---");
  console.log("Status Code: " + response.status + " " + response.statusText);
  console.log("Headers:");
  response.headers.forEach((value, name) => {
    console.log("  " + name + ": " + value);
  });
  const bodyText = await response.text();
  console.log("Body:\n" + bodyText);
}

run().catch(console.error).finally(() => prisma.$disconnect());
