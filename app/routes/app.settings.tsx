import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { encrypt, decrypt } from "../lib/encryption.server";
import { Button, TextField, Select, BlockStack, Banner } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { useToast } from "../components/common/ToastProvider";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.shopSettings.findUnique({ where: { shop: session.shop } });
  
  if (settings) {
    settings.judgeMeApiToken = decrypt(settings.judgeMeApiToken || "");
    settings.looxApiToken = decrypt(settings.looxApiToken || "");
    settings.huggingFaceApiToken = decrypt(settings.huggingFaceApiToken || "");
  }
  
  return json({ settings: settings || {} });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  
  const judgeMeApiToken = formData.get("judgeMeApiToken")?.toString() || "";
  const looxApiToken = formData.get("looxApiToken")?.toString() || "";
  const huggingFaceApiToken = formData.get("huggingFaceApiToken")?.toString() || "";
  const reviewProvider = formData.get("reviewProvider")?.toString() || "judgeme";
  const defaultProvider = formData.get("defaultProvider")?.toString() || "judgeme";
  const defaultTone = formData.get("defaultTone")?.toString() || "professional";
  const brandVoicePrompt = formData.get("brandVoicePrompt")?.toString() || "";
  const defaultSignature = formData.get("defaultSignature")?.toString() || "";
  const supportEmail = formData.get("supportEmail")?.toString() || "";

  if (!huggingFaceApiToken) {
    return json({ error: "Hugging Face API Token is required." }, { status: 400 });
  }

  if (reviewProvider === "judgeme" && !judgeMeApiToken) {
    return json({ error: "Judge.me API Token is required when Judge.me is selected." }, { status: 400 });
  }

  if (reviewProvider === "loox" && !looxApiToken) {
    return json({ error: "Loox API Token is required when Loox is selected." }, { status: 400 });
  }

  try {
    const encryptedJudgeMe = encrypt(judgeMeApiToken);
    const encryptedLoox = encrypt(looxApiToken);
    const encryptedHuggingFace = encrypt(huggingFaceApiToken);

    await db.shopSettings.upsert({
      where: { shop },
      create: { 
        shop, 
        judgeMeApiToken: encryptedJudgeMe, 
        looxApiToken: encryptedLoox,
        huggingFaceApiToken: encryptedHuggingFace, 
        reviewProvider,
        defaultProvider,
        defaultTone, 
        brandVoicePrompt, 
        defaultSignature, 
        supportEmail 
      },
      update: { 
        judgeMeApiToken: encryptedJudgeMe, 
        looxApiToken: encryptedLoox,
        huggingFaceApiToken: encryptedHuggingFace, 
        reviewProvider,
        defaultProvider,
        defaultTone, 
        brandVoicePrompt, 
        defaultSignature, 
        supportEmail 
      }
    });
    return json({ success: true, error: null });
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
    looxApiToken: settings.looxApiToken || "",
    huggingFaceApiToken: settings.huggingFaceApiToken || "",
    reviewProvider: settings.reviewProvider || "judgeme",
    defaultProvider: settings.defaultProvider || "judgeme",
    defaultTone: settings.defaultTone || "professional",
    brandVoicePrompt: settings.brandVoicePrompt || "",
    defaultSignature: settings.defaultSignature || "",
    supportEmail: settings.supportEmail || "",
  });

  const [showJudgeMeToken, setShowJudgeMeToken] = useState(false);
  const [showLooxToken, setShowLooxToken] = useState(false);
  const [showHuggingFaceKey, setShowHuggingFaceKey] = useState(false);

  const isSaving = navigation.state === "submitting";
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    if (actionData && 'success' in actionData && actionData.success) {
      showToast("Settings saved successfully");
    } else if (actionData && 'error' in actionData && actionData.error) {
      showToast(actionData.error, true);
    }
  }, [actionData, showToast]);

  const handleChange = (value: string, id: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = () => {
    if (!formData.huggingFaceApiToken) {
      showToast("Hugging Face API Token is required.", true);
      return;
    }
    if (formData.reviewProvider === "judgeme" && !formData.judgeMeApiToken) {
      showToast("Judge.me API Token is required.", true);
      return;
    }
    if (formData.reviewProvider === "loox" && !formData.looxApiToken) {
      showToast("Loox API Token is required.", true);
      return;
    }
    submit(formData, { method: "post" });
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>Settings</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <div className="replix-card" style={{ padding: "30px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Providers</h2>
          <BlockStack gap="400">
            <Select
              label="Review Provider"
              options={[
                { label: "Judge.me", value: "judgeme" },
                { label: "Loox", value: "loox" },
                { label: "Manual", value: "manual" },
                { label: "CSV Import", value: "csv" },
              ]}
              value={formData.reviewProvider}
              onChange={(v) => handleChange(v, "reviewProvider")}
            />
            <Select
              label="Default Provider"
              options={[
                { label: "Judge.me", value: "judgeme" },
                { label: "Loox", value: "loox" },
                { label: "Manual", value: "manual" },
                { label: "CSV Import", value: "csv" },
              ]}
              value={formData.defaultProvider}
              onChange={(v) => handleChange(v, "defaultProvider")}
            />
          </BlockStack>
        </div>

        {/* Section 1 - Integrations */}
        <div className="replix-card" style={{ padding: "30px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Integrations</h2>
          <BlockStack gap="400">
            <TextField
              label="Judge.me API Token (Optional)"
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
              label="Loox API Token (Optional)"
              type={showLooxToken ? "text" : "password"}
              value={formData.looxApiToken}
              onChange={(v) => handleChange(v, "looxApiToken")}
              autoComplete="off"
              helpText="Find this in Loox Settings"
              connectedRight={
                <Button onClick={() => setShowLooxToken(!showLooxToken)}>
                  {showLooxToken ? "Hide" : "Show"}
                </Button>
              }
            />
            <TextField
              label="Hugging Face API Token"
              type={showHuggingFaceKey ? "text" : "password"}
              value={formData.huggingFaceApiToken}
              onChange={(v) => handleChange(v, "huggingFaceApiToken")}
              autoComplete="off"
              helpText="Required to generate AI replies using Hugging Face models"
              connectedRight={
                <Button onClick={() => setShowHuggingFaceKey(!showHuggingFaceKey)}>
                  {showHuggingFaceKey ? "Hide" : "Show"}
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
