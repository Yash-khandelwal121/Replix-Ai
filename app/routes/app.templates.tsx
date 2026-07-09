import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Button, Icon, Text } from "@shopify/polaris";
import { NoteIcon, PlusIcon, LockIcon } from "@shopify/polaris-icons";
import EmptyState from "../components/common/EmptyState";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export default function Templates() {
  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>AI Templates</h1>
          <p style={{ color: "var(--color-text-secondary)" }}>Manage custom prompts and AI responses for specific scenarios.</p>
        </div>
        <Button variant="primary" icon={PlusIcon}>Create Template</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
        
        {/* Default System Templates */}
        <div className="replix-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
              <Icon source={NoteIcon} tone="base" />
              Apology & Refund
            </div>
            <Icon source={LockIcon} tone="subdued" />
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", marginBottom: "16px", minHeight: "40px" }}>
            Standard response for negative reviews regarding shipping delays or broken items.
          </p>
          <div style={{ fontSize: "12px", padding: "4px 8px", backgroundColor: "var(--color-bg)", borderRadius: "4px", display: "inline-block" }}>
            System Default
          </div>
        </div>

        <div className="replix-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
              <Icon source={NoteIcon} tone="base" />
              Gratitude & Upsell
            </div>
            <Icon source={LockIcon} tone="subdued" />
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", marginBottom: "16px", minHeight: "40px" }}>
            Enthusiastic response for 5-star reviews, offering a discount code for next purchase.
          </p>
          <div style={{ fontSize: "12px", padding: "4px 8px", backgroundColor: "var(--color-bg)", borderRadius: "4px", display: "inline-block" }}>
            System Default
          </div>
        </div>
      </div>
    </div>
  );
}
