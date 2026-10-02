import {
  BUBBLE_RADIUS_STEPS,
  MAP_STYLES,
  MAPBOX_CSS_HREF,
  UNMATCHED_FILL,
  sanitizeKey,
  type MapVisualisation,
} from '../lib/constants.js';
import { fdColors } from '../../../utils/fusedash-visual.js';
import { collectionBBox } from '../lib/domain.js';
import { darkenColor, hexToRgba } from '../lib/format.js';
import { getRegionIdFromFeatureProperties } from '../lib/geo-index.js';
import { orderedLayers } from '../lib/join.js';
import {
  defaultLayerSlider,
  featuresForYear,
  featuresInSliderRange,
  type LayerSlider,
} from '../lib/legend.js';
import {
  choroplethPmtilesSource,
  pmtilesIdExpression,
  toPmtilesFillLayer,
  toPmtilesStrokeLayer,
  type PmtilesLayerConfig,
} from '../lib/pmtiles.js';
import type { ColorRange, GeoJsonFeature, MapHoverEntry, MapLayerModel, MapModel } from '../lib/types.js';

export type MapMode = 'light' | 'dark';

export type RenderMapChartOptions = {
  model: MapModel;
  token: string;
  mode?: MapMode;
  showTooltip?: boolean;
  pmtilesBaseUrl?: string;
  activeLayerIds?: string[];
  sliders?: Record<string, LayerSlider>;
  year?: string;
  onHover?: (entry: MapHoverEntry | null) => void;
};

export type MapChartController = {
  resize: () => void;
  destroy: () => void;
  setYear: (year: string | undefined) => void;
  applyLegend: (activeLayerIds: string[], sliders: Record<string, LayerSlider>) => void;
};

type LiveMapLayer = {
  layerId: string;
  visualisationType: MapVisualisation;
  sourceId: string;
  paintIds: string[];
  fillId?: string;
  yearKey: string;
  features: GeoJsonFeature[];
  colorRanges: ColorRange[];
  pmtilesConfig?: PmtilesLayerConfig;
};

type MapboxMap = {
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>, before?: string) => void;
  addImage: (id: string, image: ImageData, options?: { pixelRatio?: number }) => void;
  getSource: (id: string) => { setData?: (data: unknown) => void } | undefined;
  getLayer: (id: string) => unknown;
  hasImage: (id: string) => boolean;
  removeImage: (id: string) => void;
  setPaintProperty: (id: string, name: string, value: unknown) => void;
  setLayoutProperty: (id: string, name: string, value: unknown) => void;
  setFilter: (id: string, filter: unknown) => void;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: { padding?: number; duration?: number },
  ) => void;
  resize: () => void;
  remove: () => void;
  loaded: () => boolean;
  isStyleLoaded: () => boolean;
  on: (event: string, layerOrHandler: unknown, handler?: unknown) => void;
  off: (event: string, layerOrHandler: unknown, handler?: unknown) => void;
  once: (event: string, handler: () => void) => void;
  queryRenderedFeatures: (
    point: unknown,
    options?: { layers?: string[] },
  ) => Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: unknown } }>;
};

type MapboxModule = {
  default: {
    accessToken: string;
    Map: new (options: Record<string, unknown>) => MapboxMap;
  };
};

const controllers = new WeakMap<HTMLElement, MapChartController>();

export function stopMapChart(container: HTMLElement): void {
  controllers.get(container)?.destroy();
  controllers.delete(container);
}

export function resizeMapChart(container: HTMLElement): boolean {
  const ctl = controllers.get(container);
  if (!ctl) return false;
  ctl.resize();
  return true;
}

