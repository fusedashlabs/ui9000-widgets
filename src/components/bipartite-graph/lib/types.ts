import type {
  GoalsPerimeterPayload,
  HoldState,
  PerimeterGoal,
  ResourceGroup,
  SatelliteHealth,
} from '../../goals-perimeter/lib/index.js';

/**
 * A resource group as the fleet knows it, whichever goals draw on it: what it
 * is, how many of it there are and how they stand. Matched to the goals'
 * groups by name (or kind, where a group has no name), as the goals perimeter
 * recognises the same group on two goals.
 */
export interface ResourceCatalogInput {
  id?: string;
  name?: string;
  label?: string;
  kind?: string;
  type?: string;
  /** Instances in the group: printed as `31,204 cameras`. */
  count?: number | string;
  /** What one instance is called: `cameras`, or `["system of record", "systems of record"]`. Defaults by kind. */
  unit?: string | [string, string];
  /** The group as a whole: instances healthy, degraded and impaired. Alias of healthy: ok. */
  healthy?: number | string;
  ok?: number | string;
  degraded?: number | string;
  impaired?: number | string;
}

/**
 * The goals perimeter's payload — goals, each with the resource groups it
 * draws on — and, optionally, the catalog of those groups and how many the
 * fleet has in all.
 */
export interface BipartiteGraphPayload extends GoalsPerimeterPayload {
  /** The fleet's resource groups. Only the ones some goal draws on are drawn. Alias: resources. */
  resourceGroups?: ResourceCatalogInput[] | null;
  resources?: ResourceCatalogInput[] | null;
  /** Resource groups across the fleet, for the corner's `7 of 21`. Defaults to the catalog's length. */
  resourceGroupTotal?: number | string;
}

/** A resource group in the right-hand column. */
export interface BipartiteResource {
  /** The goals' `shareKey` for it. */
  key: string;
  name: string;
  kind: string;
  count: number | null;
  /** `[one, many]`, or null for a group whose instances have no name. */
  unit: [string, string] | null;
  healthy: number | null;
  degraded: number | null;
  impaired: number | null;
}

/** A goal's traffic with one resource group: one ribbon. */
export interface Dependency {
  /** `goalId→resourceKey`. */
  key: string;
  goal: PerimeterGoal;
  resource: BipartiteResource;
  /** The goal's own entry for the group. */
  group: ResourceGroup;
  /** How the goal fares there: its agents held, some traffic slowed, or all of it flowing. */
  health: SatelliteHealth;
  hold: HoldState | null;
  /** Agents of the goal held there. */
  held: number;
  /** Calls a minute: the ribbon's width. */
  calls: number;
}

/** What the goals that draw on a group meet there, taken together. */
export interface ResourceStanding {
  health: SatelliteHealth;
  /** The worst hold among them. */
  hold: HoldState | null;
  held: number;
  goals: number;
  calls: number;
}

export interface BipartiteGraphModel {
  title: string;
  goals: PerimeterGoal[];
  /** The groups some goal draws on, in the catalog's order, then in the order the goals name them. */
  resources: BipartiteResource[];
  dependencies: Dependency[];
  standing: Map<string, ResourceStanding>;
  /** Resource groups across the fleet: at least those drawn. */
  resourceTotal: number;
  exceptionCount: number;
  empty: boolean;
}
