import type { BoardLayout } from './layout.js';
import { camPose, DEFAULT_CAMERA, PIVOT_X, PIVOT_Y, projector, type Project, type Projected } from './scene.js';
import type {
  ExternalDependency,
  GoalConnection,
  GoalsPerimeterModel,
  HoldState,
  PerimeterGoal,
  ResourceGroup,
} from './types.js';

/**
 * World geometry of the board (design px, 3D). Nothing here is drawn for its
 * own sake: an orbit carries the resource groups a goal draws on, a link
 * joins goals that share one, and a ring's ticks are the scale its progress
 * is read on.
 */

export type Vec3 = [number, number, number];

const TAU = Math.PI * 2;

/** A goal placed in the scene. */
export interface SceneGoal {
  id: string;
  goal: PerimeterGoal;
  x: number;
  y: number;
  z: number;
  r: number;
}

export function sceneGoals(model: GoalsPerimeterModel, layout: BoardLayout): SceneGoal[] {
  return model.goals.flatMap((goal) => {
    const p = layout.byId.get(goal.id);
    return p ? [{ id: goal.id, goal, x: p.x, y: p.y, z: p.z, r: p.r }] : [];
  });
}

const HOLDS = new Set<string>(['awaiting', 'blocked', 'failed']);
const holdOf = (group: ResourceGroup | undefined): HoldState | null =>
  group && HOLDS.has(group.state) ? (group.state as HoldState) : null;

/**
 * The same hold at both ends of a link: one trouble in two goals, and the
 * line between them says so. Two groups that each explain their hold must
 * explain it the same way.
 */
function sharedHold(a: ResourceGroup | undefined, b: ResourceGroup | undefined): HoldState | null {
  const ha = holdOf(a);
  if (!ha || ha !== holdOf(b)) return null;
  if (a!.detail && b!.detail && a!.detail !== b!.detail) return null;
  return ha;
}

const groupOn = (goal: PerimeterGoal, key: string) => goal.resourceGroups.find((g) => g.shareKey === key);

/**
 * The board's links. When the payload joins goals itself, those links are
 * drawn, each through a resource group the two goals share when they share
 * one. When it joins none, each resource group that some goals share is one
 * line through all of them: the shortest tree that joins them, so three
 * goals on a group take two stretches, not three. A group every goal draws
 * on is left unjoined — its line would tie each goal to every other and say
 * nothing.
 */
export function deriveConnections(model: GoalsPerimeterModel, layout: BoardLayout): GoalConnection[] {
  const goals = model.goals;
  const byId = new Map(goals.map((g) => [g.id, g]));
  const users = new Map<string, PerimeterGoal[]>();
  for (const goal of goals)
    for (const group of goal.resourceGroups) {
      const list = users.get(group.shareKey) ?? [];
      if (!list.includes(goal)) list.push(goal);
      users.set(group.shareKey, list);
    }
  const sharedByAll = (key: string) => (users.get(key)?.length ?? 0) === goals.length;

  if (model.connections.length) {
    return model.connections.map((connection) => {
      const a = byId.get(connection.source);
      const b = byId.get(connection.target);
      if (!a || !b) return connection;
      const shared = a.resourceGroups.map((g) => g.shareKey).filter((k) => b.resourceGroups.some((g) => g.shareKey === k));
      // a group only these goals share says more than one every goal uses
      const via = shared.find((k) => !sharedByAll(k)) ?? shared[0] ?? '';
      return { ...connection, via, hold: via ? sharedHold(groupOn(a, via), groupOn(b, via)) : null };
    });
  }

  const at = (g: PerimeterGoal) => layout.byId.get(g.id) ?? { x: 0, y: 0, z: 0 };
  const apart = (a: PerimeterGoal, b: PerimeterGoal) => {
    const p = at(a);
    const q = at(b);
    return Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
  };
  const out: GoalConnection[] = [];
  for (const [key, on] of users) {
    if (on.length < 2 || on.length === goals.length) continue;
    const joined = [on[0]!];
    const rest = on.slice(1);
    while (rest.length) {
      let best: { a: PerimeterGoal; b: PerimeterGoal; d: number } | undefined;
      for (const a of joined) for (const b of rest) if (!best || apart(a, b) < best.d) best = { a, b, d: apart(a, b) };
      const { a, b } = best!;
      const ga = groupOn(a, key);
      out.push({
        id: `${key}:${a.id}|${b.id}`,
        source: a.id,
        target: b.id,
        strands: 1,
        status: 'active',
        label: ga?.name ?? key,
        reason: '',
        impact: '',
        via: key,
        hold: sharedHold(ga, groupOn(b, key)),
      });
      joined.push(b);
      rest.splice(rest.indexOf(b), 1);
    }
  }
  return out;
}