export async function renderMapChart(
  container: HTMLElement,
  options: RenderMapChartOptions,
): Promise<MapChartController | null> {
  stopMapChart(container);
  container.replaceChildren();
  injectCss(container);

  if (!options.token) return null;

  let mapbox: MapboxModule;
  try {
    const runtime = (globalThis as unknown as { mapboxgl?: MapboxModule['default'] }).mapboxgl;
    mapbox = runtime
      ? ({ default: runtime } as MapboxModule)
      : ((await import('mapbox-gl')) as unknown as MapboxModule);
  } catch {
    return null;
  }

  const root = document.createElement('div');
  root.setAttribute('part', 'map');
  root.style.cssText = 'width:100%;height:100%;min-height:inherit;';
  container.append(root);

  mapbox.default.accessToken = options.token;
  const map = new mapbox.default.Map({
    container: root,
    style: options.model.terrain
      ? MAP_STYLES.terrain
      : options.mode === 'dark'
        ? MAP_STYLES.dark
        : MAP_STYLES.light,
    center: [0, 20],
    zoom: 1.4,
    attributionControl: true,
    preserveDrawingBuffer: true,
  });

  let destroyed = false;
  const layers = orderedLayers(options.model.layers.filter((l) => l.features.length > 0));
  const hover = options.showTooltip === false ? undefined : options.onHover;
  const live: LiveMapLayer[] = [];
  let legend = {
    activeLayerIds: options.activeLayerIds ?? layers.map((layer) => layer.layerId),
    sliders: options.sliders ?? {},
    year: options.year,
  };

  const applyLayers = (): void => {
    if (destroyed) return;
    live.length = 0;
    for (const layer of layers) {
      if (layer.visualisationType === 'choropleth') {
        live.push(addChoropleth(map, layer, hover, options.mode, options.pmtilesBaseUrl));
      } else if (layer.visualisationType === 'bubbles') {
        live.push(addCircles(map, layer, 'bubbles', hover));
      } else if (layer.visualisationType === 'markers') {
        live.push(addCircles(map, layer, 'markers', hover));
      } else {
        live.push(addSpikes(map, layer, hover));
      }
    }
    applyLegendState(map, live, legend.activeLayerIds, legend.sliders, legend.year);
    fit(map, layers);
  };

  map.once('load', applyLayers);
  if (map.isStyleLoaded() && map.loaded()) applyLayers();

  const controller: MapChartController = {
    resize: () => {
      try {
        map.resize();
      } catch {
        /* map already gone */
      }
    },
    destroy: () => {
      destroyed = true;
      try {
        map.remove();
      } catch {
        /* ignore */
      }
      container.replaceChildren();
    },
    setYear: (year) => {
      legend = { ...legend, year };
      if (destroyed) return;
      try {
        if (!map.isStyleLoaded()) return;
        applyLegendState(map, live, legend.activeLayerIds, legend.sliders, legend.year);
      } catch {
        /* style not ready */
      }
    },
    applyLegend: (activeLayerIds, sliders) => {
      legend = { ...legend, activeLayerIds, sliders };
      if (destroyed) return;
      try {
        if (!map.isStyleLoaded()) return;
        applyLegendState(map, live, activeLayerIds, sliders, legend.year);
      } catch {
        /* style not ready */
      }
    },
  };
  controllers.set(container, controller);
  return controller;
}

function injectCss(container: HTMLElement): void {
  const root = container.getRootNode();
  const host = root instanceof ShadowRoot ? root : document.head;
  if (host.querySelector('#ui9000-mapbox-css')) return;
  const link = document.createElement('link');
  link.id = 'ui9000-mapbox-css';
  link.rel = 'stylesheet';
  link.href = MAPBOX_CSS_HREF;
  host.append(link);
}

/** Hover outline. Width stays 0 until a region is hovered. */
export function choroplethSelectionPaint(mode?: MapMode): {
  'line-color': string;
  'line-width': number;
  'line-opacity': number;
} {
  return {
    'line-color': fdColors(mode === 'dark' ? 'dark' : 'light').mapSelectionStroke,
    'line-width': 0,
    'line-opacity': 0,
  };
}

