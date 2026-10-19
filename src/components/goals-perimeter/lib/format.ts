import type { PerimeterGoal, BlockerKind, ExceptionState } from './types.js';

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

/** `3 resource groups`, `1 resource group`. */
export function formatResourceGroups(count: number): string {
  return `${formatCount(count)} resource ${count === 1 ? 'group' : 'groups'}`;
}

const STATE_LABEL: Record<ExceptionState, string> = {
  failed: 'Failed',
  blocked: 'Blocked',
  degraded: 'Degraded',
};

export function exceptionTitle(state: ExceptionState, count: number): string {
  return `${STATE_LABEL[state]} · ${formatAgents(count)}`;
}

const BLOCKER_LABEL: Record<BlockerKind, string> = {
  rule: 'Rule',
  dependency: 'Dependency',
  human: 'Human action',
};

export function formatBlocker(kind: BlockerKind): string {
  return BLOCKER_LABEL[kind];
}

/** Screen-reader sentence for one goal. */
export function goalAriaLabel(goal: PerimeterGoal): string {
  const parts = [`${goal.name}: ${formatAgents(goal.agents.total)}`, `${formatHealth(goal.health)} health`];
  if (goal.multiplier !== null) {
    parts.push(`${formatMultiplier(goal.multiplier)} ${goal.multiplierLabel.toLowerCase()}`);
  }
  if (goal.impure > 0) parts.push(`${formatCount(goal.impure)} impure`);
  parts.push(formatResourceGroups(goal.resourceGroupCount));
  return `${parts.join(', ')}. Open goal.`;
}
