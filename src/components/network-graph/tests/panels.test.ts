import { describe, expect, it } from 'vitest';

import {
  filterGraphByDate,
  formatChange,
  formatMetricValue,
  formatTimelineDate,
  getConnectionCounts,
  getConnectionList,
  getDataDates,
  getDateScale,
  getInitials,
  getNetworkTopics,
  getNodeTopics,
  getPeriodSeries,
  getScaleMonths,
  getScaleShare,
  nearestDate,
  nodeMatchesTopic,
  type NetworkLink,
} from '../lib/index.js';
import { normalizeNetworkGraphData } from '../lib/normalize.js';
import { arcAngles } from '../render/focus-view.js';
import { valueAxis } from '../render/metric-chart.js';
import { topicsCrowdLegend } from '../element/panels.js';

const graph = normalizeNetworkGraphData({
  nodes: [
    { id: 'a', type: 'Policy', date: '2022-01-10' },
    { id: 'b', type: 'Finance' },
    { id: 'c', type: 'Policy', topics: ['Finance'], date: '2022-08-01' },
  ],
  links: [
    { id: '1', source: 'a', target: 'b', value: 1, date: '2022-02-01' },
    { id: '2', source: 'b', target: 'c', value: 1, date: '2022-07-17' },
    { id: '3', source: 'a', target: 'c', value: 1 },
  ],
});

describe('timeline', () => {
  it('lists the dates of the data, each once, earliest first', () => {
    expect(getDataDates(graph)).toEqual([
      Date.UTC(2022, 0, 10),
      Date.UTC(2022, 1, 1),
      Date.UTC(2022, 6, 17),
      Date.UTC(2022, 7, 1),
    ]);
    expect(getDataDates({ nodes: [], links: [] })).toEqual([]);
  });

  it('keeps undated items and drops the ones after the date', () => {
    const march = filterGraphByDate(graph, Date.UTC(2022, 2, 1));
    expect(march.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(march.links.map((link) => link.id)).toEqual(['1']);
  });

  it('snaps a time to the nearest date of the data', () => {
    const dates = getDataDates(graph);
    expect(nearestDate(dates, Date.UTC(2022, 5, 1))).toBe(Date.UTC(2022, 6, 17));
    expect(nearestDate(dates, Date.UTC(2021, 0, 1))).toBe(dates[0]);
    expect(formatTimelineDate(Date.UTC(2022, 6, 17))).toBe('Jul, 17');
  });
});

describe('timeline scale', () => {
  const weeks = [6, 13, 20, 27, 34].map((day) => Date.UTC(2026, 6, day));

  it('runs from the first to the last date, half a week of room each side', () => {
    const scale = getDateScale(weeks);
    expect(scale.start).toBe(Date.UTC(2026, 6, 6) - 3.5 * 86400000);
    expect(scale.end).toBe(Date.UTC(2026, 7, 3) + 3.5 * 86400000);
    expect(getScaleShare(weeks[2], scale)).toBe(0.5);
  });

  it('names only the months the data covers', () => {
    const months = getScaleMonths(getDateScale(weeks));
    expect(months.map((month) => month.label)).toEqual(['Jul', 'Aug']);
    // July starts before the scale: no tick for it; August gets one.
    expect(months[0].share).toBeNull();
    expect(months[1].share).toBeGreaterThan(0.8);
  });

  it('gives a single date room around it', () => {
    expect(getScaleShare(weeks[0], getDateScale([weeks[0]]))).toBe(0.5);
  });
});

describe('topics', () => {
  it('matches a node by type or by its topics', () => {
    expect(nodeMatchesTopic(graph.nodes[2], 'Policy')).toBe(true);
    expect(nodeMatchesTopic(graph.nodes[2], 'Finance')).toBe(true);
    expect(nodeMatchesTopic(graph.nodes[0], 'Finance')).toBe(false);
  });

  it('uses node types with their link count when the data has no topics', () => {
    expect(getNetworkTopics(graph).map(({ name, value }) => ({ name, value }))).toEqual([
      { name: 'Policy', value: 3 },
      { name: 'Finance', value: 2 },
    ]);
  });

  it("prefers the widget's own topics", () => {
    const topics = getNetworkTopics({
      ...graph,
      topics: [{ name: 'National Policy', value: 32, change: 2.3 }],
    });
    expect(topics).toHaveLength(1);
    expect(topics[0]).toMatchObject({ name: 'National Policy', change: 2.3 });
  });
});

describe('getPeriodSeries', () => {
  it('keeps the last months before the latest point, sorted', () => {
    const series = getPeriodSeries(
      [
        { date: '2019-03-10', value: 3 },
        { date: '2018-01-01', value: 1 },
        { date: '2018-12-01', value: 2 },
      ],
      6,
    );
    expect(series.map((point) => point.value)).toEqual([2, 3]);
  });
});

describe('getInitials', () => {
  it('takes the first letters of the first two words', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('united nations conference')).toBe('UN');
  });

  it('skips signs that are not letters or digits', () => {
    expect(getInitials('(ACME) Trade')).toBe('AT');
    expect(getInitials('Taxes - Support')).toBe('TS');
  });

  it('takes two characters of a single word', () => {
    expect(getInitials('85715')).toBe('85');
    expect(getInitials('Northwind')).toBe('NO');
  });

  it('is empty without a name', () => {
    expect(getInitials('  ')).toBe('');
  });
});

