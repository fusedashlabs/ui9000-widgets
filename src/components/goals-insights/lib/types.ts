/** How a goal stands, as the reading under the title and its callout say it. */
export type GoalTone = 'ok' | 'warn' | 'blocked';

/** Whether a claim argues for its goal or against it. */
export type Polarity = 'confirming' | 'contradicting';

/**
 * Where a claim stands: new (filed in the last day, not yet reviewed), open
 * (one source, older), corroborated (2–7 independent sources), accepted (8
 * or more) — or disputed, when another claim says the opposite.
 */
export type ClaimState = 'new' | 'open' | 'corroborated' | 'accepted' | 'disputed';

export type ClaimType = 'gap' | 'observation' | 'correlation' | 'anomaly' | 'recommendation';

/** How a claim reads against its goal — its colour everywhere. */
export type Evidence = 'supporting' | 'contradicting' | 'disputed' | 'unverified';

/** A goal's agents by state, as given. Over budget agents are at work, past 80% of their token budget. */
export interface GoalAgents {
  total: number;
  working: number;
  idle: number;
  awaiting: number;
  blocked: number;
  failed: number;
  overBudget: number;
}

/** A goal as the column draws it: the main one over the apex, or one it shares evidence with beside it. */
export interface InsightsGoal {
  id: string;
  /** Shown in its callout and under the title, e.g. G-014. */
  code: string;
  name: string;
  status: { label: string; tone: GoalTone } | null;
  /** How likely the goal is to hold given its evidence, 0–1; lit on its ring. Null leaves the ring unlit. */
  confidence: number | null;
  priority: string | null;
  agents: GoalAgents;
  /** Agents held: awaiting, blocked, failed and over budget. */
  held: number;
  /** Claims in the column filed under it. */
  claims: number;
}

/** A claim an agent filed, as the column draws it. */
export interface Claim {
  id: string;
  /** The goal it was filed under. */
  goal: string;
  /** Other goals it bears on, of those in the column. */
  also: string[];
  /** What it is about: claims on one subject turn together round the column. */
  theme: string;
  /** The claim itself, as written. */
  text: string;
  type: ClaimType | null;
  polarity: Polarity;
  state: ClaimState;
  /** Independent sources behind it. */
  sources: number;
  /** Evidence records behind it: the larger its diamond. */
  records: number;
  /** How much it moves its goal's confidence, 0–1: the more, the nearer the axis. */
  weight: number;
  /** The agent that filed it, as given. */
  agent: string | null;
  /** Hours since it was filed: the ring it sits on. */
  age: number;
  /** The kind of asset it is about, written beside it when zoomed in. */
  asset: string;
  evidence: Evidence;
  /** Placement round the column, 0–1. */
  seed: number;
}

export interface GoalsInsightsModel {
  empty: boolean;
  title: string;
  goal: InsightsGoal;
  /** The goals it shares evidence with, most shared first: the first stands left of the column, the second right. */
  connected: InsightsGoal[];
  /**
   * The claims in the column: the goal's own and those its connected goals
   * filed that bear on it (`counted` of them), then the connected goals'
   * other claims, drawn faintly.
   */
  claims: Claim[];
  counted: number;
  /**
   * Claims sent that the column does not draw: past its room (the oldest of
   * the connected goals' own go first), filed under a goal it does not draw,
   * or without an age to place them by.
   */
  dropped: number;
}

export interface GoalInput {
  id?: string | number;
  code?: string;
  name?: string;
  title?: string;
  label?: string;
  status?: string;
  confidence?: number | string;
  priority?: string;
  total?: number | string;
  agents?: number | string;
  working?: number | string;
  idle?: number | string;
  awaiting?: number | string;
  blocked?: number | string;
  failed?: number | string;
  overBudget?: number | string;
}

export interface ClaimInput {
  id?: string | number;
  goal?: string | number;
  also?: (string | number)[] | string;
  theme?: string;
  topic?: string;
  claim?: string;
  text?: string;
  type?: string;
  polarity?: string;
  state?: string;
  sources?: number | string;
  records?: number | string;
  weight?: number | string;
  agent?: string;
  age?: number | string;
  ageHours?: number | string;
  asset?: string;
}

export interface GoalsInsightsPayload {
  chartType?: string;
  title?: string;
  name?: string;
  goal?: GoalInput;
  connected?: GoalInput[];
  claims?: ClaimInput[];
}
