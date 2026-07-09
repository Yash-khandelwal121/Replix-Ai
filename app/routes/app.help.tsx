import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Button, Icon } from "@shopify/polaris";
import { InfoIcon, ChatIcon, EnvelopeIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export default function HelpCenter() {
  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Help Center</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>Find answers or get in touch with our support team.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        <div className="replix-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ color: "var(--color-primary)" }}><Icon source={InfoIcon} tone="inherit" /></div>
          <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Documentation</h2>
          <p style={{ color: "var(--color-text-secondary)", flex: 1 }}>Read our guides on how to optimize your AI prompts and sync Judge.me.</p>
          <Button>Read Docs</Button>
        </div>

        <div className="replix-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ color: "var(--color-primary)" }}><Icon source={EnvelopeIcon} tone="inherit" /></div>
          <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Email Support</h2>
          <p style={{ color: "var(--color-text-secondary)", flex: 1 }}>Need direct assistance? Our team usually replies within 24 hours.</p>
          <Button variant="primary">Contact Us</Button>
        </div>

      </div>
    </div>
  );
}
