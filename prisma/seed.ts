import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Wait, we need a shop domain to associate the templates with.
  // The app uses the shop domain from the session. Let's find the first shop in the Session table, or fallback.
  const session = await prisma.session.findFirst();
  if (!session) {
    console.log("No shop session found. Make sure you install the app first.");
    return;
  }
  const shop = session.shop;

  const templates = [
    {
      name: "Thank You (Positive)",
      description: "Perfect for 4-5 star reviews. Express gratitude and encourage repeat purchases.",
      category: "Positive",
      icon: "SmileyIcon",
      tags: "Positive, Gratitude, Repeat Buyer",
      prompt: "Write an enthusiastic thank you message for a positive review. Express gratitude and subtly encourage them to shop with us again.",
      usageCount: 134,
      isFavorite: true,
      isDefault: true,
    },
    {
      name: "Quality Appreciated",
      description: "Highlight product quality and build trust with customers.",
      category: "Positive",
      icon: "SmileyIcon",
      tags: "Quality, Trust, Brand Value",
      prompt: "Thank the customer for noticing the high quality of the product. Reinforce our brand's commitment to quality materials and craftsmanship.",
      usageCount: 98,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Shipping Update",
      description: "Apologize for delay and provide assurance with warm tone.",
      category: "Shipping",
      icon: "BoxIcon",
      tags: "Shipping, Apology, Support",
      prompt: "Apologize profusely for the shipping delay. Be empathetic and assure them that we are actively working with the courier to resolve the issue.",
      usageCount: 67,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Negative Experience",
      description: "Handle complaints with empathy and offer resolution.",
      category: "Negative",
      icon: "SadIcon",
      tags: "Support, Empathy, Resolution",
      prompt: "Validate their frustration and apologize for the negative experience. Ask them to reach out to our support email to make things right.",
      usageCount: 45,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Repeat Customer Love",
      description: "For returning customers who leave another great review.",
      category: "Positive",
      icon: "SmileyIcon",
      tags: "Loyalty, Gratitude, VIP",
      prompt: "Acknowledge that they are a returning customer. Show deep appreciation for their continued loyalty and trust in our brand.",
      usageCount: 76,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Authentic Flavor Praise",
      description: "Perfect for taste, quality, and traditional flavor appreciation.",
      category: "Product",
      icon: "TagIcon",
      tags: "Taste, Authentic, Homemade",
      prompt: "Thank the customer for loving the taste. Mention our traditional recipes and authentic ingredients.",
      usageCount: 112,
      isFavorite: true,
      isDefault: true,
    },
    {
      name: "Ingredient Appreciation",
      description: "When customer talks about ingredients and health benefits.",
      category: "Product",
      icon: "TagIcon",
      tags: "Health, Natural, Ingredients",
      prompt: "Emphasize our commitment to natural, healthy ingredients and thank them for noticing the benefits.",
      usageCount: 53,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Neutral Experience",
      description: "Balanced reply for neutral reviews.",
      category: "Neutral",
      icon: "NoteIcon",
      tags: "Neutral, Feedback, Improvement",
      prompt: "Thank them for their honest feedback. Ask them how we can improve to make their next experience a 5-star one.",
      usageCount: 28,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Product Recommendation",
      description: "Encourage customers to try other products.",
      category: "Product",
      icon: "TagIcon",
      tags: "Cross Sell, Suggestion, Explore",
      prompt: "Thank them for their review and casually recommend exploring our other similar products that pair well.",
      usageCount: 39,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Festive / Special Occasion",
      description: "Festival and special occasion friendly reply.",
      category: "Positive",
      icon: "SmileyIcon",
      tags: "Festival, Warm, Seasonal",
      prompt: "Wish them happy holidays or a great festive season along with the thank you message.",
      usageCount: 31,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Short & Sweet",
      description: "Short replies for quick acknowledgment.",
      category: "Neutral",
      icon: "NoteIcon",
      tags: "Short, Simple, Quick",
      prompt: "Keep it extremely short, 1 or 2 sentences max. Just say thanks and have a great day.",
      usageCount: 84,
      isFavorite: false,
      isDefault: true,
    },
    {
      name: "Custom Brand Voice",
      description: "Use your custom brand voice for unique tone.",
      category: "General",
      icon: "NoteIcon",
      tags: "Custom, Brand Voice, Unique",
      prompt: "Reply using our specific brand voice and guidelines.",
      usageCount: 22,
      isFavorite: false,
      isDefault: true,
    }
  ];

  for (const t of templates) {
    await prisma.template.create({
      data: {
        shop,
        ...t
      }
    });
  }

  console.log("Templates seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
