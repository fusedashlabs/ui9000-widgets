import type { SimulationNodeDatum } from 'd3-force';

import type { NetworkNode } from './types.js';

/** A node the force layout moves. */
export type SimNode = NetworkNode & SimulationNodeDatum;