function addChoropleth(
  map: MapboxMap,
  layer: MapLayerModel,
  onHover: RenderMapChartOptions['onHover'],
  mode?: MapMode,
  pmtilesBaseUrl?: string,
): LiveMapLayer {
  const queryKey = sanitizeKey(layer.layerId);
  const sourceId = `${layer.mapType}-${queryKey}`;
  const fillId = `${sourceId}-fill-layer`;
  const strokeId = `${sourceId}-selected-stroke-layer`;
  const fillColor = choroplethFillColor(layer, mode);
  const inRangeIds = Object.keys(layer.colorById);
  const pmtiles = choroplethPmtilesSource(layer.mapType, layer.features, pmtilesBaseUrl);

  const fillSpec: Record<string, unknown> = {
    id: fillId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': fillColor,
      'fill-opacity': 1,
    },
  };
  const strokeSpec: Record<string, unknown> = {
    id: strokeId,
    type: 'line',
    source: sourceId,
    paint: choroplethSelectionPaint(mode),
  };

  if (pmtiles) {
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        provider: 'pmtiles',
        url: pmtiles.url,
      });
    }
    addLayerMaybeBefore(
      map,
      toPmtilesFillLayer(fillSpec, pmtiles.config, inRangeIds),
    );
    if (!map.getLayer(strokeId)) {
      map.addLayer(toPmtilesStrokeLayer(strokeSpec, pmtiles.config));
    }
    const idExpr = pmtilesIdExpression(pmtiles.config);
    bindHover(map, fillId, layer, onHover, (id) => {
      map.setPaintProperty(strokeId, 'line-width', ['case', ['==', idExpr, id ?? ''], 2, 0]);
      map.setPaintProperty(strokeId, 'line-opacity', ['case', ['==', idExpr, id ?? ''], 1, 0]);
    });
    return {
      layerId: layer.layerId,
      visualisationType: 'choropleth',
      sourceId,
      paintIds: [fillId, strokeId],
      fillId,
      yearKey: layer.yearKey,
      features: layer.features,
      colorRanges: layer.colorRanges,
      pmtilesConfig: pmtiles.config,
    };
  }

  const collection = {
    type: 'FeatureCollection',
    features: layer.features,
  };
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: 'geojson', data: collection });
  } else {
    map.getSource(sourceId)?.setData?.(collection);
  }

  addLayerMaybeBefore(map, fillSpec);
  if (!map.getLayer(strokeId)) {
    map.addLayer(strokeSpec);
  }

  bindHover(map, fillId, layer, onHover, (id) => {
    map.setPaintProperty(strokeId, 'line-width', ['case', ['==', ['get', 'id'], id ?? ''], 2, 0]);
    map.setPaintProperty(strokeId, 'line-opacity', ['case', ['==', ['get', 'id'], id ?? ''], 1, 0]);
  });
  return {
    layerId: layer.layerId,
    visualisationType: 'choropleth',
    sourceId,
    paintIds: [fillId, strokeId],
    fillId,
    yearKey: layer.yearKey,
    features: layer.features,
    colorRanges: layer.colorRanges,
  };
}

function choroplethFillColor(layer: MapLayerModel, mode?: MapMode): unknown {
  const fillColor: unknown[] = ['match', ['get', 'id']];
  for (const [id, color] of Object.entries(layer.colorById)) {
    fillColor.push(id, mode === 'dark' ? hexToRgba(darkenColor(rgbaToHex(color), 0.3), 1) : color);
  }
  fillColor.push(UNMATCHED_FILL);
  return fillColor.length > 3 ? fillColor : UNMATCHED_FILL;
}

function addLayerMaybeBefore(map: MapboxMap, layer: Record<string, unknown>): void {
  if (map.getLayer(String(layer.id))) return;
  try {
    map.addLayer(layer, 'road');
  } catch {
    map.addLayer(layer);
  }
}