// ── Orbit slots ──────────────────────────────────────────────────

/**
 * Something on a goal's orbit: one of its resource groups, an external
 * dependency, or — for a link through no shared group — the bare point the
 * link leaves from.
 */
export interface OrbitItem {
  key: string;
  group: ResourceGroup | null;
  external: ExternalDependency | null;
}

export interface OrbitSlot extends OrbitItem {
  angle: number;
}

export type Orbits = Record<string, OrbitSlot[]>;

export const groupSlot = (shareKey: string) => `rg:${shareKey}`;
const portSlot = (connectionId: string) => `port:${connectionId}`;

/** A link of the board: a connection, between the slots it leaves from on its goals' orbits. */
export interface SceneLink {
  key: string;
  connection: GoalConnection;
  a: SceneGoal;
  b: SceneGoal;
  aSlot: string;
  bSlot: string;
  /** How far, and which way, the link bows off the straight line between its ends. */
  bow: Vec3;
}

/** How far a link bows off the straight line, as a share of its length. */
const BOW = 0.14;
const BOW_MAX = 90;

/** Bow in the picture plane, away from the middle of the field, so links leave the centre clear. */
function bowOf(a: SceneGoal, b: SceneGoal): Vec3 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const flat = Math.hypot(dx, dy) || 1;
  let nx = -dy / flat;
  let ny = dx / flat;
  const ox = (a.x + b.x) / 2 - PIVOT_X;
  const oy = (a.y + b.y) / 2 - PIVOT_Y;
  const outward = Math.hypot(ox, oy) < 70 ? -ny : nx * ox + ny * oy;
  if (outward < 0) {
    nx = -nx;
    ny = -ny;
  }
  const bow = Math.min(BOW_MAX, Math.hypot(dx, dy, b.z - a.z) * BOW);
  return [nx * bow, ny * bow, 0];
}

export function sceneLinks(goals: SceneGoal[], connections: GoalConnection[]): SceneLink[] {
  const byId = new Map(goals.map((g) => [g.id, g]));
  return connections.flatMap((connection) => {
    const a = byId.get(connection.source);
    const b = byId.get(connection.target);
    if (!a || !b) return [];
    const slot = connection.via ? groupSlot(connection.via) : portSlot(connection.id);
    return [{ key: connection.id, connection, a, b, aSlot: slot, bSlot: slot, bow: bowOf(a, b) }];
  });
}

/** What sits on each goal's orbit, in order: its resource groups, its external dependencies, then its bare link points. */
export function orbitItems(goals: SceneGoal[], links: SceneLink[], externals: readonly ExternalDependency[]): Record<string, OrbitItem[]> {
  return Object.fromEntries(
    goals.map((g) => {
      const items: OrbitItem[] = [];
      const seen = new Set<string>();
      for (const group of g.goal.resourceGroups) {
        const key = groupSlot(group.shareKey);
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ key, group, external: null });
      }
      for (const external of externals) if (external.goalId === g.id) items.push({ key: `ext:${external.id}`, group: null, external });
      for (const link of links) {
        for (const [goal, key] of [
          [link.a, link.aSlot],
          [link.b, link.bSlot],
        ] as const) {
          if (goal !== g || seen.has(key)) continue;
          seen.add(key);
          items.push({ key, group: null, external: null });
        }
      }
      return [g.id, items];
    }),
  );
}

// ── Links ────────────────────────────────────────────────────────

export const LINK_SAMPLES = 40;

