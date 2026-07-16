import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Button, Icon } from "@shopify/polaris";
import { ClockIcon, CheckCircleIcon, StarFilledIcon, MagicIcon, DuplicateIcon, HeartIcon, ArrowUpIcon, CalendarIcon } from "@shopify/polaris-icons";
import { useToast } from "../components/common/ToastProvider";
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [pendingCount, publishedToday, reviews, replies, thisWeekReviews, lastWeekReviews] = await Promise.all([
    db.review.count({ where: { shop, status: "pending" } }),
    db.reply.count({ 
      where: { 
        shop, 
        publishedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } 
      } 
    }),
    db.review.findMany({ where: { shop }, select: { rating: true } }),
    db.reply.count({ where: { shop } }),
    db.review.count({
      where: { shop, createdAt: { gte: sevenDaysAgo } }
    }),
    db.review.count({
      where: { shop, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }
    })
  ]);

  const averageRating = reviews.length 
    ? (reviews.reduce((acc: any, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  let weeklyGrowth = 0;
  if (lastWeekReviews === 0) {
    weeklyGrowth = thisWeekReviews > 0 ? 100 : 0;
  } else {
    weeklyGrowth = Math.round(((thisWeekReviews - lastWeekReviews) / lastWeekReviews) * 100);
  }
  const weeklyGrowthDisplay = weeklyGrowth >= 0 ? `+${weeklyGrowth}%` : `${weeklyGrowth}%`;

  return json({
    shopName: shop,
    pendingCount,
    publishedToday,
    averageRating,
    totalGenerated: replies,
    weeklyGrowthDisplay
  });
};

function StatCard({ title, value, icon, tint, delay = "" }: { title: string, value: string | number, icon: any, tint: string, delay?: string }) {
  const colorMap: Record<string, string> = {
    warning: "var(--color-warning)",
    success: "var(--color-success)",
    primary: "var(--color-primary)",
    info: "var(--color-info)",
    "text-secondary": "var(--color-text-secondary)"
  };
  const iconColor = colorMap[tint] || colorMap["primary"];

  return (
    <div className={`replix-card animate-fade-up ${delay}`} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            backgroundColor: iconColor,
            opacity: 0.1,
            position: "absolute"
          }} />
          <div style={{
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor,
            position: "relative"
          }}>
            <Icon source={icon} tone="inherit" />
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--color-text)", lineHeight: "1.2", letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: "15px", color: "var(--color-text-secondary)", fontWeight: 500, marginTop: "4px" }}>{title}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const fetcher = useFetcher<any>();

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") {
      showToast("Plan bought successfully");
      setSearchParams(new URLSearchParams(), { replace: true });
    }
  }, [searchParams, showToast, setSearchParams]);

  useEffect(() => {
    if (fetcher.data?.success) {
      showToast(fetcher.data.isDemo 
        ? `Demo Mode: Added ${fetcher.data.synced} dummy reviews!` 
        : `Successfully synced ${fetcher.data.synced} reviews!`);
    } else if (fetcher.data?.error) {
      showToast(fetcher.data.error, true);
    }
  }, [fetcher.data, showToast]);

  const handleSync = () => {
    fetcher.submit({ intent: "sync" }, { method: "post", action: "/api/reviews/sync" });
  };

  const isSyncing = fetcher.state !== "idle" && fetcher.formAction === "/api/reviews/sync";

  // Real Data Calculations
  const totalMinutesSaved = data.totalGenerated * 3;
  const hoursSavedDisplay = totalMinutesSaved < 60 
    ? `${totalMinutesSaved}m` 
    : `${Math.round(totalMinutesSaved / 60)}h`;

  const customerSatisfaction = parseFloat(data.averageRating) > 0 
    ? `${Math.round((parseFloat(data.averageRating) / 5) * 100)}%` 
    : "0%";

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", paddingBottom: "80px" }}>
      {/* Banner */}
      <div className="dashboard-banner animate-fade-up" style={{ marginBottom: "40px" }}>
        <div className="dashboard-banner-content">
          <h1 style={{ fontSize: "42px", fontWeight: 700, marginBottom: "12px", letterSpacing: "-1px", lineHeight: 1.2 }}>
            Good morning, Yash!
          </h1>
          <p style={{ fontSize: "16px", opacity: 0.9, marginBottom: "28px", maxWidth: "480px", lineHeight: 1.6 }}>
            Replix AI is working hard to help you manage customer reviews smarter and faster.
          </p>
          
          <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
            <div className="banner-badge">
              <span style={{ color: "#10B981" }}>✓</span> AI Enabled
            </div>
            <div className="banner-badge">
              <span style={{ color: "#10B981" }}>✓</span> Shopify Connected
            </div>
            <div className="banner-badge">
              <span style={{ color: "#6366f1" }}>✓</span> Real-time Sync
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <button className="banner-btn banner-btn-primary" onClick={() => navigate("/app/reviews")}>
              Generate AI Replies
            </button>
            <button 
              className="banner-btn banner-btn-white" 
              onClick={handleSync}
              disabled={isSyncing}
              style={{ opacity: isSyncing ? 0.7 : 1 }}
            >
              {isSyncing ? "Syncing..." : "Sync Reviews"}
            </button>
            <button className="banner-btn banner-btn-white" onClick={() => navigate("/app/templates")}>
              Manage Templates
            </button>
          </div>
        </div>
        
        <div className="dashboard-banner-image">
          {/* We will use the generated robot illustration here */}
          <img 
            src="/images/hero-robot.png" 
            alt="AI Robot Assistant" 
            style={{ width: "100%", maxWidth: "340px", height: "auto", dropShadow: "0 20px 40px rgba(0,0,0,0.5)" }} 
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <h2 className="animate-fade-up delay-100" style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.5px" }}>Overview</h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "24px",
        marginBottom: "48px"
      }}>
        <StatCard title="Pending Reviews" value={data.pendingCount} icon={ClockIcon} tint="warning" delay="delay-100" />
        <StatCard title="Published Today" value={data.publishedToday} icon={CheckCircleIcon} tint="success" delay="delay-200" />
        <StatCard title="Average Rating" value={data.averageRating} icon={StarFilledIcon} tint="warning" delay="delay-300" />
        <StatCard title="AI Generated Replies" value={data.totalGenerated} icon={MagicIcon} tint="primary" delay="delay-300" />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <h2 className="animate-fade-up delay-200" style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.5px" }}>Performance Insights</h2>
      </div>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "24px"
      }}>
        <StatCard title="Time Saved" value={hoursSavedDisplay} icon={DuplicateIcon} tint="info" delay="delay-200" />
        <StatCard title="Customer Satisfaction" value={customerSatisfaction} icon={HeartIcon} tint="success" delay="delay-300" />
        <StatCard title="Weekly Growth" value={data.weeklyGrowthDisplay} icon={ArrowUpIcon} tint="primary" delay="delay-300" />
        <StatCard title="Total Reviews" value={data.pendingCount + data.totalGenerated} icon={CalendarIcon} tint="text-secondary" delay="delay-300" />
      </div>
    </div>
  );
}
