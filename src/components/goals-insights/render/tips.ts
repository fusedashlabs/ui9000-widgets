import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import { formatAssetHealthCount as num, formatPercent } from '../../asset-health-overview/lib/format.js';
import { CYCLES, cycleSpan } from '../lib/geometry.js';
import type { Claim, Evidence, GoalsInsightsModel, InsightsGoal } from '../lib/types.js';

const row = (label: string, value: string): ChartTooltipRow => ({ label, value });

export const plural = (n: number, word: string) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  supporting: 'Supporting',
  contradicting: 'Contradicting',
  disputed: 'Disputed',
  unverified: 'Unverified',
};

/** "26m ago", "5h 12m ago", "2d 4h ago". */
export function ageWord(hours: number): string {
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  if (hours < 24) return `${Math.floor(hours)}h ${String(minutes % 60).padStart(2, '0')}m ago`;
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h ago`;
}

/** The word a claim's state takes. Contradicting claims are pinned: kept in view, never averaged away. */
function stateWord(c: Claim): string {
  if (c.state === 'disputed') return 'Disputed';
  if (c.polarity === 'contradicting') return 'Pinned';
  return { new: 'New', open: 'Open', corroborated: 'Corroborated', accepted: 'Accepted' }[c.state];
}

const span = (cycle: number) => {
  const [a, b] = cycleSpan(cycle);
  return a === 0 ? `last ${b}h` : `${a}–${b}h ago`;
};

export function ringTip(cycle: number): ChartTooltipContent {
  return {
    title: `Time cycle ${cycle + 1} of ${CYCLES} · ${span(cycle)}`,
    body: 'When the claims on this ring were filed. Rings near the top are the most recent; the oldest step back in the tail.',
    rows: [],
  };
}

export function timeTip(cycle: number): ChartTooltipContent {
  const [a, b] = cycleSpan(cycle);
  return {
    title: cycle === 0 ? 'Now' : `${a} hours ago`,
    body: `Claims on this ring were filed ${cycle === 0 ? `in the last ${b} hours` : `${a} to ${b} hours ago`}. Higher rings are more recent; lower rings are older.`,
    rows: [row('When', span(cycle)), row('Cycle', `${cycle + 1} of ${CYCLES}`)],
  };
}

const goalName = (model: GoalsInsightsModel, id: string) => [model.goal, ...model.connected].find((g) => g.id === id)?.name ?? id;

export function claimTip(model: GoalsInsightsModel, c: Claim): ChartTooltipContent {
  const rows: ChartTooltipRow[] = [row('Filed under', goalName(model, c.goal))];
  if (c.also.length) rows.push(row('Bears on', c.also.map((id) => goalName(model, id)).join(' · ')));
  rows.push(row('Filed', ageWord(c.age)), row('Sources', `${num(c.sources)} · ${plural(c.records, 'record')}`), row('State', stateWord(c)));
  if (c.asset) rows.push(row('About', c.asset));
  if (c.agent) rows.push(row('Agent', c.agent));
  return { title: `${c.id} · ${EVIDENCE_LABEL[c.evidence]}`, body: `${c.text} — ${plural(c.sources, 'source')}. Click to pick it out.`, rows };
}

export function mainGoalTip(goal: InsightsGoal, against: number): ChartTooltipContent {
  const rows: ChartTooltipRow[] = [];
  if (goal.confidence !== null) rows.push(row('Confidence', formatPercent(goal.confidence)));
  rows.push(row('Against', plural(against, 'claim')), row('Agents', num(goal.agents.total)));
  if (goal.held) rows.push(row('Held', num(goal.held)));
  return { title: goal.name, body: 'The main goal of this column: its agents in the sphere, its confidence lit on the ring and its scale.', rows };
}

export function connectedGoalTip(main: InsightsGoal, goal: InsightsGoal, shared: number): ChartTooltipContent {
  const rows: ChartTooltipRow[] = [];
  if (goal.priority) rows.push(row('Priority', goal.priority));
  if (goal.confidence !== null) rows.push(row('Confidence', formatPercent(goal.confidence)));
  rows.push(row('Claims', `${num(goal.claims)} filed under it`), row('Shared', plural(shared, 'claim')));
  return {
    title: `Connected goal · ${goal.name}`,
    body: `Shares evidence with ${main.name}. The lines show which claims bear on it. Click to pick out what it shares.`,
    rows,
  };
}
