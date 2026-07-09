export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const getStyles = () => {
    switch (sentiment) {
      case "positive":
        return { bg: "rgba(34, 197, 94, 0.15)", text: "var(--color-success)" };
      case "negative":
        return { bg: "rgba(239, 68, 68, 0.15)", text: "var(--color-danger)" };
      default:
        return { bg: "rgba(107, 114, 128, 0.15)", text: "var(--color-text-secondary)" };
    }
  };

  const styles = getStyles();

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 600,
      backgroundColor: styles.bg,
      color: styles.text,
      textTransform: "capitalize"
    }}>
      {sentiment}
    </span>
  );
}
