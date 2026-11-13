import { SPACING } from "../config";

type GridProps = {
  areas?: string;
  children: React.JSX.Element | React.JSX.Element[];
  cols?: string;
  rows?: string;
  gap?: keyof typeof SPACING;
};

export function Grid({ areas, children, cols, gap, rows }: GridProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: gap ? SPACING[gap] : undefined,
        gridTemplateAreas: areas,
        gridTemplateColumns: cols,
        gridTemplateRows: rows,
      }}
    >
      {children}
    </div>
  );
}
