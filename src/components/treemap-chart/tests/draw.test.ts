import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { normalizeTreemapData } from '../lib/normalize.js';
import { renderTreemapChart } from '../render/draw.js';
import { DEFAULT_THEME } from '../../../types/index.js';

import treemapFixture from '../../../stories/fixtures/treemap.fusedash.json';

const singleFixture = { ...treemapFixture, subgroup: null };

/** jsdom does no layout, so grouped cards need a stand-in box to draw into. */
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 200 });
});

afterAll(() => {
  if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
});

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function draw(data: unknown, width = 600, height = 400): HTMLElement {
  const container = host();
  renderTreemapChart(container, {
    model: normalizeTreemapData(data as never),
    width,
    height,
    theme: DEFAULT_THEME,
    showTooltip: true,
    onHover: () => undefined,
    onLeave: () => undefined,
  });
  return container;
}

describe('renderTreemapChart — single', () => {
  it('lays out one rounded, gradient-filled tile per category', () => {
    const container = draw(singleFixture);
    const tiles = container.querySelectorAll('.treemap-tile');
    expect(tiles.length).toBe(5);

    const rect = tiles[0].querySelector('rect') as SVGRectElement;
    expect(rect.getAttribute('rx')).toBe('6');
    expect(rect.getAttribute('fill')).toMatch(/^url\(#tm-fill-\d+\)$/);
  });

  it('makes tile area proportional to value', () => {
    const container = draw(singleFixture);
    const model = normalizeTreemapData(singleFixture as never);
    const areas = [...container.querySelectorAll('.treemap-tile > rect')].map(
      (rect) => Number(rect.getAttribute('width')) * Number(rect.getAttribute('height')),
    );
    expect(areas.length).toBe(model.tiles.length);
    // Leaves come out largest-first, matching the value-sorted model. Rounding
    // and the 2px inner gutter cost the smaller tiles a few percent of area.
    const perUnit = areas.map((area, i) => area / model.tiles[i].value);
    for (const ratio of perUnit) {
      expect(Math.abs(ratio / perUnit[0] - 1)).toBeLessThan(0.08);
    }
    expect(areas[0]).toBeGreaterThan(areas[areas.length - 1]);
  });

  it('shares one gradient per distinct band color', () => {
    const container = draw(singleFixture);
    const model = normalizeTreemapData(singleFixture as never);
    const distinct = new Set(model.tiles.map((tile) => tile.color)).size;
    expect(container.querySelectorAll('linearGradient').length).toBe(distinct);
  });

  it('labels tiles with the name and, on taller tiles, the value', () => {
    const container = draw(singleFixture);
    const names = [...container.querySelectorAll('.tile-name')].map((el) => el.textContent);
    expect(names).toContain('California, Los Angeles');
    expect(container.querySelectorAll('.tile-value').length).toBeGreaterThan(0);
  });

  it('dims the other tiles while one is hovered, and restores on leave', () => {
    const container = draw(singleFixture);
    const tiles = [...container.querySelectorAll('.treemap-tile')] as SVGGElement[];
    tiles[0].dispatchEvent(new MouseEvent('mouseenter'));
    expect(tiles[0].style.opacity).toBe('1');
    expect(tiles[1].style.opacity).toBe('0.4');
    tiles[0].dispatchEvent(new MouseEvent('mouseleave'));
    expect(tiles.every((tile) => tile.style.opacity === '1')).toBe(true);
  });

  it('draws nothing for an empty model or a zero-sized container', () => {
    expect(draw([]).children.length).toBe(0);
    expect(draw(singleFixture, 0, 0).children.length).toBe(0);
  });
});

describe('renderTreemapChart — grouped', () => {
  it('builds the client card mosaic with a treemap per group', () => {
    const container = draw(treemapFixture);
    const grid = container.querySelector('.treemap-groups') as HTMLElement;
    expect(grid.style.gridTemplateAreas).toBe('"_1 _1 _2" "_1 _1 _2" "_3 _4 _5"');

    const cards = container.querySelectorAll('.treemap-card');
    expect(cards.length).toBe(5);
    expect(cards[0].querySelector('.treemap-card-title')?.textContent).toBe(
      'California, Los Angeles',
    );
    expect(cards[0].querySelector('.treemap-card-subtitle')?.textContent).toBe(
      'MD_Crop_Group  text  autorisatie',
    );
    expect(cards[0].querySelectorAll('.treemap-tile').length).toBe(5);
  });

  it('scopes gradient ids per card so fills stay inside their own card', () => {
    const container = draw(treemapFixture);
    const ids = [...container.querySelectorAll('linearGradient')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dims across cards so one hovered tile stays the focus', () => {
    const container = draw(treemapFixture);
    const tiles = [...container.querySelectorAll('.treemap-tile')] as SVGGElement[];
    tiles[0].dispatchEvent(new MouseEvent('mouseenter'));
    expect(tiles[tiles.length - 1].style.opacity).toBe('0.4');
  });
});
