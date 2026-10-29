import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import {
  assetCount,
  capitalize,
  crewSize,
  DAY_MINUTES,
  formatAgo,
  formatAssetHealthCount as num,
  formatPercent,
  formatShort,
  TROUBLE_WORD,
  type AssetHealthDayBin,
  type AssetHealthGoal,
  type AssetHealthSection,
  type AssetHealthTrouble,
} from '../lib/index.js';

const row = (label: string, value: string): ChartTooltipRow => ({ label, value });

/** "62% flowing · 31% blocked · 7% awaiting" */
const trafficMix = (section: AssetHealthSection) => section.mix.map((p) => `${formatPercent(p.share)} ${p.state}`).join(' · ');

/** "15 minutes", "2 hours" — how long one bar of a wall stands for. */
const stretch = (bins: number) => {
  const minutes = DAY_MINUTES / bins;
  return minutes < 60 ? `${minutes} minutes` : minutes === 60 ? 'an hour' : `${minutes / 60} hours`;
};

/** What the pointer reads off a category's section. */
export function sectionTip(goal: AssetHealthGoal, s: AssetHealthSection): ChartTooltipContent {
  const held = s.crew.held;
  const body =
    held > 0
      ? `${num(held)} of ${goal.name}’s agents are held at this gate. Click to pick the section out.`
      : s.health === 'degraded'
        ? `Some of ${goal.name}’s traffic here is slowed or stopped; no agent is held. Click to pick the section out.`
        : `A category of assets ${goal.name} works with. Its traffic here flows. Click to pick the section out.`;
  const rows = [row('Agents', `${num(crewSize(s))} working with it${held ? ` · ${num(held)} held` : ''}`)];
  if (s.calls !== null) rows.push(row('Calls', `${formatShort(s.calls)} a minute · ${formatPercent(s.share)} of the goal’s`));
  rows.push(row('Traffic', trafficMix(s)));
  if (s.rules.length) rows.push(row('Rules on it', s.rules.join(' · ')));
  if (s.whole) {
    const { healthy, degraded, failing } = s.whole;
    rows.push(row('Whole category', [`${num(healthy)} healthy`, degraded && `${num(degraded)} degraded`, failing && `${num(failing)} failing`].filter(Boolean).join(' · ')));
  }
  return { title: `${s.name} · ${assetCount(s)}`, body, rows };
}

/** What the pointer reads off an asset in trouble — in the arena and in its category's label. */
export function troubleTip(s: AssetHealthSection, t: AssetHealthTrouble): ChartTooltipContent {
  const why = t.why ? `${capitalize(t.why)}.` : '';
  const rows = [row('Category', s.name)];
  if (t.type) rows.push(row('Kind', t.type));
  if (t.where) rows.push(row('Where', t.where));
  if (t.agents) rows.push(row('Agents held', num(t.agents)));
  if (t.since !== null) rows.push(row('Since', `${formatAgo(t.since)} ago`));
  if (t.rule) rows.push(row('Rule', t.rule));
  return {
    title: `${t.asset} · ${capitalize(TROUBLE_WORD[t.state])}`,
    body: t.agents ? why || undefined : `${why}${why ? ' ' : ''}No agent is held on it.`,
    rows,
  };
}

/** What the pointer reads off a section's wall. */
export function wallTip(s: AssetHealthSection, day: AssetHealthDayBin[]): ChartTooltipContent {
  if (!day.length)
    return {
      title: `${s.name} · the last 24 hours`,
      body: 'The wall carries a bar for each stretch of the goal’s day with this category, once its calls are sent.',
      rows: [],
    };
  const busiest = day.reduce((best, bin, i) => (bin.calls > day[best]!.calls ? i : best), 0);
  const hoursAgo = Math.round(((day.length - 1 - busiest) * DAY_MINUTES) / day.length / 60);
  const rows: ChartTooltipRow[] = [];
  if (s.calls !== null) rows.push(row('Now', `${formatShort(s.calls)} calls a minute`));
  rows.push(row('Busiest', hoursAgo ? `${hoursAgo}h ago` : 'now'));
  rows.push(row('Held up now', formatPercent(s.slowed)));
  for (const t of s.troubles) if (t.since !== null) rows.push(row(t.asset, `since ${formatAgo(t.since)} ago`));
  return {
    title: `${s.name} · the last 24 hours`,
    body: `A bar is ${stretch(day.length)} of this goal’s calls to the category, as tall as there were of them; its top is in colour for the share that was held up. The day runs clockwise and ends at the section’s edge.`,
    rows,
  };
}

/** What the pointer reads off the hub. */
export function hubTip(goal: AssetHealthGoal): ChartTooltipContent {
  const rows: ChartTooltipRow[] = [];
  if (goal.progress !== null) rows.push(row('Progress', formatPercent(goal.progress)));
  if (goal.burn !== null) rows.push(row('Burn', `${goal.burn.toFixed(1)}× baseline`));
  rows.push(row('Agents', num(goal.total)));
  return {
    title: goal.name,
    body:
      goal.progress !== null
        ? 'The ring fills with the goal’s progress to target, clockwise, on a scale with a longer mark every 10%.'
        : 'The ring fills with the goal’s progress to target once it is sent.',
    rows,
  };
}

/** What the pointer reads off the bench round the hub. */
export function benchTip(goal: AssetHealthGoal): ChartTooltipContent {
  return {
    title: `${num(goal.idle)} idle`,
    body: 'Agents of this goal waiting for their next task. They sit round the hub, at no category’s gate.',
    rows: [],
  };
}

/** What the pointer reads off an asset that is well. */
export function assetTip(s: AssetHealthSection, name: string): ChartTooltipContent {
  return { title: name, body: `One of the ${assetCount(s)} this goal works with. Its traffic flows.`, rows: [] };
}
