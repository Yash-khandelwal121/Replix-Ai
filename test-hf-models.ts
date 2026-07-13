import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.SHOPIFY_API_SECRET || "default_dev_secret_key_that_is_long_enough";
const ALGORITHM = "aes-256-gcm";

const getValidKey = () => {
  if (ENCRYPTION_KEY.length === 32) return Buffer.from(ENCRYPTION_KEY, 'utf-8');
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);
};

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, getValidKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

async function checkModel(model, token) {
  const url = "https://router.huggingface.co/v1/chat/completions";
  const requestBody = {
    model: model,
    messages: [
      { role: "user", content: "Hi" }
    ],
    max_tokens: 10
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  console.log(model, response.status, await response.text());
}

async function run() {
  const shop = "foot-store-yash.myshopify.com";
  const settings = await prisma.shopSettings.findUnique({ where: { shop } });
  const token = decrypt(settings.huggingFaceApiToken);

  console.log("Token starts with:", token.substring(0, 5));

  await checkModel("mistralai/Mistral-7B-Instruct-v0.2", token);
  await checkModel("mistralai/Mixtral-8x7B-Instruct-v0.1", token);
  await checkModel("HuggingFaceH4/zephyr-7b-beta", token);
  await checkModel("Qwen/Qwen2.5-72B-Instruct", token);
  await checkModel("mistralai/Mistral-Nemo-Instruct-2407", token);
  await checkModel("google/gemma-2-9b-it", token);
  await checkModel("mistralai/Mistral-7B-Instruct-v0.3", token);
  await checkModel("meta-llama/Llama-3.2-3B-Instruct", token);
}

run().catch(console.error).finally(() => prisma.$disconnect());
