import type {
  AssetHealthCategoryInput,
  AssetHealthGoal,
  AssetHealthPayload,
  AssetHealthSection,
} from '../../asset-health-overview/lib/index.js';

/** The kinds of resource group whose calls take a usual time to be answered. */
export type ResourceKind = 'camera' | 'store' | 'system' | 'app' | 'tool' | 'model' | 'human';

/** How long a group's calls take to be answered: the median and the 95th percentile, in seconds (`0.24`, `"240ms"`, `"0.7s"`). */
export interface LatencyInput {
  p50?: number | string;
  p95?: number | string;
}

/**
 * A resource group the goal draws on: the asset health payload's category,
 * with what the burst reads besides — what kind of group it is, so its calls
 * are answered in its usual time, and the figures its tip gives.
 */
export interface GoalBurstCategoryInput extends AssetHealthCategoryInput {
  /** `camera`, `store`, `system`, `app`, `tool`, `model` or `human`: picks the usual answer time and names the assets. Alias: `type`. Read from the name when omitted. */
  kind?: string;
  type?: string;
  /** The answer time, when it is not the kind's usual. */
  latency?: LatencyInput | null;
  /** Bytes a minute the goal's calls move. Alias: `bpm`. */
  bytes?: number | string;
  bpm?: number | string;
  /** How many other goals draw on the group. */
  sharedWith?: number | string;
}

/** The asset health payload — the goal and the groups it draws on — and how many resource groups the fleet has in all. */
export interface GoalBurstPayload extends Omit<AssetHealthPayload, 'categories' | 'data'> {
  categories?: GoalBurstCategoryInput[];
  /** WidgetItem rows: one group per row. */
  data?: GoalBurstCategoryInput[];
  /** Resource groups across the fleet, for the map's corner: `5 of 21 resource groups`. */
  resourceGroupTotal?: number | string;
}

/** A resource group as the burst draws it: its section of the asset health model, and how its calls are answered. */
export interface BurstGroup {
  section: AssetHealthSection;
  kind: ResourceKind | null;
  /** Seconds: the median call, and nineteen in twenty. */
  latency: { p50: number; p95: number };
  bytes: number | null;
  sharedWith: number | null;
}

export interface GoalBurstModel {
  title: string;
  goal: AssetHealthGoal;
  groups: BurstGroup[];
  /** Resource groups across the fleet: at least those drawn. */
  groupTotal: number;
  empty: boolean;
}
