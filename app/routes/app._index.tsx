import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Button, Icon } from "@shopify/polaris";
import { ClockIcon, CheckCircleIcon, StarFilledIcon, MagicIcon, DuplicateIcon, HeartIcon, ArrowUpIcon, CalendarIcon } from "@shopify/polaris-icons";

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

function StatCard({ title, value, icon, tint }: { title: string, value: string | number, icon: any, tint: string }) {
  return (
    <div className="replix-card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
      <div style={{
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        backgroundColor: `var(--color-${tint})`,
        opacity: 0.15,
        position: "absolute"
      }} />
      <div style={{
        width: "48px",
        height: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: `var(--color-${tint})`
      }}>
        <Icon source={icon} tone="inherit" />
      </div>
      <div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--color-text)" }}>{value}</div>
        <div style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>{title}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #5E5CE6 0%, #8A2BE2 100%)",
        borderRadius: "var(--radius)",
        padding: "40px",
        color: "white",
        marginBottom: "30px",
        boxShadow: "0 10px 30px rgba(94, 92, 230, 0.2)"
      }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>Good Morning 👋</h1>
        <p style={{ fontSize: "16px", opacity: 0.9, marginBottom: "24px" }}>
          Manage customer reviews with AI for {data.shopName}.
        </p>
        <Button variant="primary" onClick={() => navigate("/app/reviews")} tone="success">
          Generate Replies
        </Button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px",
        marginBottom: "30px"
      }}>
        <StatCard title="Pending Reviews" value={data.pendingCount} icon={ClockIcon} tint="warning" />
        <StatCard title="Published Today" value={data.publishedToday} icon={CheckCircleIcon} tint="success" />
        <StatCard title="Average Rating" value={data.averageRating} icon={StarFilledIcon} tint="warning" />
        <StatCard title="AI Generated Replies" value={data.totalGenerated} icon={MagicIcon} tint="primary" />
      </div>

      <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Secondary Stats</h2>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px"
      }}>
        <StatCard title="Time Saved" value={`${Math.round((data.totalGenerated * 3) / 60)}h`} icon={DuplicateIcon} tint="text-secondary" />
        <StatCard title="Customer Satisfaction" value="98%" icon={HeartIcon} tint="text-secondary" />
        <StatCard title="Weekly Growth" value="+12%" icon={ArrowUpIcon} tint="text-secondary" />
        <StatCard title="Total Reviews" value={data.pendingCount + data.totalGenerated} icon={CalendarIcon} tint="text-secondary" />
      </div>
    </div>
  );
}
