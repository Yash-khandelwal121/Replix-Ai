import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";
import { db } from "../db.server";
import { Button, Icon } from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { useToast } from "../components/common/ToastProvider";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const billingCheck = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: true,
  });

  let settings = await db.shopSettings.findUnique({ where: { shop } });
  let currentPlan = settings?.plan || "free";

  if (billingCheck.hasActivePayment && currentPlan !== "pro") {
    await db.shopSettings.upsert({
      where: { shop },
      create: { shop, plan: "pro" },
      update: { plan: "pro" }
    });
    return redirect("/app?upgrade=success");
  } else if (!billingCheck.hasActivePayment && currentPlan === "pro") {
    await db.shopSettings.upsert({
      where: { shop },
      create: { shop, plan: "free" },
      update: { plan: "free" }
    });
    currentPlan = "free";
  }

  return json({ plan: currentPlan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upgrade") {
    const { session } = await authenticate.admin(request);
    
    // Check if they already have the plan on Shopify's end
    await billing.require({
      plans: [MONTHLY_PLAN],
      isTest: true,
      onFailure: async () => billing.request({
        plan: MONTHLY_PLAN,
        isTest: true,
      }),
    });

    // If we get here, they already have the active subscription on Shopify!
    await db.shopSettings.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, plan: "pro" },
      update: { plan: "pro" }
    });

    return json({ success: true, alreadyActive: true });
  }

  if (intent === "downgrade") {
    const { session } = await authenticate.admin(request);
    
    // Check for active subscriptions to cancel
    const billingCheck = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true,
    });

    const subscription = billingCheck.appSubscriptions[0];
    if (subscription) {
      await billing.cancel({
        subscriptionId: subscription.id,
        isTest: true,
        prorate: true,
      });
    }

    // Downgrade in our database
    await db.shopSettings.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, plan: "free" },
      update: { plan: "free" }
    });

    return json({ success: true, downgraded: true });
  }

  return json({ success: true });
};

function PlanCard({ title, price, features, isCurrent, isLoading, onAction, actionText }: { title: string, price: string, features: string[], isCurrent: boolean, isLoading?: boolean, onAction?: () => void, actionText: string }) {
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
        loading={isLoading}
        onClick={onAction}
      >
        {isCurrent ? "Current Plan" : actionText}
      </Button>
    </div>
  );
}

export default function Billing() {
  const { plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isUpgrading = navigation.state === "submitting" && navigation.formData?.get("intent") === "upgrade";
  const isDowngrading = navigation.state === "submitting" && navigation.formData?.get("intent") === "downgrade";

  const handleUpgrade = () => submit({ intent: "upgrade" }, { method: "post" });
  const handleDowngrade = () => submit({ intent: "downgrade" }, { method: "post" });

  useEffect(() => {
    if (actionData?.alreadyActive) {
      showToast("Plan synced successfully! You are on Pro.");
      navigate("/app?upgrade=success");
    }
    if (actionData?.downgraded) {
      showToast("Downgraded to Free Plan successfully.");
    }
  }, [actionData, showToast, navigate]);

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
          isLoading={isDowngrading}
          actionText="Downgrade to Free"
          onAction={handleDowngrade}
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
          isLoading={isUpgrading}
          actionText="Upgrade Plan"
          onAction={handleUpgrade}
          features={[
            "Unlimited AI replies",
            "Advanced analytics & insights",
            "Direct Judge.me publishing",
            "Priority email support",
            "Brand voice customization",
            "Multiple team members"
          ]}
        />
      </div>
    </div>
  );
}
