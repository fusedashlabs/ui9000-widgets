import type { Preview } from '@storybook/web-components';
import { html } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { contextToCssVars, type PartialWidgetContext } from '../src/context/widget-context.js';
import { DEFAULT_CONTEXT, DEFAULT_THEME } from '../src/types/index.js';

function themeStyle(mode: 'light' | 'dark'): Record<string, string> {
  const ctx: PartialWidgetContext =
    mode === 'dark'
      ? {
          mode: 'dark',
          theme: {
            primary: '#60a5fa',
            secondary: '#a78bfa',
            background: 'transparent',
            grid: '#374151',
            text: '#f9fafb',
            textMuted: '#9ca3af',
            fontFamily: 'system-ui, sans-serif',
          },
        }
      : { mode: 'light', theme: DEFAULT_THEME };

  const merged = {
    ...DEFAULT_CONTEXT,
    ...ctx,
    theme: { ...DEFAULT_THEME, ...ctx.theme },
  };
  return {
    ...contextToCssVars(merged),
    minHeight: '360px',
    height: '420px',
    width: '100%',
    maxWidth: '880px',
    boxSizing: 'border-box',
  };
}

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f9fafb' },
        { name: 'dark', value: '#111827' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (story, context) => {
      const mode = context.globals.theme === 'dark' ? 'dark' : 'light';
      return html`<div style=${styleMap(themeStyle(mode))}>${story()}</div>`;
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
