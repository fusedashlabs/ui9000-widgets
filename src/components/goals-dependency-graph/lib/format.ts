const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const SHORT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** `1,204`. */
export function formatCount(value: number): string {
  return Number.isFinite(value) ? GROUPED.format(value) : '—';
}

/** `1,204 agents`, `1 agent`. */
export function formatAgents(value: number): string {
  return `${formatCount(value)} ${value === 1 ? 'agent' : 'agents'}`;
}

/** 0.88 → `88%`. */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** 1.1 → `1.1×`. */
export function formatMultiplier(value: number): string {
  return `${ONE_DECIMAL.format(value)}×`;
}

/** 14200 → `14.2K`. */
export function formatShort(value: number): string {
  return Number.isFinite(value) ? SHORT.format(value) : '—';
}

/** `credential grant required` → `Credential grant required`. */
export function capitalize(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}
