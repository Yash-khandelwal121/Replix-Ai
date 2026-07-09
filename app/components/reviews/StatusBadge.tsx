export function StatusBadge({ status }: { status: string }) {
  const getStyles = () => {
    switch (status) {
      case "published":
        return { bg: "rgba(34, 197, 94, 0.15)", text: "var(--color-success)" };
      case "replied":
        return { bg: "rgba(94, 92, 230, 0.15)", text: "var(--color-primary)" };
      default:
        return { bg: "rgba(245, 158, 11, 0.15)", text: "var(--color-warning)" }; // pending
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
      {status}
    </span>
  );
}
