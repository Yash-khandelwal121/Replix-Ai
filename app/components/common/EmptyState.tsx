import { Button } from "@shopify/polaris";

interface EmptyStateProps {
  heading: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: string;
}

export default function EmptyState({ heading, description, actionText, onAction, icon = "✨" }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      textAlign: "center",
      backgroundColor: "var(--color-surface)",
      borderRadius: "var(--radius)",
      boxShadow: "var(--shadow-soft)",
      margin: "20px 0"
    }}>
      <div style={{
        fontSize: "48px",
        marginBottom: "16px",
        color: "var(--color-primary)",
        opacity: 0.8
      }}>
        {icon}
      </div>
      <h2 style={{
        fontSize: "20px",
        fontWeight: 600,
        marginBottom: "8px",
        color: "var(--color-text)"
      }}>
        {heading}
      </h2>
      <p style={{
        fontSize: "14px",
        color: "var(--color-text-secondary)",
        marginBottom: actionText ? "24px" : "0",
        maxWidth: "400px"
      }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
