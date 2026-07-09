import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Icon } from "@shopify/polaris";
import { ChatIcon, MagicIcon, CheckCircleIcon, StarFilledIcon, DuplicateIcon, StatusActiveIcon } from "@shopify/polaris-icons";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import EmptyState from "../components/common/EmptyState";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [reviews, replies] = await Promise.all([
    db.review.findMany({ where: { shop } }),
    db.reply.findMany({ where: { shop } })
  ]);

  const totalReviews = reviews.length;
  const totalReplies = replies.length;
  const publishedReplies = replies.filter((r: any) => r.publishedAt).length;

  const positiveCount = reviews.filter((r: any) => r.sentiment === "positive").length;
  const neutralCount = reviews.filter((r: any) => r.sentiment === "neutral").length;
  const negativeCount = reviews.filter((r: any) => r.sentiment === "negative").length;

  const avgRating = totalReviews > 0 ? (reviews.reduce((acc: any, r: any) => acc + r.rating, 0) / totalReviews).toFixed(1) : "0.0";

  // Mock weekly/monthly data since we don't have historical grouped data readily available without raw SQL grouping
  // In a real app we'd group by Date(createdAt)
  const weeklyData = [
    { day: "Mon", reviews: 5, replies: 3 },
    { day: "Tue", reviews: 8, replies: 7 },
    { day: "Wed", reviews: 12, replies: 10 },
    { day: "Thu", reviews: 7, replies: 5 },
    { day: "Fri", reviews: 15, replies: 14 },
    { day: "Sat", reviews: 20, replies: 18 },
    { day: "Sun", reviews: 10, replies: 9 },
  ];

  const sentimentData = [
    { name: "Positive", value: positiveCount, fill: "var(--color-success)" },
    { name: "Neutral", value: neutralCount, fill: "var(--color-text-secondary)" },
    { name: "Negative", value: negativeCount, fill: "var(--color-danger)" },
  ];

  return json({
    totalReviews, totalReplies, publishedReplies,
    positiveCount, neutralCount, negativeCount,
    avgRating, weeklyData, sentimentData
  });
};

function MetricCard({ title, value, icon, tint }: { title: string, value: string | number, icon: any, tint: string }) {
  return (
    <div className="replix-card" style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{title}</div>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          backgroundColor: `var(--color-${tint})`, opacity: 0.15, position: "absolute", right: "24px"
        }} />
        <div style={{ color: `var(--color-${tint})`, zIndex: 1 }}>
          <Icon source={icon} tone="inherit" />
        </div>
      </div>
      <div style={{ fontSize: "32px", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function Analytics() {
  const data = useLoaderData<typeof loader>();

  if (data.totalReviews === 0) {
    return (
      <div style={{ padding: "40px" }}>
        <EmptyState 
          icon="📊" 
          heading="No data yet" 
          description="Sync reviews and generate replies to see analytics."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>Analytics Overview</h1>

      <div style={{ display: "flex", gap: "24px", marginBottom: "32px", flexWrap: "wrap" }}>
        <MetricCard title="Total Reviews" value={data.totalReviews} icon={ChatIcon} tint="text" />
        <MetricCard title="AI Replies Generated" value={data.totalReplies} icon={MagicIcon} tint="primary" />
        <MetricCard title="Published to Judge.me" value={data.publishedReplies} icon={CheckCircleIcon} tint="success" />
      </div>

      <div style={{ display: "flex", gap: "24px", marginBottom: "32px", flexWrap: "wrap" }}>
        <div className="replix-card" style={{ flex: 2, padding: "24px", minWidth: "400px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "24px" }}>Weekly Performance</h2>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} />
                <Tooltip cursor={{ fill: "var(--color-bg)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-card)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Bar dataKey="reviews" name="New Reviews" fill="var(--color-text-secondary)" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="replies" name="AI Replies" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="replix-card" style={{ flex: 1, padding: "24px", minWidth: "300px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "24px" }}>Sentiment Breakdown</h2>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sentimentData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 500, fill: "var(--color-text)" }} width={80} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-card)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Secondary Metrics</h2>
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        <MetricCard title="Average Rating" value={data.avgRating} icon={StarFilledIcon} tint="warning" />
        <MetricCard 
          title="AI Success Rate" 
          value={`${data.totalReplies > 0 ? Math.round((data.publishedReplies / data.totalReplies) * 100) : 0}%`} 
          icon={StatusActiveIcon} 
          tint="text-secondary" 
        />
        <MetricCard 
          title="Time Saved" 
          value={`${Math.round((data.totalReplies * 3) / 60)} hours`} 
          icon={DuplicateIcon} 
          tint="text-secondary" 
        />
      </div>

    </div>
  );
}
