import { orbitPoint, type OrbitSlot, type SceneGoal } from './cloud.js';
import type { Project } from './scene.js';
import type { ExternalDependency, HoldState, ResourceGroup } from './types.js';

/** Anatomy of a goal's instruments, in screen px beyond the goal's radius. */
export const MARK = {
  /** The progress ring. */
  ring: 9,
  /** The ring's scale starts here and runs outwards. */
  scale: 13,
  minor: 3,
  major: 6.5,
  /** The orbit the resource groups sit on. */
  orbit: 42,
  /** Half-diagonal of a resource group's diamond. */
  diamond: 5,
  /** Corner brackets shown under the pointer. */
  bracket: 31,
} as const;

/**
 * How a goal fares with something on its orbit:
 *   held      agents of the goal are stopped there
 *   degraded  some of its traffic is slowed, but no agent is held
 *   clean     all of its traffic flows
 */
export type SatelliteHealth = 'held' | 'degraded' | 'clean';

/** A diamond on a goal's orbit, as drawn (plot px), with where its name goes. */
export interface Satellite {
  key: string;
  group: ResourceGroup | null;
  external: ExternalDependency | null;
  name: string;
  /** Agents held there, printed after the name; 0 for none. */
  held: number;
  hold: HoldState | null;
  health: SatelliteHealth;
  x: number;
  y: number;
  /** In front of the goal rather than behind it. */
  front: boolean;
  /** Where the name is anchored, and which way it runs. */
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
}

function readSlot(slot: OrbitSlot): Pick<Satellite, 'name' | 'held' | 'hold' | 'health'> | null {
  if (slot.group) {
    const { state } = slot.group;
    const hold = state === 'awaiting' || state === 'blocked' || state === 'failed' ? state : null;
    return {
      name: slot.group.name.toUpperCase(),
      held: hold ? slot.group.held : 0,
      hold,
      health: hold ? 'held' : state === 'degraded' ? 'degraded' : 'clean',
    };
  }
  if (slot.external) {
    const { status, label } = slot.external;
    return {
      name: label.toUpperCase(),
      held: 0,
      hold: status === 'unavailable' ? 'failed' : null,
      health: status === 'unavailable' ? 'held' : status === 'degraded' ? 'degraded' : 'clean',
    };
  }
  // a bare point a link leaves from: no diamond
  return null;
}

/** A goal's orbit items as diamonds, in plot px. Their names are placed by a `SatelliteNamer`. */
export function goalSatellites(
  g: SceneGoal,
  slots: readonly OrbitSlot[],
  P: Project,
  flat: boolean,
  /** Design px per screen px. */
  u: number,
  toScreen: (x: number, y: number) => { x: number; y: number },
): Satellite[] {
  const centre = P(g.x, g.y, g.z);
  const radius = g.r + MARK.orbit * u;
  return slots.flatMap((slot) => {
    const read = readSlot(slot);
    if (!read) return [];
    const q = P(...orbitPoint(g, radius, slot.angle, flat));
    const at = toScreen(q.x, q.y);
    return [
      {
        key: slot.key,
        group: slot.group,
        external: slot.external,
        ...read,
        x: at.x,
        y: at.y,
        front: flat || q.z <= centre.z,
        labelX: at.x,
        labelY: at.y,
        anchor: 'start' as const,
      },
    ];
  });
}

/** A diamond's name as written: the group, and how many agents are held on it. */
export const satelliteText = (s: Pick<Satellite, 'name' | 'held'>) => (s.held ? `${s.name} ${s.held}` : s.name);

/** Width of a name in 10px mono, plot px. */
const nameWidth = (s: Satellite) => satelliteText(s).length * 5.6;

const nameBox = (x: number, y: number, anchor: Satellite['anchor'], width: number) => {
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  return { x0, x1: x0 + width, y0: y - 6, y1: y + 6 };
};

/** The eight places a name can take around its diamond: [x, y] directions and how much each is liked. */
const LABEL_PLACES: [x: number, y: number, liking: number][] = [
  [1, 0, 0.3],
  [-1, 0, 0.3],
  [0.74, -0.67, 0.12],
  [0.74, 0.67, 0.12],
  [-0.74, -0.67, 0.12],
  [-0.74, 0.67, 0.12],
  [0, -1, 0],
  [0, 1, 0],
];

export interface NamedGoal {
  id: string;
  /** Centre and radius as drawn, plot px. */
  x: number;
  y: number;
  r: number;
  satellites: Satellite[];
}