/**
 * A link sampled in world space, so it bends correctly under the camera. It
 * runs between its slots on the two goals' orbits, bowing away from the
 * goals — further when it would otherwise skim one, as seen from the resting
 * camera — so it never runs along a goal's ring. `clear` is the room it keeps
 * from a goal's edge, in design px.
 */
export function linkPoints(link: SceneLink, orbits: Orbits, orbit: number, clear: number, flat: boolean): Vec3[] {
  const { a, b, bow } = link;
  const P = projector(camPose(flat ? '2D' : '3D', DEFAULT_CAMERA));
  const seen = [a, b].map((g) => {
    const c = P(g.x, g.y, g.z);
    return { x: c.x, y: c.y, r: g.r * c.k + clear };
  });
  const end = (g: SceneGoal, key: string): Vec3 => orbitPoint(g, g.r + orbit, orbits[g.id]?.find((s) => s.key === key)?.angle ?? 0, flat);
  const A = end(a, link.aSlot);
  const B = end(b, link.bSlot);
  // which way is away from the two goals; when the line already runs between them evenly, keep the bow's own way
  const awayX = (A[0] + B[0]) / 2 - (a.x + b.x) / 2;
  const awayY = (A[1] + B[1]) / 2 - (a.y + b.y) / 2;
  const flip = Math.hypot(awayX, awayY) > 8 && awayX * bow[0] + awayY * bow[1] < 0 ? -1 : 1;
  let points: Vec3[] = [];
  for (const stretch of [1, 1.7, 2.6, 3.6]) {
    const m: Vec3 = [(A[0] + B[0]) / 2 + bow[0] * flip * stretch, (A[1] + B[1]) / 2 + bow[1] * flip * stretch, (A[2] + B[2]) / 2];
    points = Array.from({ length: LINK_SAMPLES + 1 }, (_, i) => {
      const t = i / LINK_SAMPLES;
      const it = 1 - t;
      return [0, 1, 2].map((c) => it * it * A[c]! + 2 * it * t * m[c]! + t * t * B[c]!) as Vec3;
    });
    // past its own ends, does it keep off both goals?
    const skims = points.some((p, i) => {
      if (i < 4 || i > LINK_SAMPLES - 4) return false;
      const q = P(...p);
      return seen.some((g) => Math.hypot(q.x - g.x, q.y - g.y) < g.r);
    });
    if (!skims) break;
  }
  return points;
}

/** SVG path through a run of projected points. */
export function polyline(points: Projected[], from = 0, to = points.length - 1): string {
  let d = '';
  for (let i = from; i <= to; i++) d += `${i === from ? 'M' : 'L'}${points[i]!.x.toFixed(1)} ${points[i]!.y.toFixed(1)}`;
  return d;
}

// ── Orbit ────────────────────────────────────────────────────────

/**
 * A point on a goal's orbit. In 3D the orbit lies on the goal's equator, so it
 * turns with the camera; a plan view has no equator to see, so it lies flat.
 */
export function orbitPoint(g: Pick<SceneGoal, 'x' | 'y' | 'z'>, radius: number, angle: number, flat: boolean): Vec3 {
  const c = Math.cos(angle) * radius;
  const s = Math.sin(angle) * radius;
  return flat ? [g.x + c, g.y + s, g.z] : [g.x + c, g.y, g.z + s];
}

const ORBIT_SEGMENTS = 72;

/** The orbit as two paths: the half behind the goal and the half in front. */
export function orbitPaths(g: SceneGoal, radius: number, flat: boolean, P: Project): { far: Projected[][]; near: Projected[][] } {
  const centre = P(g.x, g.y, g.z);
  const points = Array.from({ length: ORBIT_SEGMENTS + 1 }, (_, i) => P(...orbitPoint(g, radius, (i / ORBIT_SEGMENTS) * TAU, flat)));
  const paths: { far: Projected[][]; near: Projected[][] } = { far: [], near: [] };
  for (let i = 0; i < ORBIT_SEGMENTS; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    paths[flat || (p.z + q.z) / 2 <= centre.z ? 'near' : 'far'].push([p, q]);
  }
  return paths;
}

/** The least two diamonds on an orbit stand apart, in radians, so their names never touch. */
const APART = 0.62;
/**
 * How far round from a side of the goal its diamonds may stand, in 3D: one or
 * two keep well outside the goal's outline; three reach a little past it.
 */