function addCircles(
  map: MapboxMap,
  layer: MapLayerModel,
  kind: 'bubbles' | 'markers',
  onHover: RenderMapChartOptions['onHover'],
): LiveMapLayer {
  const queryKey = sanitizeKey(layer.layerId);
  const sourceId = kind === 'bubbles' ? `bubbles-${queryKey}` : `scatterplot-${queryKey}`;
  const layerId = kind === 'bubbles' ? `bubble-layer-${queryKey}` : `scatterplot-layer-${queryKey}`;
  const collection = { type: 'FeatureCollection', features: layer.features };

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: 'geojson', data: collection });
  } else {
    map.getSource(sourceId)?.setData?.(collection);
  }

  const radius =
    kind === 'markers'
      ? 4
      : bubbleRadiusExpression(layer);

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': radius,
        'circle-color': layer.fillColor,
        'circle-opacity': kind === 'bubbles' ? 0.6 : 0.8,
        'circle-stroke-width': 1,
        'circle-stroke-color': kind === 'markers' ? '#fff' : layer.fillColor,
      },
    });
  }

  bindHover(map, layerId, layer, onHover);
  return {
    layerId: layer.layerId,
    visualisationType: kind,
    sourceId,
    paintIds: [layerId],
    yearKey: layer.yearKey,
    features: layer.features,
    colorRanges: layer.colorRanges,
  };
}

function addSpikes(
  map: MapboxMap,
  layer: MapLayerModel,
  onHover: RenderMapChartOptions['onHover'],
): LiveMapLayer {
  const queryKey = sanitizeKey(layer.layerId);
  const sourceId = `spikes-${queryKey}`;
  const layerId = `svg-spikes-layer-${queryKey}`;
  const collection = { type: 'FeatureCollection', features: layer.features };

  for (const feature of layer.features) {
    const iconName = feature.properties?.iconName;
    const svg = feature.properties?.svgContent;
    if (typeof iconName !== 'string' || typeof svg !== 'string') continue;
    void loadSpikeIcon(map, iconName, svg);
  }

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: 'geojson', data: collection });
  } else {
    map.getSource(sourceId)?.setData?.(collection);
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        visibility: 'visible',
        'icon-image': ['get', 'iconName'],
        'icon-size': 0.9,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-anchor': 'bottom',
      },
      paint: { 'icon-opacity': 1 },
    });
  }

  bindHover(map, layerId, layer, onHover);
  return {
    layerId: layer.layerId,
    visualisationType: 'spike',
    sourceId,
    paintIds: [layerId],
    yearKey: layer.yearKey,
    features: layer.features,
    colorRanges: layer.colorRanges,
  };
}

