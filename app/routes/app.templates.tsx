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
    { label: "All Templates", value: "All", color: "#333333", bg: "rgba(0, 0, 0, 0.04)" },
    { label: "Positive", value: "Positive", color: "#108043", bg: "rgba(16, 128, 67, 0.1)", icon: "😊" },
    { label: "Negative", value: "Negative", color: "#D82C0D", bg: "rgba(216, 44, 13, 0.1)", icon: "😡" },
    { label: "Neutral", value: "Neutral", color: "#E4981E", bg: "rgba(228, 152, 30, 0.1)", icon: "😐" },
    { label: "Shipping", value: "Shipping", color: "#006FBB", bg: "rgba(0, 111, 187, 0.1)", icon: "📦" },
    { label: "Product", value: "Product", color: "#8A6116", bg: "rgba(138, 97, 22, 0.1)", icon: "🛍️" },
  ];

  return (
    <>
      <style>{`
        /* Global CSS reset for route */
        .replix-ai-templates {
          font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          background-color: #FAFAFA;
          min-height: 100vh;
          padding: 40px;
          color: #202223;
        }

        /* Header Layout */
        .replix-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          flex-wrap: wrap;
          gap: 24px;
        }
        
        .replix-header-content h1 {
          font-size: 34px;
          font-weight: 700;
          color: #1A1A1A;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }
        .replix-header-content p {
          color: #5C5F62;
          font-size: 15px;
          margin: 0;
        }

        .replix-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        /* Form Inputs */
        .replix-search-input {
          padding: 10px 16px 10px 36px;
          border-radius: 12px;
          border: 1px solid #E4E5E7;
          width: 240px;
          font-size: 14px;
          outline: none;
          background-color: #FFFFFF;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .replix-search-input:focus {
          border-color: #008060;
          box-shadow: 0 0 0 2px rgba(0, 128, 96, 0.2);
        }

        .replix-btn-primary {
          background-color: #008060;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 128, 96, 0.2);
          transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .replix-btn-primary:hover {
          background-color: #006E52;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 128, 96, 0.25);
        }

        /* Filter Chips */
        .replix-filters {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 32px;
          scrollbar-width: none;
        }
        .replix-filters::-webkit-scrollbar { display: none; }
        
        .replix-filter-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 99px;
          border: 1px solid transparent;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .replix-filter-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        /* Grid */
        .replix-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        /* Template Card */
        .replix-card {
          background-color: #FFFFFF;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          border: 1px solid #F1F2F4;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          min-height: 260px;
        }
        .replix-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
        }
        
        /* Featured Template (First Card) */
        .replix-card-featured {
          grid-column: span 2;
          background: linear-gradient(135deg, #FFFFFF 0%, #F5FFF8 100%);
          border-color: #E2F3E7;
        }

        .replix-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .replix-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .replix-card-favorite {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 24px;
          color: #D1D5DB;
          transition: transform 0.2s;
        }
        .replix-card-favorite:hover {
          transform: scale(1.1);
        }
        
        .replix-card-title {
          font-size: 18px;
          font-weight: 700;
          color: #1A1A1A;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }
        .replix-card-desc {
          font-size: 15px;
          color: #5C5F62;
          line-height: 1.6;
          margin: 0 0 24px 0;
          flex: 1;
        }

        .replix-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid #F1F2F4;
        }
        
        .replix-card-stats {
          font-size: 14px;
          font-weight: 600;
          color: #5C5F62;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .replix-btn-use {
          background-color: transparent;
          color: #008060;
          border: 1px solid #008060;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .replix-btn-use:hover {
          background-color: #008060;
          color: white;
        }

        /* Empty State */
        .replix-empty {
          text-align: center;
          padding: 80px 20px;
          background: #FFFFFF;
          border-radius: 20px;
          border: 1px dashed #E4E5E7;
          margin-top: 40px;
        }

        /* Responsive Layouts */
        @media (max-width: 1200px) {
          .replix-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .replix-grid { grid-template-columns: repeat(2, 1fr); }
          .replix-card-featured { grid-column: span 1; }
        }
        @media (max-width: 600px) {
          .replix-grid { grid-template-columns: 1fr; }
          .replix-header { flex-direction: column; align-items: stretch; }
          .replix-header-actions { justify-content: flex-start; }
          .replix-ai-templates { padding: 20px; }
        }
      `}</style>

      <div className="replix-ai-templates">
        
        {/* Header */}
        <div className="replix-header">
          <div className="replix-header-content">
            <h1>AI Reply Templates</h1>
            <p>Choose professionally crafted AI reply templates for different customer situations.</p>
          </div>
          
          <div className="replix-header-actions">
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <input 
                type="text" 
                className="replix-search-input"
                placeholder="Search templates..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search templates"
              />
            </div>
            
            <div style={{ color: "#5C5F62", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", border: "1px solid #E4E5E7", padding: "10px 16px", borderRadius: "12px", backgroundColor: "white" }}>
              Sort: Latest 
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            
            <button className="replix-btn-primary" onClick={toggleModal} aria-label="Create Template">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Create Template
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="replix-filters" role="tablist">
          {filters.map(filter => {
            const isActive = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className="replix-filter-chip"
                role="tab"
                aria-selected={isActive}
                style={{
                  backgroundColor: isActive ? filter.color : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#5C5F62",
                  borderColor: isActive ? filter.color : "#E4E5E7"
                }}
              >
                {filter.icon && <span>{filter.icon}</span>}
                {filter.label}
                <span style={{ 
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : filter.bg, 
                  color: isActive ? "#FFFFFF" : filter.color,
                  padding: "2px 8px", 
                  borderRadius: "99px", 
                  fontSize: "12px" 
                }}>
                  {counts[filter.value] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="replix-grid">
            {filteredTemplates.map((template, index) => {
              
              let iconBg = "rgba(0, 0, 0, 0.04)";
              let iconEmoji = "📝";
              if (template.category === "Positive") { iconBg = "rgba(16, 128, 67, 0.1)"; iconEmoji = "😊"; }
              if (template.category === "Negative") { iconBg = "rgba(216, 44, 13, 0.1)"; iconEmoji = "😡"; }
              if (template.category === "Neutral") { iconBg = "rgba(228, 152, 30, 0.1)"; iconEmoji = "😐"; }
              if (template.category === "Shipping") { iconBg = "rgba(0, 111, 187, 0.1)"; iconEmoji = "📦"; }
              if (template.category === "Product") { iconBg = "rgba(138, 97, 22, 0.1)"; iconEmoji = "🛍️"; }

              const isFeatured = index === 0 && activeFilter === "All" && !search;
              
              const tagList = template.tags ? template.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

              return (
                <div 
                  key={template.id} 
                  className={`replix-card ${isFeatured ? "replix-card-featured" : ""}`}
                >
                  {isFeatured && (
                    <div style={{ position: "absolute", top: "16px", left: "16px", backgroundColor: "#008060", color: "white", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "99px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Featured
                    </div>
                  )}
                  
                  <div className="replix-card-header" style={{ marginTop: isFeatured ? "28px" : "0" }}>
                    <div className="replix-card-icon" style={{ backgroundColor: iconBg }}>
                      {iconEmoji}
                    </div>
                    <button 
                      className="replix-card-favorite"
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(template.id, template.isFavorite); }}
                      style={{ color: template.isFavorite ? "#F59E0B" : "#D1D5DB" }}
                      aria-label="Toggle favorite"
                    >
                      {template.isFavorite ? "★" : "☆"}
                    </button>
                  </div>

                  <h3 className="replix-card-title">{template.name}</h3>
                  <p className="replix-card-desc">{template.description}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                    {template.category && (
                      <span style={{ backgroundColor: iconBg, color: "#202223", padding: "4px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>
                        {template.category}
                      </span>
                    )}
                    {tagList.slice(0, 2).map((tag, i) => (
                      <span key={i} style={{ backgroundColor: "#F1F2F4", color: "#5C5F62", padding: "4px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>
                        {tag}
                      </span>
                    ))}
                    {tagList.length > 2 && (
                      <span style={{ backgroundColor: "#F1F2F4", color: "#5C5F62", padding: "4px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}>
                        +{tagList.length - 2}
                      </span>
                    )}
                  </div>

                  <div className="replix-card-footer">
                    <div className="replix-card-stats">
                      {template.usageCount > 50 ? (
                        <>⭐ Popular</>
                      ) : (
                        <>🔥 Used {template.usageCount} times</>
                      )}
                    </div>
                    <button 
                      className="replix-btn-use"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/reviews`);
                      }}
                    >
                      Use Template
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="replix-empty">
            <svg width="80" height="80" fill="none" stroke="#D1D5DB" viewBox="0 0 24 24" style={{ margin: "0 auto 20px auto", display: "block" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#1A1A1A", marginBottom: "8px" }}>No templates found</h3>
            <p style={{ color: "#5C5F62", fontSize: "15px", marginBottom: "24px" }}>Create your first AI template or adjust your filters.</p>
            <button className="replix-btn-primary" onClick={toggleModal} style={{ margin: "0 auto" }}>
              + Create Template
            </button>
          </div>
        )}

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
    </>
  );
}
