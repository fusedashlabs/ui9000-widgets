import type { PerimeterGoal } from './types.js';

const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** `1,204`. */
export function formatCount(value: number): string {
  return Number.isFinite(value) ? GROUPED.format(value) : '—';
}

/** `1,204 agents`, `1 agent`. */
export function formatAgents(value: number): string {
  return `${formatCount(value)} ${value === 1 ? 'agent' : 'agents'}`;
}

/** 0.88 → `88%`. */
export function formatHealth(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** 1.1 → `1.1×`. */
export function formatMultiplier(value: number): string {
  return `${ONE_DECIMAL.format(value)}×`;
}

/** `1,204 agents · 88% · 1.1×`. */
export function goalSummary(goal: PerimeterGoal): string {
  const parts = [formatAgents(goal.agents.total), formatHealth(goal.health)];
  if (goal.multiplier !== null) parts.push(formatMultiplier(goal.multiplier));
  return parts.join(' · ');
}
