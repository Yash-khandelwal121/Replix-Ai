import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useNavigate, useFetcher, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Button, Tooltip, Icon, TextField, Select, Modal, FormLayout, BlockStack, Text } from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { StarRating } from "../components/reviews/StarRating";
import { SentimentBadge } from "../components/reviews/SentimentBadge";
import { StatusBadge } from "../components/reviews/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import { LoadingSkeletonTable } from "../components/common/LoadingSkeleton";
import { formatTimeAgo, truncate } from "../lib/utils";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../components/common/ToastProvider";
import { detectSentiment } from "../lib/sentiment.server";

function getProviderBadge(provider: string) {
  switch (provider?.toLowerCase()) {
    case "manual": return <span style={{ backgroundColor: "#e4e5e7", color: "#202223", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>Manual</span>;
    case "csv": return <span style={{ backgroundColor: "#c0ebd7", color: "#007f5f", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>CSV</span>;
    case "loox": return <span style={{ backgroundColor: "#ffea8a", color: "#8a6116", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>Loox</span>;
    default: return <span style={{ backgroundColor: "#b3e5fc", color: "#01579b", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>Judge.me</span>;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const take = 20;
  const skip = (page - 1) * take;

  const where = {
    shop: session.shop,
    ...(search ? {
      OR: [
        { customerName: { contains: search, mode: "insensitive" as const } },
        { body: { contains: search, mode: "insensitive" as const } }
      ]
    } : {})
  };

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      include: { reply: true },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.review.count({ where })
  ]);

  return json({ reviews, total, page, search });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync") {
    return json({ error: "Use /api/reviews/sync directly" }, { status: 400 });
  }

  if (intent === "create_manual") {
    const customerName = formData.get("customerName")?.toString();
    const productName = formData.get("productName")?.toString();
    const productId = formData.get("productId")?.toString();
    const rating = parseInt(formData.get("rating")?.toString() || "5", 10);
    const body = formData.get("body")?.toString();

    if (!customerName || !body || !productId) {
      return json({ error: "Customer Name, Product, and Review are required." }, { status: 400 });
    }

    try {
      await db.review.create({
        data: {
          shop: session.shop,
          customerName,
          productId,
          productName: productName || null,
          rating,
          body,
          status: "pending",
          provider: "manual",
          sentiment: detectSentiment(body, rating),
          createdAt: new Date()
        }
      });
      return json({ success: true });
    } catch (err: any) {
      return json({ error: err.message || "Failed to create review." }, { status: 500 });
    }
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

export default function ReviewsList() {
  const { reviews, total, page, search } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const fetcher = useFetcher<any>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [searchValue, setSearchValue] = useState(search);
  const [sortValue, setSortValue] = useState("newest");
  
  // Manual Review Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    customerName: "",
    productName: "",
    productId: "",
    rating: "5",
    body: ""
  });

  const isSyncing = fetcher.state !== "idle" && fetcher.formAction === "/api/reviews/sync";
  const isCreatingManual = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "create_manual";
  const isLoading = navigation.state === "loading";

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.data?.success) {
      if (fetcher.data.synced !== undefined) {
        showToast(`Successfully synced ${fetcher.data.synced} reviews!`);
      } else {
        showToast("Review created successfully!");
        setIsManualModalOpen(false);
        setManualForm({ customerName: "", productName: "", productId: "", rating: "5", body: "" });
      }
      // Reload the page data
      submit({ search, page }, { method: "get" });
    } else if (fetcher.data?.error) {
      showToast(fetcher.data.error, true);
    }
  }, [fetcher.data, showToast, submit, search, page]);

  const toggleModal = useCallback(() => setIsManualModalOpen((open) => !open), []);

  const handleManualSave = () => {
    if (!manualForm.customerName || !manualForm.body || !manualForm.productId) {
      showToast("Customer Name, Product, and Review are required", true);
      return;
    }
    fetcher.submit({ ...manualForm, intent: "create_manual" }, { method: "post" });
  };

  const handleSelectProduct = async () => {
    const selected = await shopify.resourcePicker({ type: 'product', action: 'select', multiple: false });
    if (selected && selected.length > 0) {
      const product = selected[0];
      const numericId = product.id.split('/').pop();
      setManualForm(prev => ({
        ...prev,
        productId: numericId,
        productName: product.title
      }));
    }
  };

  const handleSync = () => {
    const formData = new FormData();
    formData.append("intent", "sync");
    fetcher.submit(formData, { method: "post", action: "/api/reviews/sync" });
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    submit({ search: value, page: "1" }, { method: "get" });
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)" }}>Reviews</h1>
          <span style={{ 
            backgroundColor: "rgba(94, 92, 230, 0.1)", 
            color: "var(--color-primary)",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 600
          }}>
            {total} total
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button onClick={toggleModal}>
            Add Manual
          </Button>
          <Button onClick={() => navigate("/app/reviews-import")}>
            Import CSV
          </Button>
          <Button variant="primary" loading={isSyncing} onClick={handleSync}>
            Sync Reviews
          </Button>
        </div>
      </div>

      <div className="replix-card" style={{ padding: "20px", marginBottom: "20px", display: "flex", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <TextField
            label=""
            placeholder="Search by customer or review..."
            value={searchValue}
            onChange={handleSearch}
            prefix={<Icon source={SearchIcon} />}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => handleSearch("")}
          />
        </div>
        <div style={{ width: "200px" }}>
          <Select
            label=""
            options={[
              { label: "Newest first", value: "newest" },
              { label: "Oldest first", value: "oldest" },
              { label: "Highest rating", value: "highest" },
              { label: "Lowest rating", value: "lowest" },
              { label: "Pending first", value: "pending" },
            ]}
            value={sortValue}
            onChange={(val) => setSortValue(val)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeletonTable />
      ) : reviews.length === 0 ? (
        <EmptyState 
          icon="📋" 
          heading="No reviews yet" 
          description="Sync your Judge.me reviews to get started." 
          actionText="Sync Reviews"
          onAction={handleSync}
        />
      ) : (
        <div className="replix-card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
            <thead style={{ backgroundColor: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
              <tr>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Rating</th>
                <th style={thStyle}>Review</th>
                <th style={thStyle}>Sentiment</th>
                <th style={thStyle}>Provider</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review: any) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </tbody>
          </table>
          
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
              Page {page} of {Math.ceil(total / 20) || 1}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button disabled={page <= 1} onClick={() => submit({ search, page: (page - 1).toString() }, { method: "get" })}>Previous</Button>
              <Button disabled={page >= Math.ceil(total / 20)} onClick={() => submit({ search, page: (page + 1).toString() }, { method: "get" })}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={isManualModalOpen}
        onClose={toggleModal}
        title="Add Manual Review"
        primaryAction={{
          content: 'Save Review',
          onAction: handleManualSave,
          loading: isCreatingManual
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: toggleModal,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <FormLayout.Group>
              <TextField
                label="Customer Name"
                value={manualForm.customerName}
                onChange={(v) => setManualForm(p => ({...p, customerName: v}))}
                autoComplete="off"
                requiredIndicator
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text as="p" variant="bodyMd">Product <span style={{ color: 'red' }}>*</span></Text>
                <div style={{ marginTop: '4px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Button onClick={handleSelectProduct}>Select Product</Button>
                  {manualForm.productName && <Text as="span" variant="bodyMd" fontWeight="semibold">{manualForm.productName}</Text>}
                </div>
              </div>
            </FormLayout.Group>
            
            <Select
              label="Rating"
              options={[
                { label: "5 Stars", value: "5" },
                { label: "4 Stars", value: "4" },
                { label: "3 Stars", value: "3" },
                { label: "2 Stars", value: "2" },
                { label: "1 Star", value: "1" },
              ]}
              value={manualForm.rating}
              onChange={(v) => setManualForm(p => ({...p, rating: v}))}
            />

            <TextField
              label="Review Content"
              value={manualForm.body}
              onChange={(v) => setManualForm(p => ({...p, body: v}))}
              autoComplete="off"
              multiline={4}
              requiredIndicator
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </div>
  );
}

function ReviewRow({ review }: { review: any }) {
  const fetcher = useFetcher<any>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const isGenerating = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "generate";

  useEffect(() => {
    if (fetcher.data?.reply) {
      showToast("Reply generated successfully!");
    } else if (fetcher.data?.error) {
      showToast(fetcher.data.error, true);
    }
  }, [fetcher.data, showToast]);

  const handleGenerate = () => {
    fetcher.submit(
      { reviewId: review.id, intent: "generate" },
      { method: "post", action: "/api/reply/generate" }
    );
  };

  return (
    <tr style={{ borderBottom: "1px solid var(--color-border)", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--color-bg)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
      <td style={tdStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%",
            backgroundColor: "var(--color-border)", display: "flex",
            alignItems: "center", justifyContent: "center", fontWeight: 600,
            backgroundImage: review.customerAvatar ? `url(${review.customerAvatar})` : "none",
            backgroundSize: "cover"
          }}>
            {!review.customerAvatar && review.customerName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 500 }}>{review.customerName}</span>
        </div>
      </td>
      <td style={tdStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {review.productImage && (
            <img src={review.productImage} alt={review.productName || "Product"} style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "cover" }} />
          )}
          <span style={{ fontSize: "13px" }}>{truncate(review.productName || "Unknown Product", 30)}</span>
        </div>
      </td>
      <td style={tdStyle}><StarRating rating={review.rating} /></td>
      <td style={tdStyle}>
        <Tooltip content={review.body}>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", cursor: "help" }}>
            {truncate(review.body, 60)}
          </span>
        </Tooltip>
      </td>
      <td style={tdStyle}><SentimentBadge sentiment={review.sentiment} /></td>
      <td style={tdStyle}>{getProviderBadge(review.provider)}</td>
      <td style={tdStyle}><StatusBadge status={review.status} /></td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        {review.status === "pending" ? (
          <Button onClick={handleGenerate} loading={isGenerating}>
            Generate Reply
          </Button>
        ) : (
          <Button onClick={() => navigate(`/app/reviews/${review.id}`)}>
            View Reply
          </Button>
        )}
      </td>
    </tr>
  );
}

const thStyle = {
  padding: "16px 20px",
  textAlign: "left" as const,
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  color: "var(--color-text-secondary)",
  letterSpacing: "0.5px"
};

const tdStyle = {
  padding: "16px 20px",
  fontSize: "14px"
};
