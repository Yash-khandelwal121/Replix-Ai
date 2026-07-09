// app/lib/judgeMe.server.ts
// Judge.me Public API base: https://judge.me/api/v1

const JUDGE_ME_BASE = "https://judge.me/api/v1";

export async function fetchReviews(
  shopDomain: string,
  apiToken: string,
  page = 1,
  perPage = 50
) {
  const url = `${JUDGE_ME_BASE}/reviews?shop_domain=${shopDomain}&api_token=${apiToken}&page=${page}&per_page=${perPage}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Judge.me fetch failed: ${res.status}`);
  return res.json(); // { reviews: [...], total: N }
}

export async function publishReply(
  reviewId: string,
  replyBody: string,
  apiToken: string
) {
  const url = `${JUDGE_ME_BASE}/reviews/${reviewId}/reply`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_token: apiToken, reply: { body: replyBody } }),
  });
  if (!res.ok) throw new Error(`Judge.me publish failed: ${res.status}`);
  return res.json();
}
