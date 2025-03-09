import { Card, SkeletonBodyText, SkeletonDisplayText } from "@shopify/polaris";
import "../styles/skeleton.css";

export const SkeletonChart = () => {
  return (
    <Card>
      <SkeletonDisplayText size="small" />
      <div 
        className="skeleton-shimmer"
        style={{
          height: "250px", 
          marginTop: "20px", 
          background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", 
          backgroundSize: "200% 100%"
        }} 
      />
    </Card>
  );
};

export const SkeletonTable = () => {
  return (
    <Card>
      <SkeletonDisplayText size="small" />
      <div style={{ marginTop: "20px" }}>
        <SkeletonBodyText lines={5} />
      </div>
    </Card>
  );
};
