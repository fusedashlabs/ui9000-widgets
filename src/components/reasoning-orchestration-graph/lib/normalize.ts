import { formatMetric, humanize, toNumber } from './format.js';
import type {
  AnnotationInput,
  ComputeScaling,
  EntropyInput,
  EntropyStrip,
  Id,
  LinkInput,
  LinkKind,
  Metric,
  MetricInput,
  ModelInput,
  NodeInput,
  NodeState,
  PathInput,
  Pipeline,
  PipelineInput,
  PipelineStageInput,
  ReasoningAnnotation,
  ReasoningLink,
  ReasoningModel,
  ReasoningNode,
  ReasoningOrchestrationModel,
  ReasoningOrchestrationPayload,
  ReasoningPath,
  ReasoningStage,
  ScalingInput,
  StageInput,
  StageMetric,
  StageStatus,
} from './types.js';

/** Past these the lowest-priority nodes and links are left out (pruned, deepest first). */
export const MAX_NODES = 1500;
export const MAX_LINKS = 3000;
/** Annotations are for significant events; the rest would bury the graph. */
export const MAX_ANNOTATIONS = 3;
export const MAX_ENTROPY_STEPS = 400;
export const MAX_ENTROPY_SERIES = 2;
export const ACTIVE_PATH_ID = 'active';

const NODE_STATES: Record<string, NodeState> = {
  candidate: 'candidate',
  explore: 'candidate',
  exploring: 'candidate',
  active: 'candidate',
  open: 'candidate',
  sampled: 'candidate',
  refined: 'refined',
  refine: 'refined',
  repaired: 'refined',
  repair: 'refined',
  corrected: 'refined',
  revised: 'refined',
  verified: 'verified',
  verify: 'verified',
  accepted: 'verified',
  selected: 'verified',
  correct: 'verified',
  final: 'verified',
  pruned: 'pruned',
  discarded: 'pruned',
  rejected: 'pruned',
  dropped: 'pruned',
  abandoned: 'pruned',
  failed: 'failed',
  fail: 'failed',
  error: 'failed',
  dead: 'failed',
  incorrect: 'failed',
};

const LINK_KINDS: Record<string, LinkKind> = {
  expand: 'expand',
  branch: 'expand',
  sample: 'expand',
  explore: 'expand',
  refine: 'refine',
  repair: 'refine',
  correct: 'refine',
  revise: 'refine',
  verify: 'verify',
  check: 'verify',
  critic: 'verify',
  critique: 'verify',
  resample: 'resample',
  restart: 'resample',
  retry: 'resample',
};

const STAGE_STATUS: Record<string, StageStatus> = {
  done: 'done',
  complete: 'done',
  completed: 'done',
  ok: 'done',
  success: 'done',
  passed: 'done',
  active: 'active',
  running: 'active',
  current: 'active',
  inprogress: 'active',
  pending: 'pending',
  queued: 'pending',
  waiting: 'pending',
  todo: 'pending',
  skipped: 'pending',
  failed: 'failed',
  error: 'failed',
  blocked: 'failed',
};

