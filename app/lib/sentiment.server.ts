// Lightweight rule-based sentiment — no extra package needed

const positiveWords = ["love", "great", "amazing", "excellent", "perfect", "best", "fantastic", "wonderful", "happy", "awesome"];
const negativeWords = ["bad", "terrible", "awful", "horrible", "worst", "hate", "disappointed", "broken", "poor", "useless"];

export function detectSentiment(text: string, rating: number): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";
  const lower = text.toLowerCase();
  const posScore = positiveWords.filter((w) => lower.includes(w)).length;
  const negScore = negativeWords.filter((w) => lower.includes(w)).length;
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}
