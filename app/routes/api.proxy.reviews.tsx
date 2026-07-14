import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 1. Authenticate the App Proxy request to ensure it came from Shopify
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return json({ error: "Unauthorized access" }, { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  const take = parseInt(url.searchParams.get("take") || "10", 10);
  const sort = url.searchParams.get("sort") || "newest";

  if (!productId) {
    return json({ error: "productId is required" }, { status: 400 });
  }

  // Extract the numeric ID if Shopify passed "gid://shopify/Product/12345"
  const numericProductId = productId.split("/").pop();

  let orderBy: any = { createdAt: "desc" };
  if (sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sort === "highest") {
    orderBy = { rating: "desc" };
  } else if (sort === "lowest") {
    orderBy = { rating: "asc" };
  }

  const where = {
    shop: session.shop,
    productId: numericProductId || productId,
    status: "published",
  };

  // 3. Query the database for published reviews for this product
  try {
    const [reviews, totalCount, aggregate] = await Promise.all([
      db.review.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          reply: true,
        },
      }),
      db.review.count({ where }),
      db.review.aggregate({
        where,
        _avg: { rating: true }
      })
    ]);

    const hasMore = skip + reviews.length < totalCount;
    const averageRating = aggregate._avg.rating ? aggregate._avg.rating.toFixed(1) : "5.0";

    return json(
      { reviews, totalCount, hasMore, averageRating },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      }
    );
  } catch (error) {
    console.error("Error fetching reviews for app proxy:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};
