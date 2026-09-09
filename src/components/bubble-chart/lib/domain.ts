/** FuseDash BubbleChart linear domains with asymmetric padding (x 10%, y 20%). */
export function bubbleXDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const padding = (max - min) * 0.1;
  return [min - padding, max + padding];
}

export function bubbleYDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const padding = (max - min) * 0.2;
  return [min - padding / 2, max + padding];
}