describe('metric text', () => {
  it('keeps one decimal on percentages', () => {
    expect(formatMetricValue(62, '%')).toBe('62.0%');
    expect(formatMetricValue(1840)).toBe('1840');
  });

  it('signs a change', () => {
    expect(formatChange(2.34, '%', 1)).toBe('+2.3%');
    expect(formatChange(-1, '', 0)).toBe('-1');
    expect(formatChange(0, '%', 1)).toBe('0.0%');
  });
});

describe('node details', () => {
  const nodes = [
    { id: 'a', label: 'Alpha', type: 'Finance', topics: ['Policy', 'Finance'] },
    { id: 'b', label: 'Beta', type: 'Policy' },
    { id: 'c', label: 'Gamma', type: 'Policy' },
    { id: 'd', label: 'Delta', type: 'Trade' },
  ];
  const links: NetworkLink[] = [
    { id: '1', source: 'a', target: 'b', value: 2, type: 'primary' },
    { id: '2', source: 'c', target: 'a', value: 5, type: 'primary' },
    { id: '3', source: 'a', target: 'b', value: 4, type: 'primary' },
    { id: '4', source: 'a', target: 'x', value: 9, type: 'primary' },
  ];

  it("lists the node's topics and type once each", () => {
    expect(getNodeTopics(nodes[0], [])).toEqual(['Policy', 'Finance']);
  });

  it('keeps the topics the widget knows', () => {
    expect(getNodeTopics(nodes[0], ['Finance', 'Trade'])).toEqual(['Finance']);
  });

  it('does not list a topic node as its own topic', () => {
    const issue = { id: 'Taxes', label: 'Taxes', type: 'Economy', topics: ['Taxes'] };
    expect(getNodeTopics(issue, ['Taxes', 'Healthcare'])).toEqual([]);
  });

  it('adds up the links to every linked node, strongest first', () => {
    expect(
      getConnectionList('a', nodes, links).map(({ node, weight }) => [node.id, weight]),
    ).toEqual([
      ['b', 6],
      ['c', 5],
    ]);
  });

  it('counts the linked nodes of every node by name', () => {
    const counts = getConnectionCounts(nodes, links);
    // "x" is not a node of the graph.
    expect(counts.get('Alpha')).toBe(2);
    expect(counts.get('Beta')).toBe(1);
    expect(counts.get('Delta')).toBe(0);
  });
});

describe('arcAngles', () => {
  it('centres one item and spreads the rest over the arc', () => {
    expect(arcAngles(1)).toEqual([0]);
    expect(arcAngles(3)).toEqual([-76, 0, 76]);
  });
});

describe('topicsCrowdLegend', () => {
  it('keeps the topic list beside the legend while both fit', () => {
    // 12 + 240 + 12 + 168 + 16 = 448
    expect(topicsCrowdLegend(448, 240, 168)).toBe(false);
    expect(topicsCrowdLegend(447, 240, 168)).toBe(true);
  });

  it('does not move anything before both are measured', () => {
    expect(topicsCrowdLegend(300, 0, 168)).toBe(false);
    expect(topicsCrowdLegend(0, 240, 168)).toBe(false);
  });
});

describe('valueAxis', () => {
  it('labels every 10 while there is room and every 20 on a low chart', () => {
    // A 170 px chart has 118 px to plot, a 144 px one 92 px.
    expect(valueAxis([20, 60], 118).ticks).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(valueAxis([20, 60], 92).ticks).toEqual([0, 20, 40, 60]);
    expect(valueAxis([20, 60], 118).format(0)).toBe('00');
  });

  it('reaches below zero for negative values', () => {
    const axis = valueAxis([-5, 3, -2], 118);
    expect(axis.domain[0]).toBeLessThanOrEqual(-5);
    expect(axis.domain[1]).toBeGreaterThanOrEqual(3);
    expect(axis.ticks).toContain(0);
  });

  it('keeps small fractions readable', () => {
    const axis = valueAxis([0.21, 0.35], 118);
    expect(axis.domain[1]).toBeLessThan(1);
    expect(axis.ticks.length).toBeGreaterThan(2);
    // One precision for every label of the axis.
    expect(axis.format(0.2)).toBe('0.20');
  });
});

describe('node types', () => {
  it('group the same way for colours, the legend and the topics', () => {
    const model = normalizeNetworkGraphData({
      nodes: [
        { id: 'a', type: 'Bank' },
        { id: 'b', type: 'Bank ' },
      ],
      links: [{ source: 'a', target: 'b', value: 1 }],
    });
    expect(model.nodes[0].type).toBe(model.nodes[1].type);
    expect(model.nodes[0].color).toBe(model.nodes[1].color);
    expect(getNetworkTopics(model).map((topic) => topic.name)).toEqual(['Bank']);
  });
});

describe('getPeriodSeries at a month end', () => {
  const monthly = (dates: string[]) => dates.map((date, index) => ({ date, value: index }));

  it('starts on the last day of a shorter month', () => {
    const series = getPeriodSeries(
      monthly(['2026-02-27', '2026-02-28', '2026-03-31', '2026-08-31']),
      6,
    );
    expect(series.map((point) => point.date)).toEqual(['2026-02-28', '2026-03-31', '2026-08-31']);
  });

  it('keeps the same day when the month has it', () => {
    const series = getPeriodSeries(monthly(['2026-01-30', '2026-01-31', '2026-07-31']), 6);
    expect(series.map((point) => point.date)).toEqual(['2026-01-31', '2026-07-31']);
  });
});
