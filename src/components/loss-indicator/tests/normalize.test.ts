import { describe, expect, it } from 'vitest';

import { normalizeLossIndicator } from '../lib/normalize.js';
import { tickCountForWidth, tickPaint } from '../render/ticks.js';
import electrical from '../../../stories/fixtures/loss-indicator.mock.json';

describe('normalizeLossIndicator', () => {
  it('keeps the Figma sample on the red band past 20%', () => {
    const model = normalizeLossIndicator(electrical);
    expect(model.empty).toBe(false);
    expect(model.valueText).toBe('24.30%');
    expect(model.ratio).toBeCloseTo(24.3 / 30, 4);
    expect(model.level).toBe('critical');
    expect(model.trend).toBe('down');
    expect(model.ticks.map((tick) => tick.label)).toEqual(['0%', '10%', '20%', '30%']);
    const count = tickCountForWidth(0);
    const paints = Array.from({ length: count }, (_, index) =>
      tickPaint(index, count, model.ratio, model.min, model.max, model.bands),
    );
    expect(paints[0]).toBe('ok');
    expect(paints.includes('warning')).toBe(true);
    expect(paints.includes('severe')).toBe(true);
    expect(paints.filter((paint) => paint === 'critical').length).toBeGreaterThan(0);
    expect(paints.at(-1)).toBe('rest');
  });

  it('shows the number as given and takes axis labels from the bands when ticks are absent', () => {
    const model = normalizeLossIndicator({
      label: 'Efficiency Loss',
      value: 8.4,
      unit: '%',
      min: 0,
      max: 12,
      bands: [
        { from: 0, to: 4, level: 'ok' },
        { from: 4, to: 12, level: 'critical', color: '#112233' },
      ],
    });
    expect(model.valueText).toBe('8.4%');
    expect(model.ticks.map((tick) => tick.value)).toEqual([0, 4, 12]);
    expect(model.bands[1]?.color).toBe('#112233');
  });

  it('reads a WidgetItem: name, yAxe, data, limitsDomains, and domainsLimits', () => {
    const model = normalizeLossIndicator({
      name: 'Packet loss',
      yAxe: ['packetLoss'],
      data: [{ packetLoss: 1.5, trend: 'up' }],
      axisDetails: {
        packetLoss: { label: 'Packet loss', type: 'number', subtype: 'float', measure_unit: '%' },
      },
      limitsDomains: [[0, 5]],
      domainsLimits: [
        { values: [0, 1], color: '#3ad07c', orientation: 'horizontal' },
        { values: [1, 3], color: '#112233', orientation: 'horizontal' },
        { values: [3, 5], color: '#ef3b4a', orientation: 'horizontal' },
      ],
      uniqueValues: { packetLoss: ['0', '1', '5'] },
    });
    expect(model.label).toBe('Packet loss');
    expect(model.valueText).toBe('1.5%');
    expect(model.trend).toBe('up');
    expect(model.ticks.map((tick) => tick.label)).toEqual(['0%', '1%', '3%', '5%']);
    expect(model.bands[1]).toMatchObject({ level: 'warning', color: '#112233' });
    expect(model.ratio).toBeCloseTo(0.3, 4);
  });

  it('derives the arrow from earlier rows of the same metric', () => {
    const model = normalizeLossIndicator({
      name: 'Electrical Loss',
      yAxe: ['electricalLoss'],
      data: [{ electricalLoss: 26 }, { electricalLoss: 24.3 }],
      axisDetails: {
        electricalLoss: { label: 'Electrical Loss', type: 'number', subtype: 'percent', measure_unit: '%' },
      },
      limitsDomains: [[0, 30]],
      domainsLimits: [{ values: [0, 30], color: '#ef3b4a', orientation: 'horizontal' }],
    });
    expect(model.trend).toBe('down');
    expect(model.valueText).toBe('24.3%');
  });

  it('paints several limitsDomains pairs with the widget colours', () => {
    const model = normalizeLossIndicator({
      name: 'Packet loss',
      yAxe: ['packetLoss'],
      data: [{ packetLoss: '1.50' }],
      axisLabels: [{ key: 'packetLoss', suffix: '%' }],
      limitsDomains: [[0, 1], [1, 3], [3, 5]],
      colors: ['#3ad07c', '#112233', '#ef3b4a'],
    });
    expect(model.valueText).toBe('1.50%');
    expect(model.min).toBe(0);
    expect(model.max).toBe(5);
    expect(model.bands.map((band) => band.level)).toEqual(['ok', 'warning', 'critical']);
    expect(model.bands[1]?.color).toBe('#112233');
  });

  it('keeps an explicit band level when the colour is not in the palette', () => {
    const model = normalizeLossIndicator({
      name: 'Packet loss',
      yAxe: ['packetLoss'],
      data: [{ packetLoss: 1.5 }],
      limitsDomains: [[0, 30]],
      domainsLimits: [
        { values: [0, 10], color: '#112233', level: 'critical', orientation: 'horizontal' },
        { values: [10, 30], color: '#3ad07c', level: 'ok', orientation: 'horizontal' },
      ],
    });
    expect(model.bands.map((band) => band.level)).toEqual(['critical', 'ok']);
    expect(model.level).toBe('critical');
    expect(model.bands[0]?.color).toBe('#112233');
  });

  it('reads a kpi score on the yAxe column when the widget has no rows', () => {
    const model = normalizeLossIndicator({
      name: 'Electrical Loss',
      yAxe: ['electricalLoss'],
      data: [],
      kpis: [{ name: 'Electrical Loss', column: 'electricalLoss', score: 24.3, trend: 'down' }],
      axisDetails: {
        electricalLoss: { label: 'Electrical Loss', type: 'number', subtype: 'percent', measure_unit: '%' },
      },
      limitsDomains: [[0, 30]],
      domainsLimits: [{ values: [0, 30], color: '#ef3b4a', level: 'critical', orientation: 'horizontal' }],
    });
    expect(model.empty).toBe(false);
    expect(model.valueText).toBe('24.3%');
    expect(model.trend).toBe('down');
    expect(model.label).toBe('Electrical Loss');
  });

  it('stays empty when the widget has two metrics or no operating bands', () => {
    expect(normalizeLossIndicator({
      name: 'Loss',
      yAxe: ['loss', 'noise'],
      data: [{ loss: 1, noise: 2 }],
      limitsDomains: [[0, 30]],
      domainsLimits: [{ values: [0, 30], color: '#ef3b4a', orientation: 'horizontal' }],
    }).empty).toBe(true);
    expect(normalizeLossIndicator({
      name: 'Loss',
      yAxe: ['loss'],
      data: [{ loss: 1 }],
      limitsDomains: [[0, 10]],
    }).empty).toBe(true);
  });

  it('keeps a value string and a decimals count from the payload', () => {
    expect(normalizeLossIndicator({
      label: 'Electrical Loss',
      value: '24.30',
      unit: '%',
      min: 0,
      max: 30,
      bands: [{ from: 0, to: 30, level: 'critical' }],
    }).valueText).toBe('24.30%');
    expect(normalizeLossIndicator({
      label: 'Electrical Loss',
      value: 24.3,
      decimals: 1,
      unit: '%',
      min: 0,
      max: 30,
      bands: [{ from: 0, to: 30, level: 'critical' }],
    }).valueText).toBe('24.3%');
  });
});
