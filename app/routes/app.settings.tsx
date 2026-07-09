import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Button, TextField, Select, BlockStack, Banner } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { useToast } from "../components/common/ToastProvider";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.shopSettings.findUnique({ where: { shop: session.shop } });
  return json({ settings: settings || {} });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  
  const judgeMeApiToken = formData.get("judgeMeApiToken")?.toString() || "";
  const claudeApiKey = formData.get("claudeApiKey")?.toString() || "";
  const defaultTone = formData.get("defaultTone")?.toString() || "professional";
  const brandVoicePrompt = formData.get("brandVoicePrompt")?.toString() || "";
  const defaultSignature = formData.get("defaultSignature")?.toString() || "";
  const supportEmail = formData.get("supportEmail")?.toString() || "";

  if (!judgeMeApiToken || !claudeApiKey) {
    return json({ error: "Judge.me API Token and Claude API Key are required." }, { status: 400 });
  }

  try {
    await db.shopSettings.upsert({
      where: { shop },
      create: { shop, judgeMeApiToken, claudeApiKey, defaultTone, brandVoicePrompt, defaultSignature, supportEmail },
      update: { judgeMeApiToken, claudeApiKey, defaultTone, brandVoicePrompt, defaultSignature, supportEmail }
    });
    return json({ success: true });
  } catch (err: any) {
    console.error("Settings save error:", err);
    return json({ error: "Database error while saving settings." }, { status: 500 });
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>() as any;
  const submit = useSubmit();
  const navigation = useNavigation();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    judgeMeApiToken: settings.judgeMeApiToken || "",
    claudeApiKey: settings.claudeApiKey || "",
    defaultTone: settings.defaultTone || "professional",
    brandVoicePrompt: settings.brandVoicePrompt || "",
    defaultSignature: settings.defaultSignature || "",
    supportEmail: settings.supportEmail || "",
  });

  const [showJudgeMeToken, setShowJudgeMeToken] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);

  const isSaving = navigation.state === "submitting";
  const actionData = useNavigation().formAction; // we could use useActionData, but here we can just toast from effect or action

  const handleChange = (value: string, id: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = () => {
    submit(formData, { method: "post" });
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>Settings</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Section 1 - Integrations */}
        <div className="replix-card" style={{ padding: "30px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Integrations</h2>
          <BlockStack gap="400">
            <TextField
              label="Judge.me API Token"
              type={showJudgeMeToken ? "text" : "password"}
              value={formData.judgeMeApiToken}
              onChange={(v) => handleChange(v, "judgeMeApiToken")}
              autoComplete="off"
              helpText="Find this in Judge.me Settings > Integrations > Developers"
              connectedRight={
                <Button onClick={() => setShowJudgeMeToken(!showJudgeMeToken)}>
                  {showJudgeMeToken ? "Hide" : "Show"}
                </Button>
              }
            />
            <TextField
              label="Claude API Key (Anthropic)"
              type={showClaudeKey ? "text" : "password"}
              value={formData.claudeApiKey}
              onChange={(v) => handleChange(v, "claudeApiKey")}
              autoComplete="off"
              helpText="Required to generate AI replies"
              connectedRight={
                <Button onClick={() => setShowClaudeKey(!showClaudeKey)}>
                  {showClaudeKey ? "Hide" : "Show"}
                </Button>
              }
            />
          </BlockStack>
        </div>

        {/* Section 2 - AI Defaults */}
        <div className="replix-card" style={{ padding: "30px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>AI Defaults</h2>
          <BlockStack gap="400">
            <Select
              label="Default Tone"
              options={[
                { label: "Professional", value: "professional" },
                { label: "Friendly", value: "friendly" },
                { label: "Luxury", value: "luxury" },
                { label: "Formal", value: "formal" },
                { label: "Casual", value: "casual" },
                { label: "Funny", value: "funny" },
              ]}
              value={formData.defaultTone}
              onChange={(v) => handleChange(v, "defaultTone")}
            />
            <TextField
              label="Brand Voice Prompt (Optional)"
              multiline={3}
              value={formData.brandVoicePrompt}
              onChange={(v) => handleChange(v, "brandVoicePrompt")}
              autoComplete="off"
              helpText="e.g. 'We are a sustainable fashion brand that uses emojis often.'"
            />
            <TextField
              label="Default Signature"
              value={formData.defaultSignature}
              onChange={(v) => handleChange(v, "defaultSignature")}
              autoComplete="off"
              helpText="e.g. '— The Team at My Store'"
            />
          </BlockStack>
        </div>

        {/* Section 3 - Support */}
        <div className="replix-card" style={{ padding: "30px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Support</h2>
          <TextField
            label="Support Email"
            type="email"
            value={formData.supportEmail}
            onChange={(v) => handleChange(v, "supportEmail")}
            autoComplete="email"
            helpText="Where should we send important app updates?"
          />
        </div>

        <Button variant="primary" size="large" fullWidth loading={isSaving} onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