const STATE_RANK: Record<NodeState, number> = {
  verified: 0,
  refined: 0,
  candidate: 1,
  failed: 2,
  pruned: 3,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function key(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function word(value: unknown): string {
  return key(value).toLowerCase().replace(/[\s_-]+/g, '');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function lines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const single = text(value);
  return single ? [single] : [];
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter(isRecord) as T[]) : [];
}

/** 0–1 confidence. 0–100 is read as a percentage. */
function share(value: unknown): number | null {
  const n = toNumber(value);
  if (n === null || n < 0) return null;
  if (n <= 1) return n;
  return n <= 100 ? n / 100 : 1;
}

/** The payload itself, inside a FuseDash `data[0]`, or a bare link list. */
function unwrap(raw: unknown): ReasoningOrchestrationPayload | null {
  if (Array.isArray(raw)) {
    const links = list<LinkInput>(raw).filter((row) => key(row.source) && key(row.target));
    return links.length ? { links } : null;
  }
  if (!isRecord(raw)) return null;
  const looksLikeGraph = ['nodes', 'links', 'edges', 'paths', 'stages'].some((name) => name in raw);
  if (!looksLikeGraph && 'data' in raw) {
    const inner = Array.isArray(raw.data) ? raw.data[0] : raw.data;
    const payload = unwrap(inner);
    if (payload && !payload.name && typeof raw.name === 'string') payload.name = raw.name;
    return payload;
  }
  return raw as ReasoningOrchestrationPayload;
}

class ModelIndex {
  readonly models: ReasoningModel[] = [];
  private readonly byKey = new Map<string, ReasoningModel>();

  constructor(inputs: ModelInput[]) {
    inputs.forEach((input) => {
      const name = text(input.name) || text(input.label) || key(input.id);
      const id = key(input.id) || name;
      if (!id || this.byKey.has(id.toLowerCase())) return;
      const temperature = text(input.temperature);
      const detail = text(input.detail) || (temperature ? `T=${temperature}` : '');
      this.add({
        id,
        name: name || id,
        role: text(input.role),
        detail,
        color: text(input.color) || null,
        index: this.models.length,
      });
    });
  }

  private add(model: ReasoningModel): ReasoningModel {
    this.models.push(model);
    this.byKey.set(model.id.toLowerCase(), model);
    this.byKey.set(model.name.toLowerCase(), model);
    return model;
  }

  /** The model a node, link or path names; one that is not listed is added. */
  resolve(value: unknown): string | null {
    const ref = key(value);
    if (!ref) return null;
    const known = this.byKey.get(ref.toLowerCase());
    if (known) return known.id;
    return this.add({ id: ref, name: ref, role: '', detail: '', color: null, index: this.models.length }).id;
  }
}

function parseDepthRange(value: StageInput['depth']): [number, number] | null {
  if (Array.isArray(value)) {
    const from = toNumber(value[0]);
    const to = toNumber(value[1]);
    if (from === null || to === null) return null;
    return [Math.max(0, Math.min(from, to)), Math.max(0, Math.max(from, to))];
  }
  const single = toNumber(value);
  return single === null ? null : [Math.max(0, single), Math.max(0, single)];
}

function parseStatus(value: unknown): StageStatus | null {
  return STAGE_STATUS[word(value)] ?? null;
}

interface RawNode {
  id: string;
  label: string;
  explicitDepth: number | null;
  stageRef: string;
  modelId: string | null;
  state: NodeState;
  score: number | null;
  parentRef: string;
}

function rawNode(id: string, input: Partial<NodeInput>, models: ModelIndex): RawNode {
  const depth = toNumber(input.depth);
  return {
    id,
    label: text(input.label) || id,
    explicitDepth: depth === null ? null : Math.max(0, depth),
    stageRef: key(input.stage),
    modelId: models.resolve(input.model),
    state: NODE_STATES[word(input.state)] ?? 'candidate',
    score: share(input.score),
    parentRef: key(input.parent),
  };
}

/**
 * Normalizes a reasoning orchestration payload: stages, nodes, links, paths,
 * the active path and the supporting metrics. Depths come from the nodes,
 * then their stage, then the number of links from a root.
 */
export function normalizeReasoningOrchestration(raw: unknown): ReasoningOrchestrationModel {
  const payload = unwrap(raw) ?? {};
  const models = new ModelIndex(list<ModelInput>(payload.models));

  // Nodes, then any node a link or a path names without listing it.
  const nodes = new Map<string, RawNode>();
  for (const input of list<NodeInput>(payload.nodes)) {
    const id = key(input.id);
    if (id && !nodes.has(id)) nodes.set(id, rawNode(id, input, models));
  }
  const ensure = (id: string) => {
    if (!nodes.has(id)) nodes.set(id, rawNode(id, {}, models));
  };

  const links = new Map<string, ReasoningLink>();
  const addLink = (source: string, target: string, kind: LinkKind, modelId: string | null, id?: string) => {
    if (!source || !target || source === target) return;
    const linkId = `${source}->${target}`;
    if (links.has(linkId)) return;
    ensure(source);
    ensure(target);
    links.set(linkId, { id: id || linkId, source, target, kind, modelId });
  };
  for (const input of list<LinkInput>(payload.links ?? payload.edges)) {
    addLink(
      key(input.source),
      key(input.target),
      LINK_KINDS[word(input.kind)] ?? 'expand',
      models.resolve(input.model),
      key(input.id),
    );
  }
  // A named parent is a link even when the payload leaves it out.
  for (const node of [...nodes.values()]) {
    if (node.parentRef) addLink(node.parentRef, node.id, 'expand', null);
  }

  // Paths: each consecutive pair is a link, added when the payload left it out.
  const paths: ReasoningPath[] = [];
  const pathIds = new Set<string>();
  list<PathInput>(payload.paths).forEach((input, index) => {
    const ids = (Array.isArray(input.nodes) ? input.nodes : []).map(key).filter(Boolean);
    if (ids.length < 2) return;
    let id = key(input.id) || `path-${index + 1}`;
    while (pathIds.has(id)) id = `${id}-${index + 1}`;
    pathIds.add(id);
    const modelId = models.resolve(input.model);
    ids.forEach(ensure);
    for (let i = 1; i < ids.length; i += 1) addLink(ids[i - 1]!, ids[i]!, 'expand', null);
    paths.push({ id, label: text(input.label) || id, modelId, nodes: ids, score: share(input.score) });
  });

  let activePathId: string | null = null;
  const activeRef = payload.activePath ?? payload.activePathId;
  if (Array.isArray(activeRef)) {
    const ids = activeRef.map(key).filter(Boolean);
    if (ids.length >= 2) {
      ids.forEach(ensure);
      for (let i = 1; i < ids.length; i += 1) addLink(ids[i - 1]!, ids[i]!, 'expand', null);
      const id = pathIds.has(ACTIVE_PATH_ID) ? `${ACTIVE_PATH_ID}-path` : ACTIVE_PATH_ID;
      paths.unshift({ id, label: 'Active path', modelId: null, nodes: ids, score: null });
      activePathId = id;
    }
  } else if (key(activeRef)) {
    activePathId = paths.find((path) => path.id === key(activeRef))?.id ?? null;
  }

  // Stages.
  const stageInputs = list<StageInput>(payload.stages);
  const stages: ReasoningStage[] = [];
  const stageByRef = new Map<string, ReasoningStage>();
  const explicitRange = new Map<ReasoningStage, [number, number]>();
  stageInputs.forEach((input) => {
    const label = text(input.label) || text(input.name) || key(input.id);
    const id = key(input.id) || label;
    if (!id || stageByRef.has(id.toLowerCase())) return;
    const metrics: Record<string, number> = {};
    if (isRecord(input.metrics)) {
      for (const [name, value] of Object.entries(input.metrics)) {
        const n = toNumber(value);
        if (n !== null) metrics[name] = n;
      }
    }
    const stage: ReasoningStage = {
      id,
      label: label || id,
      index: stages.length,
      depthFrom: 0,
      depthTo: 0,
      status: parseStatus(input.status),
      modelId: models.resolve(input.model),
      metrics,
    };
    const range = parseDepthRange(input.depth);
    if (range) explicitRange.set(stage, range);
    stages.push(stage);
    stageByRef.set(id.toLowerCase(), stage);
    stageByRef.set(stage.label.toLowerCase(), stage);
  });
  const stageOf = (node: RawNode) => (node.stageRef ? stageByRef.get(node.stageRef.toLowerCase()) : undefined);

  // Depth: explicit, then the start of an explicit stage, then links from a root.
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const link of links.values()) {
    if (!incoming.has(link.target)) incoming.set(link.target, []);
    if (!outgoing.has(link.source)) outgoing.set(link.source, []);
    incoming.get(link.target)!.push(link.source);
    outgoing.get(link.source)!.push(link.target);
  }
  const depth = new Map<string, number>();
  for (const node of nodes.values()) {
    if (node.explicitDepth !== null) depth.set(node.id, node.explicitDepth);
  }
  const seeds = [...nodes.values()].filter((node) => !incoming.get(node.id)?.length);
  if (seeds.length === 0 && nodes.size) seeds.push(nodes.values().next().value!);
  const queue: string[] = [];
  for (const seed of seeds) {
    if (!depth.has(seed.id)) depth.set(seed.id, explicitRange.get(stageOf(seed)!)?.[0] ?? 0);
    queue.push(seed.id);
  }
  // Explicit depths anywhere seed the walk too, so their descendants follow them.
  for (const id of depth.keys()) if (!queue.includes(id)) queue.push(id);
  const settled = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (settled.has(id)) continue;
    settled.add(id);
    const base = depth.get(id) ?? 0;
    for (const target of outgoing.get(id) ?? []) {
      if (nodes.get(target)?.explicitDepth !== null) continue;
      const next = base + 1;
      if (!depth.has(target) || depth.get(target)! > next) depth.set(target, next);
      if (!settled.has(target)) queue.push(target);
    }
  }
  for (const node of nodes.values()) {
    let d = depth.get(node.id) ?? 0;
    const range = explicitRange.get(stageOf(node)!);
    if (range && node.explicitDepth === null) d = Math.min(range[1], Math.max(range[0], d));
    depth.set(node.id, d);
  }

  // Caps: keep path, annotated and root nodes, then live before pruned, shallow before deep.
  const pinned = new Set<string>();
  for (const path of paths) path.nodes.forEach((id) => pinned.add(id));
  for (const note of list<AnnotationInput>(payload.annotations)) {
    if (key(note.node)) pinned.add(key(note.node));
  }
  for (const seed of seeds) pinned.add(seed.id);
  let kept = [...nodes.values()];
  let droppedNodes = 0;
  if (kept.length > MAX_NODES) {
    const order = kept.map((node, index) => ({ node, index }));
    order.sort(
      (a, b) =>
        Number(pinned.has(b.node.id)) - Number(pinned.has(a.node.id)) ||
        STATE_RANK[a.node.state] - STATE_RANK[b.node.state] ||
        depth.get(a.node.id)! - depth.get(b.node.id)! ||
        a.index - b.index,
    );
    const allowed = new Set(order.slice(0, MAX_NODES).map((entry) => entry.node.id));
    droppedNodes = kept.length - allowed.size;
    kept = kept.filter((node) => allowed.has(node.id));
  }
  const keptIds = new Set(kept.map((node) => node.id));

  // Spanning-tree parent: named, then the previous node of a path, then the shallowest incoming link.
  const pathPrev = new Map<string, string>();
  for (const path of [...paths].sort((a, b) => Number(b.id === activePathId) - Number(a.id === activePathId))) {
    for (let i = 1; i < path.nodes.length; i += 1) {
      if (!pathPrev.has(path.nodes[i]!)) pathPrev.set(path.nodes[i]!, path.nodes[i - 1]!);
    }
  }
  const parent = new Map<string, string | null>();
  const wouldCycle = (child: string, candidate: string) => {
    let cursor: string | null | undefined = candidate;
    for (let guard = 0; cursor && guard <= keptIds.size; guard += 1) {
      if (cursor === child) return true;
      cursor = parent.get(cursor);
    }
    return false;
  };
  const byDepth = [...kept].sort((a, b) => depth.get(a.id)! - depth.get(b.id)!);
  for (const node of byDepth) {
    const own = depth.get(node.id)!;
    const sources = (incoming.get(node.id) ?? []).filter((id) => keptIds.has(id));
    const preferred = [node.parentRef, pathPrev.get(node.id) ?? ''].filter(
      (id) => id && keptIds.has(id) && sources.includes(id),
    );
    const shallower = sources
      .filter((id) => depth.get(id)! < own)
      .sort((a, b) => depth.get(a)! - depth.get(b)!);
    const choice = [...preferred, ...shallower, ...sources].find((id) => !wouldCycle(node.id, id));
    parent.set(node.id, choice ?? null);
  }

  // Stage ranges: explicit, else the depths of the nodes in the stage, else an even split.
  const maxDepth = Math.max(1, ...kept.map((node) => depth.get(node.id)!));
  for (const stage of stages) {
    const range = explicitRange.get(stage);
    if (range) {
      [stage.depthFrom, stage.depthTo] = range;
      continue;
    }
    const members = kept.filter((node) => stageOf(node) === stage).map((node) => depth.get(node.id)!);
    if (members.length) {
      stage.depthFrom = Math.min(...members);
      stage.depthTo = Math.max(...members);
    } else {
      stage.depthFrom = Number.NaN;
    }
  }
  const unplaced = stages.filter((stage) => Number.isNaN(stage.depthFrom));
  if (unplaced.length) {
    const step = maxDepth / stages.length;
    for (const stage of unplaced) {
      stage.depthFrom = stage.index * step;
      stage.depthTo = (stage.index + 1) * step;
    }
  }
  const stageForDepth = (d: number): ReasoningStage | undefined => {
    const containing = stages.find((stage) => d >= stage.depthFrom && d <= stage.depthTo);
    if (containing) return containing;
    let best: ReasoningStage | undefined;
    let gap = Infinity;
    for (const stage of stages) {
      const distance = d < stage.depthFrom ? stage.depthFrom - d : d - stage.depthTo;
      if (distance < gap) {
        gap = distance;
        best = stage;
      }
    }
    return best;
  };

  const pathModel = new Map<string, string>();
  for (const path of paths) {
    if (!path.modelId) continue;
    for (const id of path.nodes) if (!pathModel.has(id)) pathModel.set(id, path.modelId);
  }

  const outNodes: ReasoningNode[] = kept.map((node) => {
    const d = depth.get(node.id)!;
    const stage = stageOf(node) ?? stageForDepth(d);
    return {
      id: node.id,
      label: node.label,
      depth: d,
      stageIndex: stage ? stage.index : null,
      modelId: node.modelId ?? stage?.modelId ?? pathModel.get(node.id) ?? null,
      state: node.state,
      score: node.score,
      parent: parent.get(node.id) ?? null,
    };
  });

  // Links between kept nodes; past the cap, tree and path links stay first.
  let outLinks = [...links.values()].filter((link) => keptIds.has(link.source) && keptIds.has(link.target));
  let droppedLinks = links.size - outLinks.length;
  if (outLinks.length > MAX_LINKS) {
    const structural = (link: ReasoningLink) =>
      parent.get(link.target) === link.source || pathPrev.get(link.target) === link.source;
    const ordered = [...outLinks.filter(structural), ...outLinks.filter((link) => !structural(link))];
    droppedLinks += ordered.length - MAX_LINKS;
    outLinks = ordered.slice(0, MAX_LINKS);
  }

  const outPaths = paths
    .map((path) => ({ ...path, nodes: path.nodes.filter((id) => keptIds.has(id)) }))
    .filter((path) => path.nodes.length >= 2);
  if (activePathId && !outPaths.some((path) => path.id === activePathId)) activePathId = null;
  const activePath = outPaths.find((path) => path.id === activePathId);

  const annotations: ReasoningAnnotation[] = [];
  for (const note of list<AnnotationInput>(payload.annotations)) {
    if (annotations.length >= MAX_ANNOTATIONS) break;
    const title = text(note.title);
    const onPath = outPaths.find((path) => path.id === key(note.path)) ?? activePath;
    const nodeId = key(note.node) || onPath?.nodes[onPath.nodes.length - 1] || '';
    if (!title || !keptIds.has(nodeId)) continue;
    annotations.push({
      nodeId,
      title,
      lines: [...lines(note.lines), ...lines(note.detail)],
      modelId: models.resolve(note.model) ?? outNodes.find((node) => node.id === nodeId)?.modelId ?? null,
    });
  }

  const summaryInput = payload.summary;
  const summary: Metric[] = Array.isArray(summaryInput)
    ? metrics(summaryInput)
    : typeof summaryInput === 'string'
      ? []
      : defaultSummary(outNodes, outLinks, outPaths);

  return {
    empty: outNodes.length === 0,
    title: text(payload.title) || text(payload.name),
    subtitle: text(payload.subtitle) || lines(payload.metadata ?? payload.meta).join(' · '),
    models: models.models,
    stages,
    nodes: outNodes,
    links: outLinks,
    paths: outPaths,
    activePathId,
    annotations,
    maxDepth,
    summaryLabel: text(payload.summaryLabel) || 'Search topology',
    summary,
    summaryText: typeof summaryInput === 'string' ? summaryInput.trim() : '',
    criterion: text(payload.criterion),
    stageMetric: pickStageMetric(stages, text(payload.stageMetric)),
    benchmarks: metrics(payload.benchmarks),
    entropy: normalizeEntropy(payload.entropy, models),
    pipeline: normalizePipeline(payload.pipeline, stages),
    scaling: normalizeScaling(payload.computeScaling ?? payload.scaling, models),
    dropped: { nodes: droppedNodes, links: droppedLinks },
  };
}

