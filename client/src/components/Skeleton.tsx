interface SkeletonRectProps {
  width?: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonRect({ width, height, className = "", style }: SkeletonRectProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

interface SkeletonTextProps {
  width?: string;
  className?: string;
}

export function SkeletonText({ width = "100%", className = "" }: SkeletonTextProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height: "14px", borderRadius: "var(--radius-sm)" }}
      aria-hidden="true"
    />
  );
}
