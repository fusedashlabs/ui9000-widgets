/** `impaired` draws red and counts as failing; `degraded` draws amber. */
export type AssetHealthSeverity = 'impaired' | 'degraded';

/** An asset with a problem. It is drawn as a tall tile with a beam and a callout. */
export interface AssetHealthProblemInput {
  name?: string;
  type?: string;
  /** Short reason, e.g. `writes blocked by R-047`. */
  why?: string;
  /** Where it lives, e.g. `eu-west-1 → us-east-1`. */
  loc?: string;
  /** `impaired` (default) or `degraded`. Free text such as `warning` is mapped. */
  sev?: string;
}

export interface AssetHealthCategoryInput {
  id?: string;
  name?: string;
  category?: string;
  label?: string;
  /** Number of assets in the category. Defaults to what is listed. */
  total?: number | string;
  /** Optional health counts when items / problems are not listed. */
  healthy?: number | string;
  degraded?: number | string;
  failing?: number | string;
  /** Prefer `failing`; `failed_assets` is also accepted by normalize. */
  failed_assets?: number | string;
  /** Names of healthy assets, shown in each tile's tooltip. */
  items?: Array<string | number>;
  problems?: AssetHealthProblemInput[];
  /**
   * Agent columns may sit on a WidgetItem category row. Bare `failed` here
   * means failed agents (not failing assets) — use `failing` / `failed_assets`
   * for asset counts.
   */
  agents_total?: number | string;
  agent_total?: number | string;
  agents?: number | string;
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
  burn?: number | string;
}

export interface AssetHealthGoalInput {
  id?: string;
  name?: string;
  /** Agents working on the goal. */
  total?: number | string;
  /** Agents waiting for input. */
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
  /** Optional; unused for drawing unless the host sends a wall. */
  burn?: number | string;
}

/** One 15-minute slot on the 24h wall. Only drawn when the payload sends a wall. */
export interface AssetHealthWallSlotInput {
  slot?: number | string;
  err?: boolean | string | number;
  error?: boolean | string | number;
  hasError?: boolean | string | number;
  hgt?: number | string;
  height?: number | string;
  reqs?: number | string;
  requests?: number | string;
  nErr?: number | string;
  errors?: number | string;
  src?: AssetHealthProblemInput & { catName?: string };
  source?: AssetHealthProblemInput & { catName?: string };
}

export interface AssetHealthPayload {
  chartType?: string;
  name?: string;
  title?: string;
  description?: string;
  /** Central agent population (Figma / domain object). */
  goal?: AssetHealthGoalInput;
  /** Alias for `goal`. */
  agents?: AssetHealthGoalInput;
  categories?: AssetHealthCategoryInput[];
  /**
   * WidgetItem rows: one category per row, optional agent columns on the row.
   * Same shape FuseDash uses for other charts (`data: any[]`).
   */
  data?: AssetHealthCategoryInput[];
  xAxe?: string | string[];
  yAxe?: string | string[];
  /**
   * Explicit 24h wall. Omit or `[]` when there are no recent errors — the
   * drawing does not invent slots.
   */
  wall?: AssetHealthWallSlotInput[] | null;
  errors?: AssetHealthWallSlotInput[] | null;
}

export interface AssetHealthProblem {
  name: string;
  type: string;
  why: string;
  loc: string;
  sev: AssetHealthSeverity;
}

export interface AssetHealthCategory {
  id: string;
  name: string;
  total: number;
  healthy: number;
  degraded: number;
  failing: number;
  items: string[];
  problems: AssetHealthProblem[];
}

export interface AssetHealthGoal {
  id: string;
  name: string;
  total: number;
  awaiting: number;
  blocked: number;
  failed: number;
  burn: number;
}

/** Normalized wall slot ready for the scene (angle filled in `buildScene`). */
export interface AssetHealthWallSlot {
  slot: number;
  err: boolean;
  hgt: number;
  reqs: number;
  nErr?: number;
  src?: (AssetHealthProblem & { catName: string }) | null;
}

export interface AssetHealthModel {
  goal: AssetHealthGoal;
  categories: AssetHealthCategory[];
  /** Empty when the payload did not send recent errors. */
  wall: AssetHealthWallSlot[];
  empty: boolean;
}
