import { describe, expect, it } from 'vitest';

import figmaFixture from '../../../stories/fixtures/flow-sankey.figma.json';
import {
  MAX_FLOW_LINKS,
  buildSeverityLegend,
  connectedLinkKeys,
  formatShare,
  neutralColor,
  normalizeFlowSankeyData,
  resolveSeverity,
  wrapFlowLabel,
  type FlowGraphPayload,
  type FlowSankeyFusePayload,
} from '../lib/index.js';

const FIGMA_MOCK = figmaFixture as unknown as FlowGraphPayload;

const shareOf = (id: string): string => {
  const model = normalizeFlowSankeyData(FIGMA_MOCK);
  const node = model.nodes.find((n) => n.id === id);
  return formatShare(node?.share ?? 0);
};

describe('normalizeFlowSankeyData', () => {
  it('accepts the Figma 34:21521 fixture', () => {
    const model = normalizeFlowSankeyData(FIGMA_MOCK);

    expect(model.circular).toBe(false);
    expect(model.nodes).toHaveLength(27);
    expect(model.links).toHaveLength(42);
    expect(model.stages).toEqual([
      'Root Cause Category',
      'Subcategory',
      'Specific Cause',
      'Impact/Outcome',
    ]);
    expect(model.valueLabel).toBe('Events');
    expect(model.summary).toHaveLength(2);
    expect(model.subtitle).toBe(
      'Tracing power loss from root cause to output impact',
    );
    expect(model.legendLabel).toBe('Severity');
  });

  it('names the legend key Severity unless the payload says otherwise', () => {
    const links = [{ source: 'a', target: 'b', value: 1, severity: null }];

    expect(normalizeFlowSankeyData({ links }).legendLabel).toBe('Severity');
    expect(normalizeFlowSankeyData({ links, legendLabel: '' }).legendLabel).toBe(
      'Severity',
    );
    expect(
      normalizeFlowSankeyData({ links, legendLabel: 'Risk band' }).legendLabel,
    ).toBe('Risk band');
  });

  it('carries the subtitle through, defaulting to empty', () => {
    const links = [{ source: 'a', target: 'b', value: 1, severity: null }];

    expect(normalizeFlowSankeyData({ links }).subtitle).toBe('');
    expect(
      normalizeFlowSankeyData({ links, subtitle: 'Cause to impact' }).subtitle,
    ).toBe('Cause to impact');
  });

  it('balances the first and last stage at the 685-event total', () => {
    const model = normalizeFlowSankeyData(FIGMA_MOCK);
    const totalFor = (stage: number): number =>
      model.nodes
        .filter((n) => n.stage === stage)
        .reduce((sum, n) => sum + n.value, 0);

    expect(totalFor(0)).toBe(685);
    expect(totalFor(3)).toBe(685);
  });

  it('reproduces the share badges shown in the Figma frame', () => {
    // Roots and converged outcomes read against the flow total.
    expect(shareOf('input-voltage')).toBe('(22.8%)');
    expect(shareOf('current-draw')).toBe('(28.9%)');
    expect(shareOf('power-loss')).toBe('(26.6%)');
    expect(shareOf('connector-temp')).toBe('(15.5%)');
    expect(shareOf('others-unknown')).toBe('(6.3%)');
    expect(shareOf('output-voltage-low')).toBe('(45.5%)');
    expect(shareOf('output-voltage-normal')).toBe('(42.5%)');
    expect(shareOf('output-voltage-high')).toBe('(8.2%)');
    expect(shareOf('output-voltage-unknown')).toBe('(3.8%)');
  });

  it('reads a node with one parent as a share of that parent', () => {
    // Lose Connector is 20 of Connector Loss' 42 — the Figma badge says 48%.
    expect(shareOf('lose-connector')).toBe('(47.6%)');
    expect(shareOf('cable-damage')).toBe('(24.1%)');
    expect(shareOf('ac-main-low')).toBe('(39.7%)');
  });

  it('keeps the declared stage columns', () => {
    const model = normalizeFlowSankeyData(FIGMA_MOCK);
    const stageOf = (id: string) => model.nodes.find((n) => n.id === id)?.stage;

    expect(stageOf('input-voltage')).toBe(0);
    expect(stageOf('cable-loss')).toBe(1);
    expect(stageOf('lose-connector')).toBe(2);
    expect(stageOf('output-voltage-low')).toBe(3);
  });

  it('collects the severities present, in legend order', () => {
    const model = normalizeFlowSankeyData(FIGMA_MOCK);
    // The fixture classifies some flows and leaves the rest neutral, so the key
    // has to explain that neutral colour too.
    expect(model.severities).toEqual(['high', 'medium', 'low', 'info']);
    expect(buildSeverityLegend(model).map((e) => e.label)).toEqual([
      'High',
      'Medium',
      'Low',
      'Info',
    ]);
  });

  it('adds Info whenever any mark is left unclassified', () => {
    const mixed = normalizeFlowSankeyData({
      links: [
        { source: 'a', target: 'b', value: 4, severity: 'high' },
        { source: 'b', target: 'c', value: 4 },
      ],
    });
    expect(mixed.severities).toEqual(['high', 'info']);

    // Nothing unclassified anywhere: no Info entry invented.
    const classified = normalizeFlowSankeyData({
      nodes: [
        { id: 'a', severity: 'high' },
        { id: 'b', severity: 'high' },
      ],
      links: [{ source: 'a', target: 'b', value: 4, severity: 'high' }],
    });
    expect(classified.severities).toEqual(['high']);
  });

  it('paints the Info swatch in the colour the plot drew those marks', () => {
    const model = normalizeFlowSankeyData(FIGMA_MOCK);
    const info = (neutral?: string) =>
      buildSeverityLegend(model, neutral).find((e) => e.key === 'info')?.color;

    expect(info(neutralColor('light'))).toBe(neutralColor('light'));
    expect(info(neutralColor('dark'))).toBe(neutralColor('dark'));
    expect(neutralColor('light')).not.toBe(neutralColor('dark'));
    // Severity entries are unaffected by the neutral.
    const high = buildSeverityLegend(model, neutralColor('dark')).find(
      (e) => e.key === 'high',
    );
    expect(high?.color).toBe('#F09AA4');
  });

  it('derives stages from the graph when the payload omits them', () => {
    const model = normalizeFlowSankeyData([
      { source: 'a', target: 'b', value: 4, severity: null },
      { source: 'b', target: 'c', value: 4, severity: null },
    ]);
    const stageOf = (id: string) => model.nodes.find((n) => n.id === id)?.stage;

    expect(stageOf('a')).toBe(0);
    expect(stageOf('b')).toBe(1);
    expect(stageOf('c')).toBe(2);
  });

  it('builds stage columns from a FuseDash arrangeBy widget', () => {
    const payload: FlowSankeyFusePayload = {
      data: [
        { cat: 'Power', sub: 'Cable', cause: 'Damage', events: 10, sev: 'high' },
        { cat: 'Power', sub: 'Cable', cause: 'Damage', events: 5, sev: 'high' },
        { cat: 'Power', sub: 'Cable', cause: 'Cut', events: 3, sev: 'low' },
      ],
      arrangeBy: ['cat', 'sub', 'cause'],
      display: ['events'],
      severityBy: 'sev',
      axisDetails: { cat: { label: 'Category' } },
    };
    const model = normalizeFlowSankeyData(payload);

    expect(model.stages).toEqual(['Category', 'Sub', 'Cause']);
    expect(model.valueLabel).toBe('Events');
    // Repeated Power -> Cable rows fold into one ribbon.
    const trunk = model.links.find((l) => l.target.endsWith('Cable'));
    expect(trunk?.value).toBe(18);
    expect(model.nodes).toHaveLength(4);
  });

  it('keeps a label repeated across stages as separate nodes', () => {
    const model = normalizeFlowSankeyData({
      data: [{ a: 'Loss', b: 'Loss', c: 'Done', n: 5 }],
      arrangeBy: ['a', 'b', 'c'],
      display: ['n'],
    });

    expect(model.nodes.filter((n) => n.label === 'Loss')).toHaveLength(2);
    expect(model.links.every((l) => l.source !== l.target)).toBe(true);
  });

  it('flags a cyclic payload instead of drawing it', () => {
    const model = normalizeFlowSankeyData([
      { source: 'a', target: 'b', value: 1, severity: null },
      { source: 'b', target: 'a', value: 1, severity: null },
    ]);

    expect(model.circular).toBe(true);
    expect(model.links).toHaveLength(0);
  });

  it('returns an empty model for junk payloads', () => {
    for (const input of [null, undefined, [], {} as never, { data: [] }]) {
      const model = normalizeFlowSankeyData(input as never);
      expect(model.links).toHaveLength(0);
      expect(model.nodes).toHaveLength(0);
      expect(model.circular).toBe(false);
    }
  });

  it('drops non-positive and self links, and adopts nodes named only by a link', () => {
    const model = normalizeFlowSankeyData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [
        { source: 'a', target: 'b', value: 5 },
        { source: 'a', target: 'b', value: 0 },
        { source: 'a', target: 'ghost', value: 9 },
        { source: 'a', target: 'a', value: 3 },
      ],
    });

    // The zero-value and self links go; `ghost` becomes a node of its own.
    expect(model.links).toHaveLength(2);
    expect(model.links.map((l) => l.value).sort((x, y) => x - y)).toEqual([5, 9]);
    expect(model.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'ghost']);
  });

  it('caps very dense payloads at MAX_FLOW_LINKS, keeping the largest', () => {
    const links = Array.from({ length: MAX_FLOW_LINKS + 40 }, (_, i) => ({
      source: `s${i}`,
      target: `t${i}`,
      value: i + 1,
    }));
    const model = normalizeFlowSankeyData({ links });

    expect(model.links).toHaveLength(MAX_FLOW_LINKS);
    expect(Math.min(...model.links.map((l) => l.value))).toBe(41);
  });
});