function applyLegendState(
  map: MapboxMap,
  live: LiveMapLayer[],
  activeLayerIds: string[],
  sliders: Record<string, LayerSlider>,
  year?: string,
): void {
  const active = new Set(activeLayerIds);
  for (const layer of live) {
    const visible = active.has(layer.layerId);
    for (const paintId of layer.paintIds) {
      if (!map.getLayer(paintId)) continue;
      try {
        map.setLayoutProperty(paintId, 'visibility', visible ? 'visible' : 'none');
      } catch {
        /* layer not ready */
      }
    }
    if (!visible) continue;
    const slider = sliders[layer.layerId] ?? defaultLayerSlider(layer.colorRanges.length);
    const inYear = featuresForYear(layer.features, year, layer.yearKey);
    const filtered = featuresInSliderRange(inYear, layer.colorRanges, slider);
    if (layer.visualisationType === 'choropleth' && layer.pmtilesConfig && layer.fillId) {
      const ids = [
        ...new Set(
          filtered
            .map((feature) => feature.properties?.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      ];
      const filter =
        ids.length > 0
          ? ['in', pmtilesIdExpression(layer.pmtilesConfig), ['literal', ids]]
          : ['==', 1, 0];
      try {
        map.setFilter(layer.fillId, filter);
      } catch {
        /* ignore */
      }
      continue;
    }
    try {
      map.getSource(layer.sourceId)?.setData?.({ type: 'FeatureCollection', features: filtered });
    } catch {
      /* source gone */
    }
  }
}

function bubbleRadiusExpression(layer: MapLayerModel): unknown {
  const ranges = [...layer.colorRanges].sort((a, b) => a.start - b.start);
  if (!ranges.length) return BUBBLE_RADIUS_STEPS[0];
  const expr: unknown[] = [
    'step',
    ['coalesce', ['to-number', ['get', 'value']], ranges[0].start],
    BUBBLE_RADIUS_STEPS[0],
  ];
  for (let i = 1; i < Math.min(ranges.length, BUBBLE_RADIUS_STEPS.length); i++) {
    expr.push(ranges[i].start, BUBBLE_RADIUS_STEPS[i]);
  }
  return expr.length < 4 ? BUBBLE_RADIUS_STEPS[0] : expr;
}

function bindHover(
  map: MapboxMap,
  layerId: string,
  layer: MapLayerModel,
  onHover: RenderMapChartOptions['onHover'],
  onId?: (id: string | null) => void,
): void {
  if (!onHover) return;

  const read = (properties: Record<string, unknown> | undefined): MapHoverEntry | null => {
    if (!properties) return null;
    const regionId = String(
      getRegionIdFromFeatureProperties(properties, layer.mapType) ??
        properties.id ??
        properties.regionId ??
        '',
    );
    if (!regionId) return null;
    const feature = layer.features.find(
      (f) => String(f.properties?.id ?? f.properties?.regionId) === regionId,
    );
    const props = feature?.properties ?? properties;
    const value = Number(props.value ?? 0);
    const regionName = String(props.regionName ?? props.name ?? regionId);
    return {
      regionId,
      regionName,
      value,
      valueKey: layer.valueKey,
      layerName: layer.layerName,
      lngLat: { lng: 0, lat: 0 },
    };
  };

  map.on(
    'mousemove',
    layerId,
    (e: {
      point?: { x: number; y: number };
      lngLat?: { lng: number; lat: number };
    }) => {
      const feature = map.queryRenderedFeatures(e.point, { layers: [layerId] })[0];
      const entry = read(feature?.properties);
      if (!entry) {
        onId?.(null);
        onHover(null);
        return;
      }
      if (e.lngLat) entry.lngLat = e.lngLat;
      if (e.point) entry.point = e.point;
      onId?.(entry.regionId);
      onHover(entry);
    },
  );
  map.on('mouseleave', layerId, () => {
    onId?.(null);
    onHover(null);
  });
}

function fit(map: MapboxMap, layers: MapLayerModel[]): void {
  const features = layers.flatMap((l) => l.features);
  const box = collectionBBox(features);
  if (!box) return;
  try {
    map.fitBounds(
      [
        [box[0], box[1]],
        [box[2], box[3]],
      ],
      { padding: 64, duration: 750 },
    );
  } catch {
    /* empty bounds */
  }
}

function loadSpikeIcon(map: MapboxMap, iconName: string, svgContent: string): void {
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixelRatio = 2;
    canvas.width = (img.width || 30) * pixelRatio;
    canvas.height = (img.height || 30) * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.drawImage(img, 0, 0, img.width || 30, img.height || 30);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (map.hasImage(iconName)) {
      try {
        map.removeImage(iconName);
      } catch {
        /* ignore */
      }
    }
    try {
      map.addImage(iconName, imageData, { pixelRatio: 2 });
    } catch {
      /* already exists */
    }
  };
  img.src = svgDataUrl;
}

function rgbaToHex(color: string): string {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return color.startsWith('#') ? color : '#473DD9';
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(match[1])}${hex(match[2])}${hex(match[3])}`;
}
