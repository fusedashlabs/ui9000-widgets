/** FuseDash DonutChart inner hole (client/Widgets/DonutChart/index.tsx). */
export const MIN_DONUT_THICKNESS = 25;
export const DONUT_THICKNESS_RATIO = 0.3;

export function computeDonutInnerRadius(outerRadius: number): number {
  if (!Number.isFinite(outerRadius) || outerRadius <= 0) return 0;
  const donutThickness = Math.max(
    outerRadius * DONUT_THICKNESS_RATIO,
    MIN_DONUT_THICKNESS,
  );
  return Math.max(0, outerRadius - donutThickness);
}