describe('resolveSeverity', () => {
  it('accepts the four keys case-insensitively and rejects the rest', () => {
    expect(resolveSeverity('High')).toBe('high');
    expect(resolveSeverity(' medium ')).toBe('medium');
    expect(resolveSeverity('critical')).toBeNull();
    expect(resolveSeverity(3)).toBeNull();
    expect(resolveSeverity(null)).toBeNull();
  });
});

describe('connectedLinkKeys', () => {
  it('walks upstream and downstream from the selected node', () => {
    const model = normalizeFlowSankeyData(FIGMA_MOCK);
    const keyOf = (l: (typeof model.links)[number], i: number) =>
      `${l.source}>${l.target}#${i}`;
    const keys = connectedLinkKeys(model.links, keyOf, 'connector-loss');

    // Upstream to Power Loss, downstream to the specific causes and outcomes.
    expect([...keys].some((k) => k.startsWith('power-loss>connector-loss'))).toBe(
      true,
    );
    expect([...keys].some((k) => k.startsWith('connector-loss>lose-connector'))).toBe(
      true,
    );
    expect([...keys].some((k) => k.startsWith('lose-connector>output-voltage-low'))).toBe(
      true,
    );
    // Nothing from the unrelated Connector Temp branch.
    expect([...keys].some((k) => k.startsWith('connector-temp>'))).toBe(false);
  });
});

describe('wrapFlowLabel', () => {
  it('keeps short labels on one line and wraps long ones to two', () => {
    expect(wrapFlowLabel('Cable Loss')).toEqual(['Cable Loss']);
    expect(wrapFlowLabel('Output Voltage Unknown')).toHaveLength(2);
    expect(wrapFlowLabel('Improper Installation').length).toBeLessThanOrEqual(2);
  });

  it('never returns more than two lines', () => {
    const lines = wrapFlowLabel('One Two Three Four Five Six Seven Eight');
    expect(lines.length).toBeLessThanOrEqual(2);
  });
});
