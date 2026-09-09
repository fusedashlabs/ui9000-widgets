import { hierarchy, treemap, treemapBinary } from 'd3-hierarchy';
import { select, type Selection } from 'd3-selection';

import type { WidgetTheme } from '../../../types/index.js';
import { FD } from '../../../utils/fusedash-visual.js';
import { formatTreemapValue } from '../lib/format.js';
import { treemapGridTemplate } from '../lib/layout.js';
import type { TreemapGroupCard, TreemapModel, TreemapTile } from '../lib/types.js';

export interface TreemapHoverPayload {
  tile: TreemapTile;
  /** The card the tile belongs to, in grouped mode */
  group?: TreemapGroupCard;
  event: MouseEvent;
}

export interface RenderTreemapChartOptions {
  model: TreemapModel;
  width: number;
  height: number;
  theme: WidgetTheme;
  showTooltip?: boolean;
  onHover?: (payload: TreemapHoverPayload) => void;
  onLeave?: () => void;
}

type HierarchyDatum = { tile?: TreemapTile; children?: HierarchyDatum[] };

interface TileLayer {
  /** Every tile group drawn for this widget — hover dims all but one */
  nodes: SVGGElement[];
}

/** One vertical gradient per distinct band color, shared by every tile using it. */
function gradientIds(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  colors: string[],
  prefix: string,
): Map<string, string> {
  const defs = svg.append('defs');
  const ids = new Map<string, string>();
  let index = 0;
  for (const color of new Set(colors)) {
    const id = `${prefix}-fill-${index++}`;
    const gradient = defs
      .append('linearGradient')
      .attr('id', id)
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 1);
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', FD.treemapGradientBottomOpacity);
    ids.set(color, id);
  }
  return ids;
}

/** White scanlines fading toward the bottom, clipped to the rounded tile. */
function appendStripes(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  height: number,
  clipId: string,
): void {
  const count = Math.floor(height / FD.treemapStripeSpacing);
  if (count <= 0) return;

  const clip = parent.append('clipPath').attr('id', clipId);
  clip
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('rx', FD.treemapTileRadius)
    .attr('ry', FD.treemapTileRadius);

  const stripes = parent.append('g').attr('clip-path', `url(#${clipId})`);
  for (let i = 0; i < count; i++) {
    const y = Math.round((i + 1) * FD.treemapStripeSpacing) + 0.5;
    const progress = y / height;
    const opacity = Math.max(0, FD.treemapStripeOpacity * (1 - progress * FD.treemapStripeFalloff));
    stripes
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', FD.treemapStripeColor)
      .attr('stroke-opacity', opacity)
      .attr('stroke-width', 1)
      .attr('shape-rendering', 'crispEdges');
  }
}

/** Name (+ value on taller tiles) as HTML so long labels ellipsize like the client. */
function appendLabel(
  parent: Selection<SVGGElement, unknown, null, undefined>,
  tile: TreemapTile,
  width: number,
  height: number,
  mode: TreemapModel['mode'],
): void {
  if (width <= FD.treemapMinLabelWidth || height <= FD.treemapMinLabelHeight) return;

  const box = parent
    .append('foreignObject')
    .attr('width', width)
    .attr('height', height)
    .append('xhtml:div')
    .attr('class', 'tile-label')
    .style('color', tile.lightFill ? FD.treemapLabelOnLight : FD.treemapLabelOnDark);

  box.append('xhtml:span').attr('class', 'tile-name').text(tile.label);

  if (height > FD.treemapMinValueHeight && tile.value) {
    box.append('xhtml:span').attr('class', 'tile-value').text(formatTreemapValue(tile.value, mode));
  }
}

