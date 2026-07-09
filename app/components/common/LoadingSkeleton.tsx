import { SkeletonBodyText, SkeletonDisplayText } from "@shopify/polaris";

export function LoadingSkeletonCards() {
  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      <div className="replix-card" style={{ flex: 1, padding: '20px' }}>
        <SkeletonDisplayText size="small" />
        <div style={{ marginTop: '10px' }}><SkeletonBodyText lines={2} /></div>
      </div>
      <div className="replix-card" style={{ flex: 1, padding: '20px' }}>
        <SkeletonDisplayText size="small" />
        <div style={{ marginTop: '10px' }}><SkeletonBodyText lines={2} /></div>
      </div>
      <div className="replix-card" style={{ flex: 1, padding: '20px' }}>
        <SkeletonDisplayText size="small" />
        <div style={{ marginTop: '10px' }}><SkeletonBodyText lines={2} /></div>
      </div>
      <div className="replix-card" style={{ flex: 1, padding: '20px' }}>
        <SkeletonDisplayText size="small" />
        <div style={{ marginTop: '10px' }}><SkeletonBodyText lines={2} /></div>
      </div>
    </div>
  );
}

export function LoadingSkeletonTable() {
  return (
    <div className="replix-card" style={{ padding: '20px', margin: '20px' }}>
      <SkeletonBodyText lines={10} />
    </div>
  );
}
