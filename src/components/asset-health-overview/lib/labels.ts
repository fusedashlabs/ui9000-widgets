/**
 * Where the labels of the arena's sections go. The arena keeps the middle of
 * the stage, so its labels stand in a column on either side of it: a section
 * takes the side it is on and, in that column, a place as near its height as
 * the labels above and below allow. A hairline leads from the section's wall
 * to the label's spine.
 *
 * Positions are in design px; `u` is design px per screen px, so a label
 * keeps one size on screen. Places are chosen for the view as turned and
 * kept while it only drifts; a label that changes sides fades out where it
 * was while it fades in where it goes, and then stays put a while. Within its
 * column a label slides to a new height rather than stepping there.
 */

/** Anatomy of a label, in screen px. */
export const LABEL = {
  /** Its head: the category's name and state, and what the goal has of it. */
  head: 36,
  /** From the head to the readout, and the readout itself. */
  readout: 41,
  /** A line of trouble under the readout, and the room before the first. */
  trouble: 20,
  troubleGap: 9,
  /** Between two labels in a column. */
  gap: 18,
  /** From the spine to the text. */
  pad: 11,
  /** The level stretch of the leader, before the spine. */
  run: 14,
  /** Label width, full and compact. */
  width: 216,
  compactWidth: 136,
  /** From the arena's edge to the spine: past where the leaders start, with a run to spare — a shorter one when compact. */
  leader: 58,
  compactLeader: 44,
  /** Kept clear at the top and foot of the stage. */
  margin: 14,
} as const;

/** Height of a label on screen: its head, its readout unless compact, and a line per trouble. */
export const labelHeight = (troubles: number, compact: boolean) =>
  compact ? LABEL.head : LABEL.head + LABEL.readout + (troubles ? LABEL.troubleGap + troubles * LABEL.trouble : 0);

export interface LabelSpec {
  id: string;
  /** Where its leader starts: just outside its section's wall, as the view is turned. */
  x: number;
  y: number;
  /** Height on screen. */
  height: number;
}

export interface PlacedLabel {
  id: string;
  /** 1 = right of the arena, −1 = left. */
  side: 1 | -1;
  /** The spine. */
  hx: number;
  y0: number;
  y1: number;
  /** How much of it shows, 0–1. */
  fade: number;
  /** The place it has just left, fading out, while the change lasts. */
  leaving?: PlacedLabel;
}

