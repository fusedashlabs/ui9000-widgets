import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { useArgs } from '@storybook/preview-api';

import '../components/custom-widget/index.js';
import {
  isPaneSlotDisabled,
  panesFromSlots,
  type ArrangingDirection,
  type CustomWidgetPaneSlot,
} from '../components/custom-widget/lib/index.js';
import {
  composeCustomWidgetData,
  type CustomWidgetStorySlots,
} from './custom-widget-compose.js';

type CustomWidgetArgs = CustomWidgetStorySlots & {
  direction: ArrangingDirection;
  swap: boolean;
  scale: 'compact' | 'default' | 'comfortable';
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
};

const PANE_SWITCHES: { key: CustomWidgetPaneSlot; label: string }[] = [
  { key: 'chart', label: 'Chart' },
  { key: 'table', label: 'Table' },
  { key: 'text', label: 'Text' },
  { key: 'image', label: 'Image' },
];

function readSlots(args: CustomWidgetStorySlots): CustomWidgetStorySlots {
  return {
    kpi: !!args.kpi,
    chart: !!args.chart,
    table: !!args.table,
    text: !!args.text,
    image: !!args.image,
  };
}

function renderPaneSwitches(
  slots: CustomWidgetStorySlots,
  direction: ArrangingDirection,
  swap: boolean,
  updateArgs: (next: Partial<CustomWidgetArgs>) => void,
) {
  return html`
    <style>
      .pane-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 10px;
        margin-bottom: 12px;
        padding: 10px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        font-family: system-ui, sans-serif;
      }
      .pane-controls strong {
        margin-right: 4px;
        font-size: 12px;
        color: #6b7280;
        font-weight: 600;
      }
      .pane-controls .split {
        width: 1px;
        align-self: stretch;
        min-height: 22px;
        background: #e5e7eb;
        margin: 0 4px;
      }
      .pane-switch {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px 4px 4px;
        border-radius: 999px;
        color: #111827;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        user-select: none;
      }
      .pane-switch input {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
        pointer-events: none;
      }
      .pane-switch .track {
        position: relative;
        width: 32px;
        height: 18px;
        border-radius: 999px;
        background: #d1d5db;
        transition: background 0.15s ease;
      }
      .pane-switch .track::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 2px rgb(0 0 0 / 18%);
        transition: transform 0.15s ease;
      }
      .pane-switch:has(input:checked) .track {
        background: #473dd9;
      }
      .pane-switch:has(input:checked) .track::after {
        transform: translateX(14px);
      }
      .pane-switch:has(input:disabled) {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .seg {
        display: inline-flex;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }
      .seg button,
      .swap-btn {
        padding: 5px 10px;
        border: none;
        background: #fff;
        color: #374151;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .seg button + button {
        border-left: 1px solid #e5e7eb;
      }
      .seg button[data-on='true'] {
        background: #473dd9;
        color: #fff;
      }
      .swap-btn {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }
      .swap-btn[data-on='true'] {
        background: #eef2ff;
        border-color: #c7d2fe;
        color: #473dd9;
      }
      .swap-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    </style>
    <div class="pane-controls" aria-label="Slots">
      <label class="pane-switch">
        <input
          type="checkbox"
          .checked=${!!slots.kpi}
          @change=${(event: Event) => {
            updateArgs({ kpi: (event.target as HTMLInputElement).checked });
          }}
        />
        <span class="track"></span>
        KPI
      </label>
      <span class="split"></span>
      <strong>Panes (max 2)</strong>
      ${PANE_SWITCHES.map(({ key, label }) => {
        const on = !!slots[key];
        const disabled = isPaneSlotDisabled(slots, key);
        return html`
          <label class="pane-switch">
            <input
              type="checkbox"
              .checked=${on}
              ?disabled=${disabled}
              @change=${(event: Event) => {
                const checked = (event.target as HTMLInputElement).checked;
                if (checked && isPaneSlotDisabled(slots, key)) return;
                updateArgs({ [key]: checked });
              }}
            />
            <span class="track"></span>
            ${label}
          </label>
        `;
      })}
      <span class="split"></span>
      <strong>Layout</strong>
      <div class="seg" role="group" aria-label="Direction">
        <button
          type="button"
          data-on=${direction === 'horizontal'}
          @click=${() => updateArgs({ direction: 'horizontal' })}
        >
          Horizontal
        </button>
        <button
          type="button"
          data-on=${direction === 'vertical'}
          @click=${() => updateArgs({ direction: 'vertical' })}
        >
          Vertical
        </button>
      </div>
      <button
        class="swap-btn"
        type="button"
        data-on=${swap}
        ?disabled=${panesFromSlots(slots).length < 2}
        title="Swap pane order"
        @click=${() => updateArgs({ swap: !swap })}
      >
        ⇄ Swap
      </button>
    </div>
  `;
}

const meta: Meta<CustomWidgetArgs> = {
  title: 'Widgets/CustomWidget',
  component: 'ui9000-custom-widget',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'FuseDash CustomWidget — title, optional KPI band, and at most two panes. Use the Playground switches to mix KPI, chart, table, text, and image.',
      },
    },
  },
  argTypes: {
    kpi: { control: false, table: { disable: true } },
    chart: { control: false, table: { disable: true } },
    table: { control: false, table: { disable: true } },
    text: { control: false, table: { disable: true } },
    image: { control: false, table: { disable: true } },
    direction: { control: false, table: { disable: true } },
    swap: { control: false, table: { disable: true } },
    scale: { control: 'select', options: ['compact', 'default', 'comfortable'] },
    showGrid: { control: false, table: { disable: true } },
    showLegend: { control: false, table: { disable: true } },
    showTooltip: { control: false, table: { disable: true } },
  },
  args: {
    kpi: false,
    chart: true,
    table: true,
    text: false,
    image: false,
    direction: 'horizontal',
    swap: false,
    scale: 'default',
    showGrid: true,
    showLegend: true,
    showTooltip: true,
  },
  render: (args) => {
    const [, updateArgs] = useArgs();
    const slots = readSlots(args);
    return html`
      <div style="width:100%;background:#fff;">
        ${renderPaneSwitches(slots, args.direction, !!args.swap, updateArgs)}
        <div style="height:520px;">
          <ui9000-custom-widget
            style="display:block;width:100%;height:100%;"
            data=${JSON.stringify(composeCustomWidgetData(slots, args.direction, !!args.swap))}
            direction=${args.direction}
            scale=${args.scale}
            show-grid=${args.showGrid ? '' : 'false'}
            show-legend=${args.showLegend ? '' : 'false'}
            show-tooltip=${args.showTooltip ? '' : 'false'}
          ></ui9000-custom-widget>
        </div>
      </div>
    `;
  },
};

export default meta;
type Story = StoryObj<CustomWidgetArgs>;

export const Playground: Story = {
  name: 'Playground',
};
