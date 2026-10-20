import { html } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import type { Meta, StoryContext, StoryObj } from '@storybook/web-components';

import '../components/asset-health-overview/index.js';
import '../components/chart-renderer/index.js';
import figmaJson from './fixtures/asset-health.figma.json';

type Appearance = 'light' | 'dark';

type Args = {
  data: unknown;
  width: number;
  height: number;
};

/** The Storybook toolbar's Light/Dark switch drives the chart's appearance. */
function appearanceOf(context: StoryContext): Appearance {
  return context.globals.theme === 'dark' ? 'dark' : 'light';
}

function frameStyle(args: Args, appearance: Appearance): Record<string, string> {
  return {
    width: `${args.width}px`,
    height: `${args.height}px`,
    boxSizing: 'border-box',
    background: appearance === 'dark' ? '#000000' : '#f3f4f6',
    padding: '12px',
  };
}

const fewerCategories = {
  chartType: 'assetHealthOverview',
  goal: { total: 420, awaiting: 4, blocked: 12, failed: 0, burn: 1 },
  categories: [
    {
      id: 'apps',
      name: 'Applications',
      total: 8,
      items: ['Salesforce', 'Slack', 'Jira'],
      problems: [],
    },
    {
      id: 'db',
      name: 'Databases',
      total: 4,
      items: ['orders-db', 'hr-records'],
      problems: [
        {
          name: 'crm-prod',
          type: 'DATABASE',
          why: 'writes blocked by R-047',
          loc: 'eu-west-1',
          sev: 'impaired',
        },
      ],
    },
    {
      id: 'tools',
      name: 'Tools',
      total: 10,
      items: ['OCR engine', 'web scraper'],
      problems: [],
    },
  ],
  wall: [
    {
      slot: 22,
      err: true,
      hgt: 40,
      reqs: 12,
      nErr: 2,
      src: {
        name: 'crm-prod',
        type: 'DATABASE',
        why: 'writes blocked by R-047',
        loc: 'eu-west-1',
        catName: 'Databases',
      },
    },
  ],
};

/** No `wall` in the payload → outer ring omitted even if agents are blocked. */
const healthyOnly = {
  chartType: 'assetHealthOverview',
  goal: { total: 1204, awaiting: 0, blocked: 0, failed: 0, burn: 1 },
  categories: figmaJson.categories.map((c) => ({ ...c, problems: [] })),
};

/** FuseDash WidgetItem: tabular `data` rows + agent columns + optional wall. */
const widgetItem = {
  chartType: 'assetHealthOverview',
  name: 'Onboarding Velocity',
  data: [
    {
      category: 'Applications',
      total: 12,
      healthy: 12,
      agents: 1204,
      awaiting: 19,
      blocked: 84,
      failed: 2,
    },
    { category: 'Databases', healthy: 8, failing: 1 },
    { category: 'Devices', healthy: 210, failing: 2, degraded: 7 },
    { category: 'AI models', healthy: 5, degraded: 1 },
    { category: 'People', healthy: 5 },
    { category: 'Tools', healthy: 22, degraded: 2 },
  ],
  wall: figmaJson.wall,
};

const frame = (args: Args, context: StoryContext) => html`
  <div style=${styleMap(frameStyle(args, appearanceOf(context)))}>
    <ui9000-asset-health-overview
      theme=${appearanceOf(context)}
      data=${JSON.stringify(args.data)}
    ></ui9000-asset-health-overview>
  </div>
`;

const meta: Meta<Args> = {
  title: 'Widgets/Asset health overview',
  component: 'ui9000-asset-health-overview',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'AM-6 Asset Health Overview: agent core + category tiles + optional 24h error wall + problem beams. Matches Figma GoalRings (278:52365). `theme` switches light/dark (toolbar Light/Dark); left empty it follows a local `data-theme` wrapper then `paintMode`. Wall panels come only from an explicit `wall` / `errors` payload.',
      },
    },
  },
  argTypes: {
    data: { control: false, table: { disable: true } },
    width: { control: 'number' },
    height: { control: 'number' },
  },
  args: { data: figmaJson, width: 744, height: 485 },
  render: frame,
};

export default meta;
type Story = StoryObj<Args>;

export const FigmaSample: Story = { name: 'Figma sample' };

export const FewerCategories: Story = {
  name: 'Fewer categories',
  args: { data: fewerCategories },
};

export const WidgetItemRows: Story = {
  name: 'WidgetItem data rows',
  args: { data: widgetItem },
};

export const NoErrorWall: Story = {
  name: 'No error wall',
  args: { data: healthyOnly },
};

export const ThroughRenderer: Story = {
  name: 'Through chart-renderer',
  render: (args, context) => html`
    <div style=${styleMap(frameStyle(args, appearanceOf(context)))}>
      <ui9000-chart-renderer data=${JSON.stringify(args.data)}></ui9000-chart-renderer>
    </div>
  `,
};