function drawTiles(
  host: HTMLElement,
  tiles: TreemapTile[],
  width: number,
  height: number,
  options: RenderTreemapChartOptions,
  layer: TileLayer,
  prefix: string,
  group?: TreemapGroupCard,
): void {
  if (!tiles.length || width <= 0 || height <= 0) return;

  const root = hierarchy<HierarchyDatum>({ children: tiles.map((tile) => ({ tile })) })
    .sum((d) => d.tile?.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const layout = treemap<HierarchyDatum>()
    .tile(treemapBinary)
    .size([width, height])
    .paddingInner(FD.treemapPaddingInner)
    .round(true)(root);

  const svg = select(host)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const fills = gradientIds(
    svg,
    tiles.map((tile) => tile.color),
    prefix,
  );

  layout.leaves().forEach((leaf, index) => {
    const tile = leaf.data.tile;
    if (!tile) return;
    const tileWidth = leaf.x1 - leaf.x0;
    const tileHeight = leaf.y1 - leaf.y0;
    if (tileWidth <= 0 || tileHeight <= 0) return;

    const node = svg
      .append('g')
      .attr('class', 'treemap-tile')
      .attr('transform', `translate(${leaf.x0}, ${leaf.y0})`);

    node
      .append('rect')
      .attr('width', tileWidth)
      .attr('height', tileHeight)
      .attr('rx', FD.treemapTileRadius)
      .attr('ry', FD.treemapTileRadius)
      .attr('fill', `url(#${fills.get(tile.color)})`);

    appendStripes(node, tileWidth, tileHeight, `${prefix}-clip-${index}`);
    appendLabel(node, tile, tileWidth, tileHeight, options.model.mode);

    layer.nodes.push(node.node() as SVGGElement);

    if (options.showTooltip && options.onHover) {
      const dim = (hovered: SVGGElement | null) => {
        for (const other of layer.nodes) {
          other.style.opacity =
            hovered == null || other === hovered ? '1' : String(FD.treemapDimOpacity);
        }
      };
      node
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent) => {
          dim(node.node() as SVGGElement);
          options.onHover?.({ tile, group, event });
        })
        .on('mousemove', (event: MouseEvent) => {
          options.onHover?.({ tile, group, event });
        })
        .on('mouseleave', () => {
          dim(null);
          options.onLeave?.();
        });
    }
  });
}

/**
 * FuseDash Treemap — D3 rewrite of the Visx `TreemapSingle` / `TreemapGroup`.
 * Single mode is one area-proportional `treemapBinary` layout; grouped mode is
 * the client's card mosaic with a nested treemap per group.
 */
export function renderTreemapChart(
  container: HTMLElement,
  options: RenderTreemapChartOptions,
): void {
  const { model, width, height, theme } = options;
  container.replaceChildren();
  if (width <= 0 || height <= 0) return;

  const layer: TileLayer = { nodes: [] };

  if (model.mode === 'single') {
    drawTiles(container, model.tiles, width, height, options, layer, 'tm');
    return;
  }

  const template = treemapGridTemplate(model.groups.length);
  const grid = select(container).append('div').attr('class', 'treemap-groups');
  grid.style('grid-template-areas', template.areas).style('grid-template-rows', template.rows);

  const plots: Array<{ host: HTMLElement; group: TreemapGroupCard; index: number }> = [];

  model.groups.forEach((group, index) => {
    const card = grid
      .append('div')
      .attr('class', 'treemap-card')
      .style('grid-area', `_${index + 1}`);

    const header = card.append('div').attr('class', 'treemap-card-header');
    header
      .append('span')
      .attr('class', 'treemap-card-title')
      .attr('title', group.label)
      .style('color', theme.text)
      .text(group.label);
    if (model.subgroupField) {
      header
        .append('span')
        .attr('class', 'treemap-card-subtitle')
        .attr('title', model.subgroupField)
        .style('color', theme.textMuted)
        .text(model.subgroupField);
    }

    const host = card.append('div').attr('class', 'treemap-card-plot').node() as HTMLElement;
    plots.push({ host, group, index });
  });

  // One layout flush, then each card draws into the box the grid gave it.
  for (const { host, group, index } of plots) {
    drawTiles(
      host,
      group.tiles,
      host.clientWidth,
      host.clientHeight,
      options,
      layer,
      `tm-${index}`,
      group,
    );
  }
}