const SIDE_REACH = { few: 0.4, many: 0.72 };
/** A direction this close to straight up or down, as seen, favours neither side of the goal. */
const AMBIGUOUS = 0.35;

const wrap = (a: number) => a - TAU * Math.floor(a / TAU);
/** The same angle in (−π, π]. */
const signed = (a: number) => {
  const w = wrap(a);
  return w > Math.PI ? w - TAU : w;
};

/** Eases apart angles that stand closer than `APART`; with `limit`, keeps them within ±limit. */
function spread(angles: number[], limit?: number): number[] {
  const order = angles.map((angle, index) => ({ angle, index })).sort((p, q) => p.angle - q.angle);
  for (let pass = 0; pass < 16 && order.length > 1; pass++) {
    for (let i = 0; i < order.length - (limit == null ? 0 : 1); i++) {
      const here = order[i]!;
      const next = order[(i + 1) % order.length]!;
      const gap = limit == null ? wrap(next.angle - here.angle) : next.angle - here.angle;
      if (gap < APART) {
        here.angle -= (APART - gap) / 2;
        next.angle += (APART - gap) / 2;
      }
    }
    if (limit != null) {
      // keep the row within its side, sliding it back as a whole
      const over = Math.max(0, order[order.length - 1]!.angle - limit) - Math.max(0, -limit - order[0]!.angle);
      for (const o of order) o.angle -= over;
    }
  }
  const out = [...angles];
  for (const o of order) out[o.index] = o.angle;
  return out;
}

/**
 * Where each goal's orbit items sit, chosen for how the board reads from the
 * resting camera.
 *
 * In 3D only the two sides of an orbit clear the goal's outline, so that is
 * where its diamonds stand. An item a link leaves from takes the side facing
 * the link's other goal, so its links leave outwards and never cross the
 * goal; the rest take the emptier side. Two on a side stand a step apart; a
 * side takes three. Only a seventh item has to stand in front of the goal,
 * and an eighth behind it.
 *
 * In plan the whole orbit lies outside the goal: a linked item simply faces
 * its partners, and the rest take the clearest of the four plain places.
 */
