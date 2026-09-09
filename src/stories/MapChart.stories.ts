import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

import '../components/map-chart/index.js';
import fusedashFixture from './fixtures/map.fusedash.json';
import { storybookAssetUrl } from './storybook-public-base.js';

const ENV_MAPBOX_TOKEN =
  (import.meta as { env?: Record<string, string | undefined> }).env?.STORYBOOK_MAPBOX_TOKEN ||
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MAPBOX_TOKEN ||
  '';

type Viz = 'choropleth' | 'bubbles' | 'spike' | 'markers';

type CountryRow = { Country__created: string; Temperature: number };

type MapLayer = {
  data: CountryRow[];
  name: string;
  visualisationType: string;
  geospatialData?: string[];
  arrangeByMetric?: string[];
  layerId?: string;
  formatting?: Array<{ key: string; color: string }>;
  palette?: { paletteId?: string; customColors?: Array<{ key: string; hex: string }> };
  [key: string]: unknown;
};

type MapWidget = {
  name: string;
  chartType: string;
  legend?: boolean;
  layers: MapLayer[];
  [key: string]: unknown;
};

const FILL: Record<Exclude<Viz, 'choropleth'>, string> = {
  bubbles: '#473DD9',
  spike: '#FF8C47',
  markers: '#36C4A5',
};

const BASE = fusedashFixture as unknown as MapWidget;
const ALL_ROWS = (BASE.layers[0]?.data ?? []) as CountryRow[];
const RANKED = [...ALL_ROWS].sort((a, b) => b.Temperature - a.Temperature);

function qualitativeLayer(
  visualisationType: Exclude<Viz, 'choropleth'>,
  name: string,
  data: CountryRow[],
): MapLayer {
  return {
    ...BASE.layers[0],
    name,
    layerId: visualisationType,
    visualisationType,
    possibleVisualisationTypes: [visualisationType],
    data,
    formatting: [{ key: 'default', color: '1' }],
    palette: {
      paletteId: 'Qualitative2Colors1',
      customColors: [{ key: '1', hex: FILL[visualisationType] }],
    },
  };
}

function withVisualisation(
  visualisationType: Exclude<Viz, 'choropleth'>,
  name: string,
  data = ALL_ROWS,
): MapWidget {
  return {
    ...BASE,
    name,
    layers: [qualitativeLayer(visualisationType, name, data)],
  };
}

const combinedWidget: MapWidget = {
  ...BASE,
  name: 'Temperature — choropleth + bubbles + spikes + markers',
  layers: [
    {
      ...BASE.layers[0],
      name: 'Choropleth',
      layerId: 'choropleth',
      visualisationType: 'choropleth',
      data: ALL_ROWS,
    },
    qualitativeLayer('bubbles', 'Bubbles', RANKED.slice(0, 28)),
    qualitativeLayer('spike', 'Spikes', RANKED.slice(0, 16)),
    qualitativeLayer('markers', 'Markers', RANKED.slice(0, 12)),
  ],
};

type MapChartArgs = {
  data: unknown;
  showLegend: boolean;
  showTooltip: boolean;
  mapboxToken: string;
  geojsonBaseUrl: string;
  pmtilesBaseUrl: string;
};

const meta: Meta<MapChartArgs> = {
  title: 'Charts/MapChart',
  component: 'ui9000-map-chart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash `mapChart` / UniversalMap. Default story is the charts `DEFAULT_MAP` choropleth. Country GeoJSON is centroids (join / bubbles / spikes); choropleth fills come from `/pmtiles/world-countries.pmtiles`.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    mapboxToken: { control: 'text' },
    geojsonBaseUrl: { control: 'text' },
    pmtilesBaseUrl: { control: 'text' },
  },
  args: {
    showLegend: true,
    showTooltip: true,
    mapboxToken: ENV_MAPBOX_TOKEN,
    geojsonBaseUrl: storybookAssetUrl('geojson'),
    pmtilesBaseUrl: storybookAssetUrl('pmtiles'),
  },
  render: (args) => html`
    <div style="width:100%;height:520px;background:#fff;">
      <ui9000-map-chart
        style="display:block;width:100%;height:100%;"
        data=${JSON.stringify(args.data)}
        mapbox-token=${args.mapboxToken}
        geojson-base-url=${args.geojsonBaseUrl}
        pmtiles-base-url=${args.pmtilesBaseUrl}
        ?show-legend=${args.showLegend}
        ?show-tooltip=${args.showTooltip}
      ></ui9000-map-chart>
    </div>
  `,
};

export default meta;
type Story = StoryObj<MapChartArgs>;

export const Choropleth: Story = {
  name: 'Choropleth',
  args: {
    data: fusedashFixture,
  },
};

export const Bubbles: Story = {
  name: 'Bubbles',
  args: {
    data: withVisualisation('bubbles', 'Temperature bubbles by country'),
  },
};

export const Spikes: Story = {
  name: 'Spikes',
  args: {
    data: withVisualisation('spike', 'Temperature spikes by country', RANKED.slice(0, 40)),
  },
};

export const Markers: Story = {
  name: 'Markers',
  args: {
    data: withVisualisation('markers', 'Temperature markers by country'),
  },
};

export const CombinedLayers: Story = {
  name: 'Combined layers',
  args: { data: combinedWidget },
};

export const ChatRows: Story = {
  name: 'Chat rows',
  args: {
    data: [
      { label: 'France', value: 12 },
      { label: 'Germany', value: 8 },
      { label: 'Romania', value: 5 },
    ],
  },
};
