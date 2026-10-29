/** What holds a goal's agents on a category: they wait (`awaiting`), are stopped (`blocked`) or fail there. */
export type HoldState = 'awaiting' | 'blocked' | 'failed';

/** What stops or slows the goal's work on one asset. `slowed` holds no agent. */
export type TroubleState = HoldState | 'slowed';

/**
 * The goal's traffic with a category, by what becomes of it: `flowing` gets
 * through, `throttled` is slowed, and the rest is held in a state.
 */
export type FlowState = 'flowing' | 'throttled' | HoldState;

/**
 * How the goal fares with a category — its own experience of it, not the
 * category's health overall: agents are held there, some of its traffic is
 * slowed, or all of it flows.
 */
export type SectionHealth = 'held' | 'degraded' | 'clean';

/** The goal's standing, as its status dot shows it. */
export type GoalTone = 'ok' | 'warn' | 'blocked';

/** An asset with a problem: lit in its cell, with a beam on it and a line in its category's label. */
export interface AssetHealthProblemInput {
  name?: string;
  /** Asset kind, e.g. `DATABASE`. Shown in its tip. */
  type?: string;
  /** What is wrong, e.g. `writes blocked by R-047`. */
  why?: string;
  /** Where it lives, e.g. `eu-west-1 → us-east-1`. Alias: `where`. */
  loc?: string;
  where?: string;
  /**
   * `blocked`, `failed`, `awaiting` or `slowed`. Free text maps: degrad / warn /
   * slow / throttl / elevat → slowed; wait / pending → awaiting; impaired, error,
   * down → failed. Alias: `state`.
   */
  sev?: string;
  state?: string;
  /** Agents of the goal it holds. */
  agents?: number | string;
  /** Minutes since it began. */
  since?: number | string;
  /** The rule behind it, e.g. `R-047`. */
  rule?: string;
}

/** One 24-hour bar of a category's wall: the goal's calls in that stretch, and the share of them held up. */
export interface AssetHealthDayInput {
  calls?: number | string;
  requests?: number | string;
  /** Share of the calls that did not get through, 0–1 (or a percent). Alias: `heldUp`. */
  away?: number | string;
  heldUp?: number | string;
}

/** Shares of the goal's traffic with a category; normalized, so counts work as well as fractions. */
export interface AssetHealthTrafficInput {
  flowing?: number | string;
  throttled?: number | string;
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
}

export interface AssetHealthCategoryInput {
  id?: string;
  name?: string;
  category?: string;
  label?: string;
  /** What one of its assets is called, plural (`systems of record`), and singular. Default `assets` / `asset`. */
  unit?: string;
  unitOne?: string;
  /** Assets of the category the goal works with. Defaults to healthy + degraded + failing, else what is listed. */
  total?: number | string;
  /** The category's health overall, for its tip. */
  healthy?: number | string;
  degraded?: number | string;
  failing?: number | string;
  failed_assets?: number | string;
  /** Names of its assets, shown in each cell's tip. */
  items?: Array<string | number>;
  problems?: AssetHealthProblemInput[];
  /**
   * The goal's agents whose work is with this category right now, the held
   * among them. Defaults to the goal's working agents, shared out by calls
   * (else by assets). Not `agents`: on a WidgetItem row that is the goal's total.
   */
  crew?: number | string;
  /** WidgetItem goal columns, read when the payload sends no `goal`. */
  agents?: number | string;
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
  /** Agents of the goal held here. Defaults to the agents its problems hold. */
  held?: number | string;
  /** The state they are held in. Defaults to that of the problems holding most of them. */
  hold?: string;
  /** Agents at work here past their token budget. */
  overBudget?: number | string;
  /** Calls a minute the goal makes to it. Alias: `cpm`. */
  calls?: number | string;
  cpm?: number | string;
  /** The traffic's mix. Without one, the share held up is `heldUp`, in the hold's colour. */
  traffic?: AssetHealthTrafficInput | null;
  /** Share of the goal's traffic here that does not get through, 0–1 (or a percent). */
  heldUp?: number | string;
  /** Rules acting on the traffic. */
  rules?: string[];
  /** The goal's last 24 hours with it, oldest first, in equal stretches — any number of them. Omitted, the wall stands empty. */
  day?: Array<AssetHealthDayInput | number> | null;
}