/**
 * Places every diamond's name, for the whole board at once. A name takes the
 * place around its diamond that is clearest of the links leaving it, of the
 * way back to its goal and of the diamonds next to it — beside the diamond
 * where it can, above or below otherwise — and never one that would land on
 * another name, another diamond or a goal's ring. While `hold` stays the
 * same (the view has only drifted), names keep the places chosen last.
 */
export function createSatelliteNamer() {
  const namedAt = new Map<string, number>();
  let namedFor = '';

  const put = (s: Satellite, [px, py]: readonly [number, number, number]) => {
    const reach = MARK.diamond + (py === 0 ? 6 : 8);
    s.labelX = s.x + px * reach;
    s.labelY = s.y + py * (reach + 2);
    s.anchor = px > 0.3 ? 'start' : px < -0.3 ? 'end' : 'middle';
  };

  return (
    goals: NamedGoal[],
    /** Which ways links leave each diamond, by goal and slot, as unit vectors on screen. */
    leaving: Record<string, Record<string, { x: number; y: number }[]> | undefined>,
    hold = '',
  ): void => {
    if (hold && hold === namedFor) {
      for (const g of goals) for (const s of g.satellites) put(s, LABEL_PLACES[namedAt.get(`${g.id}:${s.key}`) ?? 0]!);
      return;
    }
    namedFor = hold;
    const d = MARK.diamond;
    const all = goals.flatMap((g) => g.satellites.map((s) => ({ g, s })));
    // what a name may not land on: every diamond, and each name as it is placed
    const taken = all.map(({ s }) => ({ x0: s.x - d, x1: s.x + d, y0: s.y - d, y1: s.y + d, of: s }));
    type Box = { x0: number; x1: number; y0: number; y1: number };
    const hits = (a: Box, b: Box) => a.x0 < b.x1 + 2 && a.x1 > b.x0 - 2 && a.y0 < b.y1 + 2 && a.y1 > b.y0 - 2;

    // the most hemmed-in diamonds choose first: those with links, then the rest
    const order = [...all].sort((p, q) => (leaving[q.g.id]?.[q.s.key]?.length ?? 0) - (leaving[p.g.id]?.[p.s.key]?.length ?? 0));
    for (const { g, s } of order) {
      const inward = Math.hypot(g.x - s.x, g.y - s.y) || 1;
      const avoid = [
        ...(leaving[g.id]?.[s.key] ?? []),
        { x: (g.x - s.x) / inward, y: (g.y - s.y) / inward },
        // the diamonds close by, of any goal
        ...all.flatMap(({ s: other }) => {
          const away = Math.hypot(other.x - s.x, other.y - s.y);
          return other !== s && away < 64 ? [{ x: (other.x - s.x) / away, y: (other.y - s.y) / away }] : [];
        }),
      ];
      const width = nameWidth(s);
      let best: { x: number; y: number; anchor: Satellite['anchor']; score: number; place: number } | undefined;
      for (const [place, [px, py, liking]] of LABEL_PLACES.entries()) {
        const reach = MARK.diamond + (py === 0 ? 6 : 8);
        const x = s.x + px * reach;
        const y = s.y + py * (reach + 2);
        const anchor: Satellite['anchor'] = px > 0.3 ? 'start' : px < -0.3 ? 'end' : 'middle';
        const box = nameBox(x, y, anchor, width);
        let score = Math.min(...avoid.map((v) => Math.acos(Math.max(-1, Math.min(1, v.x * px + v.y * py))))) + liking;
        if (taken.some((t) => t.of !== s && hits(box, t))) score -= 10;
        // a name over a goal's ring or its agents is the last resort
        for (const goal of goals) {
          const nx = Math.max(box.x0, Math.min(goal.x, box.x1));
          const ny = Math.max(box.y0, Math.min(goal.y, box.y1));
          if (Math.hypot(nx - goal.x, ny - goal.y) < goal.r + MARK.scale + MARK.major) score -= 3;
        }
        if (!best || score > best.score) best = { x, y, anchor, score, place };
      }
      namedAt.set(`${g.id}:${s.key}`, best!.place);
      s.labelX = best!.x;
      s.labelY = best!.y;
      s.anchor = best!.anchor;
      taken.push({ ...nameBox(best!.x, best!.y, best!.anchor, width), of: s });
    }
  };
}

/** Approximate box of a diamond and its name, for keeping callouts off them. */
export function satelliteRect(s: Satellite) {
  const box = nameBox(s.labelX, s.labelY, s.anchor, nameWidth(s));
  const d = MARK.diamond;
  return { x0: Math.min(box.x0, s.x - d), x1: Math.max(box.x1, s.x + d), y0: Math.min(box.y0 - 1, s.y - d), y1: Math.max(box.y1 + 1, s.y + d) };
}