function metrics(value: unknown): Metric[] {
  return list<MetricInput>(value)
    .filter((item) => text(item.label) || text(item.value))
    .map((item) => formatMetric(text(item.label), item.value ?? '', item.delta, text(item.unit)));
}

function defaultSummary(nodes: ReasoningNode[], links: ReasoningLink[], paths: ReasoningPath[]): Metric[] {
  const candidates = nodes.filter((node) => node.parent !== null).length;
  const refinements = new Set([
    ...nodes.filter((node) => node.state === 'refined').map((node) => node.id),
    ...links.filter((link) => link.kind === 'refine').map((link) => link.target),
  ]).size;
  const pruned = nodes.filter((node) => node.state === 'pruned' || node.state === 'failed').length;
  const out = [formatMetric('Candidates', candidates)];
  if (refinements) out.push(formatMetric('Refinements', refinements));
  if (paths.length) out.push(formatMetric('Paths', paths.length));
  if (pruned) out.push(formatMetric('Pruned', pruned));
  return out;
}

function pickStageMetric(stages: ReasoningStage[], requested: string): StageMetric | null {
  const counts = new Map<string, number>();
  for (const stage of stages) {
    for (const name of Object.keys(stage.metrics)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (!counts.size) return null;
  const name = requested && counts.has(requested)
    ? requested
    : [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  const values = stages.map((stage) => stage.metrics[name]).filter((v): v is number => v !== undefined);
  return { key: name, label: humanize(name), share: values.every((v) => v >= 0 && v <= 1) };
}

function numbers(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values.slice(0, MAX_ENTROPY_STEPS).map((v) => Math.max(0, toNumber(v) ?? 0));
}

function normalizeEntropy(value: unknown, models: ModelIndex): EntropyStrip | null {
  const input: EntropyInput = Array.isArray(value) ? { values: value } : isRecord(value) ? value : {};
  const series = [
    ...list<{ label?: string; model?: Id; values?: unknown }>(input.series).map((item) => ({
      label: text(item.label),
      modelId: models.resolve(item.model),
      values: numbers(item.values),
    })),
    ...(input.values ? [{ label: '', modelId: null, values: numbers(input.values) }] : []),
  ]
    .filter((item) => item.values.length > 0)
    .slice(0, MAX_ENTROPY_SERIES);
  if (!series.length) return null;
  const steps = Math.max(...series.map((item) => item.values.length));
  const highlight = (Array.isArray(input.highlight) ? input.highlight : [])
    .map((item) => {
      if (Array.isArray(item)) return { from: toNumber(item[0]), to: toNumber(item[1]), label: '' };
      if (isRecord(item)) return { from: toNumber(item.from), to: toNumber(item.to), label: text(item.label) };
      return { from: null, to: null, label: '' };
    })
    .filter((item): item is { from: number; to: number; label: string } => item.from !== null && item.to !== null)
    .map((item) => ({
      from: Math.max(0, Math.min(item.from, item.to)),
      to: Math.min(steps - 1, Math.max(item.from, item.to)),
      label: item.label,
    }));
  return {
    title: text(input.title),
    label: text(input.label) || 'Step entropy',
    series,
    highlight,
    steps,
  };
}

function normalizePipeline(value: unknown, stages: ReasoningStage[]): Pipeline | null {
  const input: PipelineInput | null = Array.isArray(value)
    ? { stages: value as PipelineStageInput[] }
    : isRecord(value)
      ? (value as unknown as PipelineInput)
      : null;
  const items = input ? list<PipelineStageInput>(input.stages) : [];
  if (items.length) {
    return {
      label: text(input?.label) || 'Refinement pipeline',
      stages: items
        .map((item) => ({
          label: text(item.label) || text(item.name),
          status: parseStatus(item.status) ?? 'pending',
          detail: text(item.detail),
        }))
        .filter((item) => item.label),
    };
  }
  // The stages carry a status: they are the pipeline.
  if (!stages.some((stage) => stage.status)) return null;
  return {
    label: 'Refinement pipeline',
    stages: stages.map((stage) => ({ label: stage.label, status: stage.status ?? 'pending', detail: '' })),
  };
}

function normalizeScaling(value: unknown, models: ModelIndex): ComputeScaling | null {
  if (!isRecord(value)) return null;
  const input = value as unknown as ScalingInput;
  const series = list<{ id?: Id; label?: string; model?: Id; points?: unknown }>(input.series)
    .map((item, index) => {
      const points = (Array.isArray(item.points) ? item.points : [])
        .map((point) => {
          if (Array.isArray(point)) return { x: toNumber(point[0]), y: toNumber(point[1]) };
          if (!isRecord(point)) return { x: null, y: null };
          return { x: toNumber(point.x ?? point.compute), y: toNumber(point.y ?? point.accuracy) };
        })
        .filter((point): point is { x: number; y: number } => point.x !== null && point.y !== null)
        .sort((a, b) => a.x - b.x);
      const label = text(item.label) || key(item.id) || `Series ${index + 1}`;
      return { id: key(item.id) || label, label, modelId: models.resolve(item.model), points };
    })
    .filter((item) => item.points.length >= 2);
  if (!series.length) return null;
  return {
    label: text(input.label) || 'Compute scaling',
    xLabel: text(input.xLabel) || 'Compute',
    yLabel: text(input.yLabel) || 'Accuracy',
    yUnit: text(input.yUnit),
    series,
  };
}
