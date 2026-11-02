import type { ChartTooltipContent, ChartTooltipRow } from '../../../element/chart-tooltip-portal.js';
import {
  assetCount,
  formatAssetHealthCount as num,
  formatPercent,
  formatShort,
  type AssetHealthGoal,
} from '../../asset-health-overview/lib/index.js';
import { formatSeconds, type BurstSector } from '../lib/index.js';

const row = (label: string, value: string): ChartTooltipRow => ({ label, value });

/** "62% flowing · 31% blocked · 7% awaiting" */
const trafficMix = (sector: BurstSector) => sector.group.section.mix.map((p) => `${formatPercent(p.share)} ${p.state}`).join(' · ');

/** What the pointer reads off the cloud in the middle. */
export function goalTip(goal: AssetHealthGoal): ChartTooltipContent {
  const rows: ChartTooltipRow[] = [];
  if (goal.progress !== null) rows.push(row('Progress', formatPercent(goal.progress)));
  if (goal.burn !== null) rows.push(row('Burn', `${goal.burn.toFixed(1)}× baseline`));
  rows.push(row('Agents', num(goal.total)));
  return {
    title: goal.name,
    body: 'Each dot is one agent of the goal. The ring fills with its progress to target, on a scale with a longer mark every 10%; the spikes out of it are its calls.',
    rows,
  };
}

/** What the pointer reads off a group's sector of the burst. */
export function sectorTip(goal: AssetHealthGoal, sector: BurstSector): ChartTooltipContent {
  const { section: s, bytes, sharedWith } = sector.group;
  const held = s.crew.held;
  const body =
    held > 0
      ? `${num(held)} of ${goal.name}’s agents are held here: their calls run out to the asset that stops them. Click to pick the sector out.`
      : s.health === 'degraded'
        ? `Some of ${goal.name}’s calls here are slowed or stopped; no agent is held. Click to pick the sector out.`
        : `A resource group ${goal.name} draws on. Its calls here are answered. Click to pick the sector out.`;
  const rows: ChartTooltipRow[] = [];
  if (s.calls !== null) rows.push(row('Calls', `${formatShort(s.calls)} a minute · ${formatPercent(s.share)} of the goal’s`));
  rows.push(row('Answered', sector.p95 === null ? 'none' : `95% within ${formatSeconds(sector.p95)}`));
  if (bytes !== null) rows.push(row('Volume', `${formatShort(bytes)}B a minute`));
  rows.push(row('Traffic', trafficMix(sector)));
  if (s.rules.length) rows.push(row('Rules on it', s.rules.join(' · ')));
  if (sharedWith !== null)
    rows.push(row('Shared with', sharedWith === 0 ? 'no other goal' : `${num(sharedWith)} other ${sharedWith === 1 ? 'goal' : 'goals'}`));
  return { title: `${s.name} · ${assetCount(s)}`, body, rows };
}
