export async function generateReply({
  review,
  customerName,
  productName,
  rating,
  tone,
  length,
  brandVoice,
  signature,
  templatePrompt,
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
  templatePrompt?: string;
  apiKey: string;
}): Promise<string> {
  const lengthGuide =
    length === "short" ? "2-3 sentences" :
    length === "medium" ? "4-6 sentences" :
    "7-10 sentences";

  let systemPrompt = `You are an expert Shopify customer support assistant.
Generate a professional reply.
Maximum 80 words.
Friendly.
Brand aware.
No hallucinations.
Return only the reply.
${brandVoice ? `\nBrand voice instructions: ${brandVoice}` : ""}
${signature ? `\nAlways end with this signature: ${signature}` : ""}`;

  if (templatePrompt) {
    systemPrompt += `\n\nCRITICAL TEMPLATE INSTRUCTIONS:\n${templatePrompt}`;
  } else {
    systemPrompt += `\nReply tone: ${tone}.
Reply length: ${lengthGuide}.`;
  }

  const userPrompt = `Customer: ${customerName}
Product: ${productName}
Rating: ${rating}/5 stars
Review: ${review}`;

  return callHuggingFaceWithRetry(systemPrompt, userPrompt, apiKey);
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
  const systemPrompt = `You are an expert Shopify customer support assistant.`;
  const userPrompt = `Improve the grammar, clarity, and professionalism of this customer review reply. Return only the improved reply text:\n\n${existingReply}`;
  return callHuggingFaceWithRetry(systemPrompt, userPrompt, apiKey);
}

async function callHuggingFaceWithRetry(systemPrompt: string, userPrompt: string, apiKey: string, retries = 3): Promise<string> {
  const models = [
    "mistralai/Mistral-7B-Instruct-v0.2",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "HuggingFaceH4/zephyr-7b-beta"
  ];

  let lastError: any = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const model of models) {
      const url = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;
      try {
        console.log(`[HF_API_REQUEST] Attempting model: ${model} URL: ${url}`);
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.7,
            stream: false
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[HF_API_ERROR] Status: ${response.status} Body: ${errorText}`);
          
          if (response.status === 401) {
            throw new Error(`Unauthorized (401): Please check if your Hugging Face API Token is valid.`);
          } else if (response.status === 403) {
            throw new Error(`Forbidden (403): Your token does not have access to this model (${model}).`);
          } else if (response.status === 404) {
            throw new Error(`Not Found (404): The model ${model} could not be found or is not loaded.`);
          }
          
          throw new Error(`HF API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        
        if (!text) {
          throw new Error("No text in Hugging Face response");
        }
        
        console.log(`[HF_API_SUCCESS] Model ${model} generated reply successfully.`);
        return text.trim();
      } catch (err: any) {
        lastError = err;
        const cause = err.cause ? err.cause.message || err.cause : "unknown network error";
        const realErrorMessage = err.message === "fetch failed" ? `fetch failed: ${cause}` : err.message;
        
        console.error(`[HF_API_EXCEPTION] Model ${model} Failed:`, realErrorMessage);
        
        // Handle SSL/TLS errors specifically
        if (realErrorMessage.includes("EPROTO") || realErrorMessage.includes("SSL") || realErrorMessage.includes("handshake")) {
            console.error("[HF_API_TLS_ERROR] A TLS/SSL Handshake failure occurred. Ensure no proxy/firewall is intercepting HTTPS traffic.");
            throw new Error(`TLS/SSL Handshake Failure: ${realErrorMessage}`);
        }

        // If it's a 401 or 403, don't retry, just throw immediately
        if (realErrorMessage.includes("401") || realErrorMessage.includes("403")) {
          throw err;
        }
      }
    }
    
    // Wait before next retry attempt (exponential backoff)
    await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
  }

  const finalCause = lastError?.cause ? lastError.cause.message || lastError.cause : "";
  const finalMessage = lastError?.message === "fetch failed" ? `Network error (fetch failed): ${finalCause}` : (lastError?.message || lastError);
  
  throw new Error(`Failed to generate reply after retries. Last error: ${finalMessage}`);
}