export interface AssetHealthGoalInput {
  id?: string;
  /** Short reference shown under the title, e.g. `G-007`. Defaults to `id`. */
  code?: string;
  name?: string;
  /** Agents on the goal. Defaults to the states' sum. */
  total?: number | string;
  working?: number | string;
  idle?: number | string;
  /** Agents waiting on a person or a slow dependency. */
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
  overBudget?: number | string;
  /** Progress to target: `0.41`, `41` or `"41%"`. Fills the ring in the middle. */
  progress?: number | string;
  /** Burn against baseline, e.g. `4.2`. */
  burn?: number | string;
  /** `on track`, `at risk` or `blocked` (and aliases). Omitted, no status is shown. */
  status?: string;
}

export interface AssetHealthPayload {
  chartType?: string;
  name?: string;
  title?: string;
  description?: string;
  goal?: AssetHealthGoalInput;
  /** Alias for `goal`. */
  agents?: AssetHealthGoalInput;
  categories?: AssetHealthCategoryInput[];
  /**
   * WidgetItem rows: one category per row. Goal columns (`agents`, `awaiting`,
   * `blocked`, `failed`) on a row are read as the goal's when no `goal` is sent.
   */
  data?: AssetHealthCategoryInput[];
}

export interface AssetHealthGoal {
  id: string;
  /** Empty when the payload gives none. */
  code: string;
  name: string;
  total: number;
  working: number;
  idle: number;
  awaiting: number;
  blocked: number;
  failed: number;
  overBudget: number;
  /** Awaiting, blocked, failed and over budget. */
  held: number;
  /** 0–1, or null when not sent: the ring then stays unlit. */
  progress: number | null;
  burn: number | null;
  status: { label: string; tone: GoalTone } | null;
}

export interface AssetHealthTrouble {
  key: string;
  asset: string;
  type: string;
  /** Which of its category's cells it stands on. */
  tick: number;
  where: string;
  /** What is wrong, lower case. */
  why: string;
  state: TroubleState;
  /** Agents of the goal held on it; none when its traffic is only slowed. */
  agents: number;
  /** Minutes since it began. */
  since: number | null;
  rule: string;
}

export interface AssetHealthDayBin {
  calls: number;
  away: number;
}

/** One category as the goal works with it: a section of the arena. */
export interface AssetHealthSection {
  id: string;
  name: string;
  unit: [one: string, many: string];
  /** Assets the goal works with here: one cell each. */
  assets: number;
  /** The assets known by name, and the cell each stands on. */
  named: { name: string; tick: number }[];
  troubles: AssetHealthTrouble[];
  /** The goal's agents whose work is with this category: at work, at work past their budget, and held here. */
  crew: { working: number; overBudget: number; held: number };
  hold: HoldState | null;
  health: SectionHealth;
  /** Calls a minute, or null when not sent. */
  calls: number | null;
  /** Share of the goal's calls that come here, 0–1; 0 when calls are not sent. */
  share: number;
  /** Share of its traffic here that does not flow, 0–1. */
  slowed: number;
  /** The gate, piece by piece, in draw order. Shares add up to 1. */
  mix: { state: FlowState; share: number }[];
  rules: string[];
  /** The category overall, when sent. */
  whole: { healthy: number; degraded: number; failing: number } | null;
  /** The goal's last 24 hours here, oldest first; empty when not sent. */
  day: AssetHealthDayBin[];
}

export interface AssetHealthModel {
  title: string;
  goal: AssetHealthGoal;
  sections: AssetHealthSection[];
  empty: boolean;
}
