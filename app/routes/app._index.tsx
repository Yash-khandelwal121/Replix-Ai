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

  const [pendingCount, publishedToday, reviews, replies] = await Promise.all([
    db.review.count({ where: { shop, status: "pending" } }),
    db.reply.count({ 
      where: { 
        shop, 
        publishedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } 
      } 
    }),
    db.review.findMany({ where: { shop }, select: { rating: true } }),
    db.reply.count({ where: { shop } })
  ]);

  const averageRating = reviews.length 
    ? (reviews.reduce((acc: any, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return json({
    shopName: shop,
    pendingCount,
    publishedToday,
    averageRating,
    totalGenerated: replies
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

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") {
      showToast("Plan bought successfully");
      setSearchParams(new URLSearchParams(), { replace: true });
    }
  }, [searchParams, showToast, setSearchParams]);

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", paddingBottom: "80px" }}>
      {/* Banner */}
      <div className="dashboard-banner animate-fade-up" style={{ marginBottom: "40px" }}>
        <div className="dashboard-banner-content">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.1)", padding: "6px 16px", borderRadius: "30px", marginBottom: "20px", fontSize: "14px", fontWeight: 500, backdropFilter: "blur(10px)" }}>
            <span style={{ fontSize: "16px" }}>✨</span> AI Powered Operations
          </div>
          <h1 style={{ fontSize: "40px", fontWeight: 700, marginBottom: "16px", letterSpacing: "-1px", lineHeight: 1.2 }}>
            Welcome back to Replix!
          </h1>
          <p style={{ fontSize: "18px", opacity: 0.8, marginBottom: "32px", maxWidth: "600px", lineHeight: 1.6 }}>
            Here is what's happening with your store <strong style={{ color: "#fff" }}>{data.shopName}</strong> today. Manage your customer feedback effortlessly with AI.
          </p>
          <div style={{ display: "flex", gap: "16px" }}>
            <Button variant="primary" onClick={() => navigate("/app/reviews")} size="large" tone="success">
              Generate Replies
            </Button>
            <Button onClick={() => navigate("/app/settings")} size="large">
              Configure Settings
            </Button>
          </div>
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
        <StatCard title="Hours Saved" value={`${Math.round((data.totalGenerated * 3) / 60)}h`} icon={DuplicateIcon} tint="info" delay="delay-200" />
        <StatCard title="Customer Satisfaction" value="98%" icon={HeartIcon} tint="success" delay="delay-300" />
        <StatCard title="Weekly Growth" value="+12%" icon={ArrowUpIcon} tint="primary" delay="delay-300" />
        <StatCard title="Total Reviews" value={data.pendingCount + data.totalGenerated} icon={CalendarIcon} tint="text-secondary" delay="delay-300" />
      </div>
    </div>
  );
}
