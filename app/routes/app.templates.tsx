import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState, useCallback, useMemo } from "react";
import { Modal, FormLayout, TextField, Select } from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const templates = await prisma.template.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" }
  });

  return json({ templates });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const prompt = formData.get("prompt") as string;
    const category = formData.get("category") as string || "General";
    const icon = formData.get("icon") as string || "NoteIcon";
    const tags = formData.get("tags") as string || "";

    await prisma.template.create({
      data: {
        shop,
        name,
        description,
        prompt,
        category,
        icon,
        tags,
      }
    });

    return json({ success: true });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await prisma.template.deleteMany({
      where: { id, shop }
    });
    return json({ success: true });
  }

  if (intent === "toggleFavorite") {
    const id = formData.get("id") as string;
    const isFavorite = formData.get("isFavorite") === "true";
    await prisma.template.updateMany({
      where: { id, shop },
      data: { isFavorite }
    });
    return json({ success: true });
  }

  return json({ success: false, error: "Invalid intent" }, { status: 400 });
};

export default function Templates() {
  const { templates } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [active, setActive] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("Positive");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const toggleModal = useCallback(() => setActive((active) => !active), []);

  const handleCreate = () => {
    let icon = "NoteIcon";
    if (category === "Positive") icon = "SmileyIcon";
    if (category === "Negative") icon = "SadIcon";
    if (category === "Shipping") icon = "BoxIcon";
    if (category === "Product") icon = "TagIcon";

    submit(
      { intent: "create", name, description, prompt, category, icon, tags },
      { method: "post" }
    );
    toggleModal();
    setName("");
    setDescription("");
    setPrompt("");
    setTags("");
  };

  const handleToggleFavorite = (id: string, current: boolean) => {
    submit({ intent: "toggleFavorite", id, isFavorite: (!current).toString() }, { method: "post" });
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (activeFilter !== "All" && t.category !== activeFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, activeFilter, search]);

  const counts = useMemo(() => {
    const counts: Record<string, number> = { All: templates.length };
    templates.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [templates]);

  const filters = [
    { label: "All Templates", value: "All", color: "#5E5CE6", bg: "rgba(94, 92, 230, 0.1)" },
    { label: "Positive", value: "Positive", color: "#00A046", bg: "rgba(0, 160, 70, 0.1)", icon: "😄" },
    { label: "Negative", value: "Negative", color: "#E51C00", bg: "rgba(229, 28, 0, 0.1)", icon: "😡" },
    { label: "Neutral", value: "Neutral", color: "#FF9900", bg: "rgba(255, 153, 0, 0.1)", icon: "😐" },
    { label: "Shipping", value: "Shipping", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)", icon: "📦" },
    { label: "Product", value: "Product", color: "#0D9488", bg: "rgba(13, 148, 136, 0.1)", icon: "🛍️" },
  ];

  return (
    <div style={{ backgroundColor: "#F9FAFB", minHeight: "100vh", padding: "40px 60px", fontFamily: "Inter, sans-serif" }}>
      
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: "0 0 8px 0" }}>Templates</h1>
          <p style={{ color: "#6B7280", fontSize: "15px", margin: 0 }}>Create, customize, and manage your AI reply templates</p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search templates..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "10px 16px 10px 40px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                width: "260px",
                fontSize: "14px",
                outline: "none"
              }}
            />
            <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "12px", backgroundColor: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>⌘K</span>
          </div>
          
          <button style={{ background: "none", border: "none", fontSize: "20px", color: "#6B7280", cursor: "pointer", position: "relative" }}>
            🔔
            <span style={{ position: "absolute", top: "2px", right: "0", width: "8px", height: "8px", backgroundColor: "#EF4444", borderRadius: "50%" }}></span>
          </button>
          
          <button 
            onClick={toggleModal}
            style={{
              backgroundColor: "#5E5CE6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 6px -1px rgba(94, 92, 230, 0.2)"
            }}
          >
            + New Template
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: activeFilter === filter.value ? filter.color : "white",
                color: activeFilter === filter.value ? "white" : "#4B5563",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: activeFilter !== filter.value ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
                transition: "all 0.2s"
              }}
            >
              {filter.icon && <span>{filter.icon}</span>}
              {filter.label}
              <span style={{ 
                backgroundColor: activeFilter === filter.value ? "rgba(255,255,255,0.2)" : filter.bg, 
                color: activeFilter === filter.value ? "white" : filter.color,
                padding: "2px 8px", 
                borderRadius: "999px", 
                fontSize: "12px" 
              }}>
                {counts[filter.value] || 0}
              </span>
            </button>
          ))}
        </div>
        
        <div style={{ color: "#6B7280", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          Sort by: Latest <span>▼</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {filteredTemplates.map(template => {
          
          let iconBg = "rgba(0, 160, 70, 0.1)";
          let iconEmoji = "😄";
          if (template.category === "Negative") { iconBg = "rgba(229, 28, 0, 0.1)"; iconEmoji = "😡"; }
          if (template.category === "Neutral") { iconBg = "rgba(255, 153, 0, 0.1)"; iconEmoji = "💬"; }
          if (template.category === "Shipping") { iconBg = "rgba(59, 130, 246, 0.1)"; iconEmoji = "📦"; }
          if (template.category === "Product") { iconBg = "rgba(13, 148, 136, 0.1)"; iconEmoji = "🛍️"; }

          const tagList = template.tags ? template.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

          return (
            <div key={template.id} style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer",
              border: "1px solid #F3F4F6"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "48px", height: "48px", borderRadius: "50%",
                    backgroundColor: iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "24px", flexShrink: 0
                  }}>
                    {iconEmoji}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "#111827", lineHeight: "1.3" }}>
                      {template.name}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorite(template.id, template.isFavorite); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: template.isFavorite ? "#F59E0B" : "#D1D5DB" }}
                >
                  {template.isFavorite ? "★" : "☆"}
                </button>
              </div>

              <p style={{ color: "#4B5563", fontSize: "14px", lineHeight: "1.5", margin: "0 0 20px 0", flex: 1 }}>
                {template.description}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                {template.category && (
                  <span style={{ backgroundColor: iconBg, color: "#4B5563", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                    {template.category}
                  </span>
                )}
                {tagList.map((tag, i) => (
                  <span key={i} style={{ backgroundColor: "rgba(94, 92, 230, 0.1)", color: "#5E5CE6", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", borderTop: "1px solid #F3F4F6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6B7280", fontSize: "13px", fontWeight: 500 }}>
                  👁️ Used {template.usageCount} times
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/reviews`);
                    // Note: We could use a global toast here if we export it
                  }}
                  style={{
                    backgroundColor: "#5E5CE6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "opacity 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                >
                  Use Template
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={active}
        onClose={toggleModal}
        title="Create Custom Template"
        primaryAction={{
          content: "Save Template",
          onAction: handleCreate,
          disabled: !name || !prompt || isSubmitting,
          loading: isSubmitting
        }}
        secondaryActions={[{ content: "Cancel", onAction: toggleModal }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField label="Template Name" value={name} onChange={setName} autoComplete="off" />
            <Select 
              label="Category" 
              options={["Positive", "Negative", "Neutral", "Shipping", "Product"]} 
              value={category} 
              onChange={setCategory} 
            />
            <TextField label="Description" value={description} onChange={setDescription} autoComplete="off" />
            <TextField label="Tags (comma separated)" value={tags} onChange={setTags} autoComplete="off" placeholder="e.g. VIP, Apology, Refund" />
            <TextField label="AI Prompt Instructions" value={prompt} onChange={setPrompt} autoComplete="off" multiline={4} />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </div>
  );
}
