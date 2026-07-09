import { Icon } from "@shopify/polaris";
import { StarFilledIcon } from "@shopify/polaris-icons";

export function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <div 
          key={star}
          style={{ 
            width: "16px", 
            height: "16px", 
            color: star <= rating ? "var(--color-warning)" : "var(--color-border)" 
          }}
        >
          <Icon source={StarFilledIcon} tone="inherit" />
        </div>
      ))}
    </div>
  );
}
