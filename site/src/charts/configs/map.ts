import { HEADER_CONTROLS } from '../shared.js';
import type { ChartConfig } from '../types.js';

const story = (name: string) => () => import('../../../../src/stories/MapChart.stories.js').then((m) => m[name as 'Bubbles'].args?.data);

/** A folder next to this page, as an absolute URL: the vector tiles load in a worker, where a relative one would not resolve. */
const here = (folder: string) => new URL(folder, document.baseURI).href;

const map: ChartConfig = {
  id: 'map',
  title: 'Map',
  category: 'spatial',
  description: 'Places a value on each country of a world map, as fills, bubbles, spikes or markers.',
  tag: 'ui9000-map-chart',
  keywords: ['geo', 'choropleth', 'countries', 'world'],
  stageHeight: 520,
  setup: [
    {
      attribute: 'geojson-base-url',
      value: () => here('geojson'),
      code: '/geojson',
      description: 'Folder that serves country.json, the country centres that bubbles, spikes and markers stand on.',
    },
    {
      attribute: 'pmtiles-base-url',
      value: () => here('pmtiles'),
      code: '/pmtiles',
      description: 'Folder that serves world-countries.pmtiles, the country shapes that choropleth fills.',
    },
    {
      attribute: 'mapbox-token',
      // Empty here: the element reads the token this site was built with (VITE_MAPBOX_TOKEN).
      value: () => '',
      code: 'YOUR_MAPBOX_TOKEN',
      description: 'Public Mapbox token for the base map. mapbox-dark-token sets another for the dark style.',
    },
  ],
  load: async () => {
    const [, metadata] = await Promise.all([
      import('../../../../src/components/map-chart/element/ui9000-map-chart.js'),
      import('../../../../src/components/map-chart/metadata.json'),
    ]);
    return { dataRoles: metadata.dataRoles };
  },
  presets: [
    {
      id: 'choropleth',
      label: 'Choropleth',
      icon: 'map-fill',
      data: () => import('../../../../src/stories/fixtures/map.fusedash.json').then((m) => m.default),
    },
    { id: 'bubbles', label: 'Bubbles', icon: 'map-bubbles', data: story('Bubbles') },
    { id: 'spikes', label: 'Spikes', icon: 'map-spikes', data: story('Spikes') },
    { id: 'markers', label: 'Markers', icon: 'map-markers', data: story('Markers') },
    { id: 'combined', label: 'Combined layers', icon: 'map-layers', data: story('CombinedLayers') },
  ],
  controls: [
    { property: 'showLegend', type: 'boolean', default: true, description: 'Legend of the layers and their colours.' },
    { property: 'showTooltip', type: 'boolean', default: true, description: 'The country and its value in a tooltip when hovering.' },
    ...HEADER_CONTROLS,
  ],
  dataFields: {
    name: 'Title of the map.',
    layers: 'The layers, drawn in order: each with its rows, the field that names the country and the measure.',
    legend: 'Shows the legend when show-legend is not set.',
  },
  whenToUse: {
    useFor: ['A measure by country, read by where it is.', 'Several views of one measure at once: fills under bubbles, spikes or markers.'],
    avoid: ['Comparing values precisely: a bar chart ranks them better.', 'Data with no place in it.'],
  },
};

export default map;
