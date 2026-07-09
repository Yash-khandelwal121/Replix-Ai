import Anthropic from "@anthropic-ai/sdk";

export async function generateReply({
  review,
  customerName,
  productName,
  rating,
  tone,
  length,
  brandVoice,
  signature,
  apiKey,
}: {
  review: string;
  customerName: string;
  productName: string;
  rating: number;
  tone: string;
  length: string;
  brandVoice?: string;
  signature?: string;
  apiKey: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey });

  const lengthGuide =
    length === "short" ? "2-3 sentences" :
    length === "medium" ? "4-6 sentences" :
    "7-10 sentences";

  const systemPrompt = `You are a customer service expert writing replies to product reviews on behalf of a Shopify store.
${brandVoice ? `Brand voice instructions: ${brandVoice}` : ""}
Reply tone: ${tone}.
Reply length: ${lengthGuide}.
${signature ? `Always end with this signature: ${signature}` : ""}
Write only the reply text. No preamble, no formatting, no quotation marks.`;

  const userPrompt = `Customer: ${customerName}
Product: ${productName}
Rating: ${rating}/5 stars
Review: ${review}

Write a ${tone} reply to this review.`;

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-latest", // using standard anthropic model name
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text in Claude response");
  return textBlock.text.trim();
}

export async function generateVariations(params: Parameters<typeof generateReply>[0]): Promise<string[]> {
  const results = await Promise.all([
    generateReply({ ...params, tone: "professional" }),
    generateReply({ ...params, tone: "friendly" }),
    generateReply({ ...params, tone: "luxury" }),
  ]);
  return results;
}

export async function improveReply(
  existingReply: string,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-latest", // using standard anthropic model name
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Improve the grammar, clarity, and professionalism of this customer review reply. Return only the improved reply text:\n\n${existingReply}`,
    }],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text in Claude response");
  return textBlock.text.trim();
}
