import { Link, useLocation, useRouteLoaderData } from "@remix-run/react";
import { 
  HomeIcon, 
  ChatIcon, 
  SettingsIcon, 
  CreditCardIcon, 
  ChartVerticalIcon, 
  InfoIcon, 
  NoteIcon 
} from "@shopify/polaris-icons";
import { Icon } from "@shopify/polaris";

const navItems = [
  { label: "Dashboard", href: "/app", icon: HomeIcon },
  { label: "Reviews", href: "/app/reviews", icon: ChatIcon },
  { label: "Templates", href: "/app/templates", icon: NoteIcon },
  { label: "Analytics", href: "/app/analytics", icon: ChartVerticalIcon },
  { label: "Settings", href: "/app/settings", icon: SettingsIcon },
  { label: "Billing", href: "/app/billing", icon: CreditCardIcon },
  { label: "Help Center", href: "/app/help", icon: InfoIcon },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <div style={{
      width: "240px",
      flexShrink: 0,
      backgroundColor: "var(--color-surface)",
      borderRight: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0
    }}>
      <div style={{ padding: "20px" }}>
        <h1 style={{
          fontSize: "18px",
          fontWeight: 700,
          background: "linear-gradient(90deg, #5E5CE6 0%, #8A2BE2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>✨ Replix AI</h1>
      </div>
      
      <nav style={{ flex: 1, padding: "0 10px" }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== "/app" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "40px",
                padding: "0 12px",
                borderRadius: "8px",
                textDecoration: "none",
                color: isActive ? "var(--color-primary)" : "var(--color-text)",
                backgroundColor: isActive ? "rgba(94, 92, 230, 0.08)" : "transparent",
                borderLeft: isActive ? "3px solid var(--color-primary)" : "3px solid transparent",
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ width: "20px", height: "20px" }}>
                <Icon source={item.icon} tone={isActive ? "interactive" : "base"} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{
        padding: "20px",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}>
        {(() => {
          const appData = useRouteLoaderData("routes/app") as any;
          const shopStr = appData?.shop || "My Store";
          const shopName = shopStr.replace(".myshopify.com", "");
          const initials = shopName.substring(0, 2).toUpperCase();
          const isPro = appData?.plan === "pro";
          const planName = isPro ? "Pro Plan" : "Free Plan";

          return (
            <>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: isPro ? "var(--color-primary)" : "#6B7280",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "14px"
              }}>
                {initials}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {shopName}
                </div>
                <div style={{ fontSize: "12px", color: isPro ? "var(--color-primary)" : "#6B7280" }}>
                  ● {planName}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
