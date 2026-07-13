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
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
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
  const decryptedToken = decrypt(tokenInDb);
  
  console.log({
      tokenExists: !!decryptedToken,
      tokenPrefix: decryptedToken.substring(0,5),
      tokenLength: decryptedToken.length,
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
