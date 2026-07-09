import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Button, Icon } from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.shopSettings.findUnique({ where: { shop: session.shop } });
  return json({ plan: settings?.plan || "free" });
};

function PlanCard({ title, price, features, isCurrent, onUpgrade }: { title: string, price: string, features: string[], isCurrent: boolean, onUpgrade?: () => void }) {
  return (
    <div className="replix-card" style={{ 
      padding: "40px 30px", 
      flex: 1, 
      display: "flex", 
      flexDirection: "column",
      border: isCurrent ? "2px solid var(--color-primary)" : "2px solid transparent",
      position: "relative"
    }}>
      {isCurrent && (
        <div style={{
          position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: "var(--color-primary)", color: "white", padding: "4px 12px",
          borderRadius: "999px", fontSize: "12px", fontWeight: 600
        }}>
          Current Plan
        </div>
      )}
      <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>{title}</h2>
      <div style={{ fontSize: "36px", fontWeight: 800, marginBottom: "8px" }}>
        {price} <span style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-text-secondary)" }}>/month</span>
      </div>
      <div style={{ flex: 1, marginTop: "24px", marginBottom: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {features.map((feature, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "var(--color-success)", marginTop: "2px" }}><Icon source={CheckIcon} /></div>
            <span style={{ fontSize: "15px", color: "var(--color-text)" }}>{feature}</span>
          </div>
        ))}
      </div>
      <Button 
        variant={isCurrent ? "tertiary" : "primary"} 
        size="large" 
        fullWidth 
        disabled={isCurrent}
        onClick={onUpgrade}
      >
        {isCurrent ? "Current Plan" : "Upgrade Plan"}
      </Button>
    </div>
  );
}

export default function Billing() {
  const { plan } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "60px 20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "16px" }}>Simple, transparent pricing</h1>
        <p style={{ fontSize: "18px", color: "var(--color-text-secondary)" }}>Choose the plan that fits your review volume.</p>
      </div>

      <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", justifyContent: "center" }}>
        <PlanCard
          title="Free Plan"
          price="$0"
          isCurrent={plan === "free"}
          features={[
            "50 AI replies / month",
            "Basic analytics",
            "1 store connection",
            "No Judge.me auto-publishing",
            "Standard support"
          ]}
        />
        <PlanCard
          title="Pro Plan"
          price="$49"
          isCurrent={plan === "pro"}
          features={[
            "Unlimited AI replies",
            "Advanced analytics & insights",
            "Direct Judge.me publishing",
            "Priority email support",
            "Brand voice customization",
            "Multiple team members"
          ]}
          onUpgrade={() => {
            // Shopify App Bridge billing upgrade flow goes here
            alert("Billing API integration required.");
          }}
        />
      </div>
    </div>
  );
}
