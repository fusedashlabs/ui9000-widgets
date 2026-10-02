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