export interface LabelFrame {
  /** The arena's middle, and where the two columns' spines stand. */
  centre: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A section whose middle is this close to the arena's (screen px) keeps the side its label has. */
const DEAD = 34;
const FADE_MS = 320;
const DWELL_MS = 900;
/** A label slides to a new height in its column over about this long, rather than stepping there. */
const SLIDE_MS = 120;

/** One column: labels as near their sections as they fit, top to bottom. */
function column(specs: LabelSpec[], frame: LabelFrame, u: number): Map<string, number> {
  const order = [...specs].sort((a, b) => a.y - b.y);
  const want = order.map((s) => s.y - (LABEL.head / 2) * u);
  const tops = [...want];
  const settle = () => {
    for (let i = 1; i < tops.length; i++) tops[i] = Math.max(tops[i]!, tops[i - 1]! + (order[i - 1]!.height + LABEL.gap) * u);
  };
  settle();
  // pushed apart, the column sits back over its sections as a whole
  const drift = tops.reduce((sum, top, i) => sum + top - want[i]!, 0) / (tops.length || 1);
  for (let i = 0; i < tops.length; i++) tops[i]! -= drift;
  // …and keeps inside the stage
  const last = tops.length - 1;
  const over = last >= 0 ? tops[last]! + order[last]!.height * u - (frame.bottom - LABEL.margin * u) : 0;
  if (over > 0) for (let i = 0; i < tops.length; i++) tops[i]! -= over;
  if (tops.length && tops[0]! < frame.top + LABEL.margin * u) {
    tops[0] = frame.top + LABEL.margin * u;
    settle();
  }
  return new Map(order.map((s, i) => [s.id, tops[i]!]));
}

export type LabelLayout = (specs: LabelSpec[], frame: LabelFrame, u: number, hold: string, animate: boolean) => PlacedLabel[];

/**
 * A layout that remembers its labels' sides and places: while `hold` stays
 * the same, the places chosen last are kept.
 */
export function createLabelLayout(): LabelLayout {
  const sides = new Map<string, 1 | -1>();
  const placed = new Map<string, PlacedLabel>();
  const moves = new Map<string, { from: PlacedLabel; at: number }>();
  /** Where each label is drawn now, on its way to where it was placed. */
  const drawn = new Map<string, { y0: number; side: 1 | -1; at: number }>();
  let chosenFor = '';

  return (specs, frame, u, hold, animate) => {
    const now = performance.now();
    const fresh = hold !== chosenFor || !specs.every((s) => placed.has(s.id));
    if (fresh) {
      chosenFor = hold;
      const side = new Map<string, 1 | -1>();
      for (const spec of specs) {
        const before = sides.get(spec.id);
        const off = (spec.x - frame.centre) / u;
        const lately = moves.get(spec.id);
        const keep = before && (Math.abs(off) < DEAD || (lately && now - lately.at < DWELL_MS && Math.abs(off) < DEAD * 3));
        side.set(spec.id, keep ? before : off >= 0 ? 1 : -1);
      }
      for (const s of [1, -1] as const) {
        const tops = column(
          specs.filter((spec) => side.get(spec.id) === s),
          frame,
          u,
        );
        for (const [id, y0] of tops) {
          const spec = specs.find((x) => x.id === id)!;
          const next: PlacedLabel = { id, side: s, hx: s > 0 ? frame.right : frame.left, y0, y1: y0 + spec.height * u, fade: 1 };
          const before = placed.get(id);
          if (before && before.side !== s) moves.set(id, { from: before, at: now });
          sides.set(id, s);
          placed.set(id, next);
        }
      }
    }
    return specs.map((spec) => {
      const target = placed.get(spec.id)!;
      // within its column a label slides to its place; changing sides it does not slide across the arena, it fades
      const before = drawn.get(spec.id);
      let y0 = target.y0;
      if (animate && before && before.side === target.side) {
        const step = 1 - Math.exp(-Math.min(64, now - before.at) / SLIDE_MS);
        y0 = Math.abs(target.y0 - before.y0) < 0.4 * u ? target.y0 : before.y0 + (target.y0 - before.y0) * step;
      }
      drawn.set(spec.id, { y0, side: target.side, at: now });
      const label: PlacedLabel = { ...target, y0, y1: y0 + (target.y1 - target.y0) };
      const move = moves.get(spec.id);
      const t = move && animate ? (now - move.at) / FADE_MS : 1;
      if (!move || t >= 1) return label;
      const shown = t * t * (3 - 2 * t);
      // the old place clears in half the time, before a neighbour slides into it
      return { ...label, fade: shown, leaving: { ...move.from, fade: Math.max(0, 1 - 2 * t) } };
    });
  };
}

/**
 * The leader from a section's anchor to its label: off on a diagonal to the
 * height of the label's head, then level to the spine.
 */
export function leaderPath(ax: number, ay: number, label: PlacedLabel, u: number): string {
  const hy = label.y0 + (LABEL.head / 2) * u;
  const reach = Math.max(0, Math.abs(label.hx - ax) - LABEL.run * u);
  const ex = ax + label.side * Math.min(Math.abs(hy - ay), reach);
  return `M${ax.toFixed(1)} ${ay.toFixed(1)}L${ex.toFixed(1)} ${hy.toFixed(1)}L${label.hx.toFixed(1)} ${hy.toFixed(1)}`;
}