export function goalOrbits(goals: SceneGoal[], links: SceneLink[], items: Record<string, OrbitItem[]>, flat: boolean): Orbits {
  const rest = camPose(flat ? '2D' : '3D', DEFAULT_CAMERA);
  const P = projector(rest);
  // how much of the orbit's depth shows as height: a flat ellipse in 3D, a full circle in plan
  const tilt = Math.sin(rest.pitch);

  return Object.fromEntries(
    goals.map((g) => {
      const here = P(g.x, g.y, g.z);
      const own = items[g.id] ?? [];
      const linked: { item: OrbitItem; seen: number }[] = [];
      const free: OrbitItem[] = [];
      for (const item of own) {
        const partners = links
          .filter((l) => (l.a === g && l.aSlot === item.key) || (l.b === g && l.bSlot === item.key))
          .map((l) => (l.a === g ? l.b : l.a));
        if (!partners.length) {
          free.push(item);
          continue;
        }
        // towards its partners, as they lie on screen
        let dx = 0;
        let dy = 0;
        for (const partner of partners) {
          const there = P(partner.x, partner.y, partner.z);
          const length = Math.hypot(there.x - here.x, there.y - here.y) || 1;
          dx += (there.x - here.x) / length;
          dy += (there.y - here.y) / length;
        }
        linked.push({ item, seen: flat ? Math.atan2(dy, dx) : Math.atan2(-tilt * dy, dx) });
      }

      const placed: { item: OrbitItem; seen: number }[] = [];
      if (flat) {
        const seen = spread(linked.map((l) => wrap(l.seen)));
        linked.forEach((l, i) => placed.push({ item: l.item, seen: wrap(seen[i]!) }));
        // the plain places: right, left, below, above
        const plain: [seen: number, liking: number][] = [
          [0, 0.5],
          [Math.PI, 0.5],
          [Math.PI / 2, 0.2],
          [-Math.PI / 2, 0],
        ];
        for (const item of free) {
          const room = (seen: number) => Math.min(TAU, ...placed.map((p) => Math.abs(signed(p.seen - seen))));
          let best = { seen: 0, score: -Infinity };
          for (const [seen, liking] of plain) if (room(seen) + liking > best.score) best = { seen, score: room(seen) + liking };
          placed.push({ item, seen: best.seen });
        }
      } else {
        // rows[0] stands at the right of the goal, rows[1] at its left; `want` is how far round from the side's middle
        const rows: { item: OrbitItem; want: number }[][] = [[], []];
        const sideAngle = [0, Math.PI];
        // the side of the goal that faces out of the field, where there is most room
        const outer = here.x >= PIVOT_X ? 0 : 1;
        const emptier = () => (rows[0]!.length === rows[1]!.length ? outer : rows[0]!.length < rows[1]!.length ? 0 : 1);
        for (const l of linked) {
          const facing = Math.cos(l.seen);
          const side = facing > AMBIGUOUS ? 0 : facing < -AMBIGUOUS ? 1 : emptier();
          rows[side]!.push({ item: l.item, want: signed(l.seen - sideAngle[side]!) });
        }
        const overflow: OrbitItem[] = [];
        for (const item of free) {
          if (rows[0]!.length >= 3 && rows[1]!.length >= 3) overflow.push(item);
          else rows[emptier()]!.push({ item, want: 0 });
        }
        rows.forEach((row, side) => {
          const reach = row.length <= 2 ? SIDE_REACH.few : SIDE_REACH.many;
          const off = spread(
            row.map((r) => Math.max(-reach, Math.min(reach, r.want))),
            reach,
          );
          row.forEach((r, i) => placed.push({ item: r.item, seen: wrap(sideAngle[side]! + off[i]!) }));
        });
        // in front of the goal, then behind it
        overflow.forEach((item, i) => placed.push({ item, seen: wrap(i % 2 ? Math.PI / 2 + (i >> 1) * APART : -Math.PI / 2 + (i >> 1) * APART) }));
      }

      // from how it is seen at rest back to an angle on the orbit
      return [g.id, own.map((item): OrbitSlot => ({ ...item, angle: placed.find((p) => p.item === item)!.seen - rest.yaw }))];
    }),
  );
}

// ── Ring ─────────────────────────────────────────────────────────

/** Share of the ring between two ticks, so they sit at least `minGap` apart on screen. */
export function tickStep(circumference: number, minGap = 5.5): number {
  return [0.01, 0.02, 0.05].find((step) => circumference * step >= minGap) ?? 0.1;
}

/**
 * Radial ticks around a ring from `from` to `to` (shares of the circle,
 * clockwise from 12 o'clock). Every tenth of the circle gets a longer tick.
 */
export function ringTicks(cx: number, cy: number, inner: number, minor: number, major: number, step: number, from: number, to: number): string {
  let d = '';
  const first = Math.ceil(from / step - 1e-6);
  const last = Math.floor(to / step + 1e-6);
  for (let i = first; i <= last; i++) {
    const share = i * step;
    if (share >= 0.9999) break;
    const tenth = Math.abs(share * 10 - Math.round(share * 10)) < 1e-6;
    const a = -Math.PI / 2 + share * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const outer = inner + (tenth ? major : minor);
    d += `M${(cx + cos * inner).toFixed(1)} ${(cy + sin * inner).toFixed(1)}L${(cx + cos * outer).toFixed(1)} ${(cy + sin * outer).toFixed(1)}`;
  }
  return d;
}

/** An arc between two shares of a circle, clockwise from 12 o'clock. */
export function ringArc(cx: number, cy: number, r: number, from: number, to: number): string {
  const end = Math.min(to, from + 0.9999);
  const a0 = -Math.PI / 2 + from * Math.PI * 2;
  const a1 = -Math.PI / 2 + end * Math.PI * 2;
  return `M${(cx + r * Math.cos(a0)).toFixed(2)} ${(cy + r * Math.sin(a0)).toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 ${end - from > 0.5 ? 1 : 0} 1 ${(cx + r * Math.cos(a1)).toFixed(2)} ${(cy + r * Math.sin(a1)).toFixed(2)}`;
}
