import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Button, Icon, Text, BlockStack, InlineStack, Divider, Badge } from "@shopify/polaris";
import { ArrowLeftIcon, MagicIcon, EditIcon, CheckCircleIcon, DuplicateIcon } from "@shopify/polaris-icons";
import { StarRating } from "../components/reviews/StarRating";
import { SentimentBadge } from "../components/reviews/SentimentBadge";
import { formatTimeAgo } from "../lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "../components/common/ToastProvider";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;

  if (!id) throw new Error("Review ID required");

  const [review, settings] = await Promise.all([
    db.review.findUnique({
      where: { id, shop },
      include: { reply: true }
    }),
    db.shopSettings.findUnique({ where: { shop } })
  ]);

  if (!review) throw new Response("Not Found", { status: 404 });

  return json({ review, settings });
};

export default function AIReplyEditor() {
  const { review, settings } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fetcher = useFetcher<any>();
  
  const defaultTone = settings?.defaultTone || "professional";
  const [tone, setTone] = useState(review.reply?.tone || defaultTone);
  const [length, setLength] = useState(review.reply?.length || "medium");
  const [replyBody, setReplyBody] = useState(review.reply?.body || "");

  const isGenerating = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "generate";
  const isPublishing = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "publish";

  useEffect(() => {
    if (fetcher.data?.reply) {
      setReplyBody(fetcher.data.reply);
      showToast("Reply generated successfully");
    }
    if (fetcher.data?.success) {
      showToast("Reply published to Judge.me!");
      navigate("/app/reviews");
    }
    if (fetcher.data?.error) {
      showToast(fetcher.data.error, true);
    }
  }, [fetcher.data, showToast, navigate]);

  const handleGenerate = () => {
    fetcher.submit(
      { reviewId: review.id, tone, length, intent: "generate" },
      { method: "post", action: "/api/reply/generate" }
    );
  };

  const handlePublish = () => {
    fetcher.submit(
      { reviewId: review.id, intent: "publish" },
      { method: "post", action: "/api/reply/publish" }
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(replyBody);
    showToast("Copied to clipboard");
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Button variant="tertiary" icon={ArrowLeftIcon} onClick={() => navigate("/app/reviews")}>
          Back to Reviews
        </Button>
      </div>

      <div style={{ display: "flex", gap: "24px", flexDirection: "row", flexWrap: "wrap" }}>
        
        {/* Left Panel: Review Details */}
        <div className="replix-card" style={{ flex: "1 1 400px", padding: "30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              backgroundColor: "var(--color-border)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 600,
              backgroundImage: review.customerAvatar ? `url(${review.customerAvatar})` : "none",
              backgroundSize: "cover"
            }}>
              {!review.customerAvatar && review.customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                {review.customerName} 
                <Icon source={CheckCircleIcon} tone="success" />
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                {formatTimeAgo(review.createdAt.toString())}
              </div>
            </div>
          </div>

          {review.productName && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", backgroundColor: "var(--color-bg)", borderRadius: "12px", marginBottom: "24px" }}>
              {review.productImage && (
                <img src={review.productImage} alt={review.productName} style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />
              )}
              <span style={{ fontSize: "14px", fontWeight: 500 }}>{review.productName}</span>
            </div>
          )}

          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <StarRating rating={review.rating} />
            <SentimentBadge sentiment={review.sentiment} />
          </div>

          <div style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--color-text)", paddingBottom: "24px" }}>
            {review.body}
          </div>
        </div>

        {/* Right Panel: AI Reply Editor */}
        <div className="replix-card" style={{ flex: "1 1 600px", padding: "30px", display: "flex", flexDirection: "column" }}>
          
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Tone</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["professional", "friendly", "luxury", "formal", "casual", "funny"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: `1px solid ${tone === t ? "var(--color-primary)" : "var(--color-border)"}`,
                    backgroundColor: tone === t ? "rgba(94, 92, 230, 0.1)" : "transparent",
                    color: tone === t ? "var(--color-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontSize: "13px",
                    fontWeight: tone === t ? 600 : 400,
                    transition: "all 0.2s ease"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Length</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {["short", "medium", "long"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLength(l)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${length === l ? "var(--color-text)" : "var(--color-border)"}`,
                    backgroundColor: length === l ? "var(--color-text)" : "transparent",
                    color: length === l ? "white" : "var(--color-text-secondary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontSize: "13px",
                    fontWeight: 500,
                    transition: "all 0.2s ease"
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, position: "relative", marginBottom: "24px" }}>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Click Generate to write an AI reply..."
              style={{
                width: "100%",
                minHeight: "200px",
                height: "100%",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                resize: "vertical",
                fontSize: "15px",
                lineHeight: "1.6",
                fontFamily: "inherit",
                backgroundColor: isGenerating ? "var(--color-bg)" : "white",
                opacity: isGenerating ? 0.6 : 1,
                outline: "none"
              }}
              disabled={isGenerating}
            />
            {isGenerating && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon source={MagicIcon} tone="inherit" />
                <span style={{ fontWeight: 600 }}>Generating...</span>
              </div>
            )}
            <div style={{ position: "absolute", bottom: "12px", right: "16px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
              {replyBody.length} / 1000
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <Button onClick={handleGenerate} variant="primary" loading={isGenerating}>
                {replyBody ? "Regenerate" : "Generate Reply"}
              </Button>
              <Button onClick={() => {}} disabled={!replyBody || isGenerating} icon={EditIcon}>
                Improve Writing
              </Button>
            </div>
            
            <div style={{ display: "flex", gap: "12px" }}>
              <Button onClick={handleCopy} disabled={!replyBody} icon={DuplicateIcon}>
                Copy
              </Button>
              <Button 
                onClick={handlePublish} 
                tone="success" 
                variant="primary" 
                disabled={!replyBody || review.status === "published" || isPublishing}
                loading={isPublishing}
              >
                {review.status === "published" ? "Published" : "Approve & Publish"}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
