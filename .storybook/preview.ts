import type { Preview } from '@storybook/web-components';
import { html } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { applyWidgetContext } from '../src/context/widget-context.js';

function applyStoryTheme(mode: 'light' | 'dark'): void {
  const root = document.documentElement;
  root.dataset.theme = mode;
  applyWidgetContext(root, { mode });
}

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Render component',
          'Test your chart JSON',
          'Comparison',
          ['Bar', 'Lollipop', 'Line', 'Area', 'Area and bars', 'Radial bar', 'Polar area'],
          'Part of a whole',
          ['Pie', 'Donut', 'Treemap'],
          'Ordered series',
          ['Step line', 'Spark line', 'Spark area', 'Scatter sparkline'],
          'Distribution',
          ['Histogram', 'Box plot', 'Violin'],
          'Two measures',
          ['Scatter', 'Bubble'],
          'Two-way magnitude',
          ['Matrix', 'Punchcard'],
          'Many metrics',
          ['Radar', 'Parallel coordinates'],
          'Flow',
          'Contribution',
          'Spatial',
          'Graph',
          'Headline',
          ['KPIs', 'Status gauge'],
          'Model dependence',
          'Model error',
          'Model impurity',
          'Widgets',
          'Playground',
          ['Engine', 'Inspector'],
        ],
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f9fafb' },
        { name: 'dark', value: '#13161D' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (story, context) => {
      const mode = context.globals.theme === 'dark' ? 'dark' : 'light';
      applyStoryTheme(mode);
      return html`<div
        style=${styleMap({
          minHeight: '360px',
          height: '420px',
          width: '100%',
          maxWidth: '880px',
          boxSizing: 'border-box',
        })}
      >${story()}</div>`;
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'WidgetContext light/dark',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
