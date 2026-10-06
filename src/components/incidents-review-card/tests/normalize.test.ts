import { describe, expect, it } from 'vitest';

import figma from '../../../stories/fixtures/incidents-review.figma.json';
import { columnTemplate, trackWeights } from '../render/index.js';
import { formatIncidentCount, isDistanceLabel, normalizeIncidentsReview } from '../lib/index.js';

describe('normalizeIncidentsReview', () => {
  it('reads the Figma sample', () => {
    const model = normalizeIncidentsReview(figma);

    expect(model.title).toBe('Incidents review');
    expect(model.filter).toEqual({ label: '5 km', scale: true });
    expect(model.counts).toEqual([
      { label: 'Active', value: 89, display: '89', full: '89', tone: 'green' },
      { label: 'In progress', value: 46, display: '46', full: '46', tone: 'red' },
    ]);
    expect(model.total).toEqual({ label: 'Total', value: 102, display: '102', full: '102' });
    expect(model.track).toBe(true);
    expect(model.empty).toBe(false);
  });

  it('keeps counts that do not sum to the total', () => {
    const model = normalizeIncidentsReview({ counts: [{ label: 'A', value: 89 }, { label: 'B', value: 46 }], total: 102 });
    expect(model.counts.map((c) => c.display)).toEqual(['89', '46']);
    expect(model.total?.display).toBe('102');
  });

  it('keeps the title alone without a filter', () => {
    for (const filter of [undefined, null, '', { kind: 'radius' }]) {
      expect(normalizeIncidentsReview({ ...figma, filter }).filter).toBeNull();
    }
  });

  it('draws the scale mark only for a distance', () => {
    const filter = (input: unknown) => normalizeIncidentsReview({ ...figma, filter: input }).filter;
    expect(filter('5 km')).toEqual({ label: '5 km', scale: true });
    expect(filter('500m')).toEqual({ label: '500m', scale: true });
    expect(filter('Region East')).toEqual({ label: 'Region East', scale: false });
    expect(filter({ label: 'Last 24 h', kind: 'time' })).toEqual({ label: 'Last 24 h', scale: false });
    expect(filter({ label: '2 km', kind: 'site' })?.scale).toBe(false);
    expect(filter({ value: 10, unit: 'mi' })).toEqual({ label: '10 mi', scale: true });
  });

  it('draws the track only when asked, or by default with two or more states', () => {
    const track = (input: object) => normalizeIncidentsReview({ total: 9, ...input }).track;
    const two = [{ label: 'Active', value: 1 }, { label: 'In progress', value: 2 }];
    expect(track({ counts: two })).toBe(true);
    expect(track({ counts: two, track: false })).toBe(false);
    expect(track({ counts: two.slice(0, 1) })).toBe(false);
    expect(track({ counts: two.slice(0, 1), track: true })).toBe(true);
    expect(track({ counts: [], track: true })).toBe(false);
  });

  it('colours states by tone, alias, or position', () => {
    const tones = normalizeIncidentsReview({
      counts: [
        { label: 'A', value: 1 },
        { label: 'B', value: 1 },
        { label: 'C', value: 1, tone: 'critical' },
        { label: 'D', value: 1, tone: 'Blue' },
        { label: 'E', value: 1, tone: 'nope' },
      ],
    }).counts.map((c) => c.tone);
    expect(tones).toEqual(['green', 'red', 'red', 'blue', 'violet']);
  });

  it('accepts count and state aliases, keeps text values, and drops unreadable states', () => {
    const model = normalizeIncidentsReview({
      counts: [
        { state: 'Open', count: '12' },
        { label: 'Pending', value: 'n/a' },
        { label: 'No value' },
        { value: 4 },
        'junk',
      ],
      total: { label: 'All incidents', value: 12_412 },
    });
    expect(model.counts.map((c) => [c.label, c.display])).toEqual([
      ['Open', '12'],
      ['Pending', 'n/a'],
    ]);
    expect(model.counts[1]?.value).toBeNull();
    expect(model.total).toEqual({ label: 'All incidents', value: 12_412, display: '12.4K', full: '12,412' });
  });

  it('survives junk', () => {
    for (const junk of [null, undefined, 3, 'text', [], { counts: 'nope' }, { title: 'Only a title' }]) {
      expect(normalizeIncidentsReview(junk).empty).toBe(true);
    }
    expect(normalizeIncidentsReview({ total: 5 }).empty).toBe(false);
  });
});

describe('formatIncidentCount', () => {
  it('prints whole counts and compacts large ones', () => {
    expect(formatIncidentCount(89)).toBe('89');
    expect(formatIncidentCount(1204)).toBe('1,204');
    expect(formatIncidentCount(12_412)).toBe('12.4K');
    expect(formatIncidentCount(2_500_000)).toBe('2.5M');
  });

  it('recognises distances', () => {
    expect(isDistanceLabel('5 km')).toBe(true);
    expect(isDistanceLabel('2.5mi')).toBe(true);
    expect(isDistanceLabel('Site 5')).toBe(false);
  });
});

describe('columnTemplate', () => {
  it('gives states twice the width of the total, as in the design', () => {
    const model = normalizeIncidentsReview(figma);
    expect(columnTemplate(model)).toBe('minmax(0, 2fr) minmax(0, 2fr) minmax(max-content, 1fr)');
    expect(columnTemplate({ ...model, total: null })).toBe('minmax(0, 2fr) minmax(0, 2fr)');
    expect(columnTemplate({ counts: [], total: model.total })).toBe('minmax(0, 1fr)');
  });
});

describe('trackWeights', () => {
  it('sizes each segment by its count, not by the total', () => {
    expect(trackWeights([{ value: 14 }, { value: 89 }, { value: 46 }, { value: 31 }])).toEqual([14, 89, 46, 31]);
  });

  it('gives text and negative counts no weight, and shares equally when nothing has one', () => {
    expect(trackWeights([{ value: null }, { value: 5 }, { value: -2 }])).toEqual([0, 5, 0]);
    expect(trackWeights([{ value: 0 }, { value: null }])).toEqual([1, 1]);
  });
});
