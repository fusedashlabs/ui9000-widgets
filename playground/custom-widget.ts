import {
  composeCustomWidgetData,
  DEFAULT_SLOTS,
  type CustomWidgetStorySlots,
} from '../src/stories/custom-widget-compose.js';
import { applyWidgetContext } from '../src/context/widget-context.js';
import { loadCustomWidget } from '../src/lazy/index.js';
import type { ArrangingDirection } from '../src/components/custom-widget/lib/index.js';
import { MAX_PANES, panesFromSlots } from '../src/components/custom-widget/lib/index.js';

interface Options {
  slots: CustomWidgetStorySlots;
  direction: ArrangingDirection;
  scale: 'compact' | 'default' | 'comfortable';
  mode: 'light' | 'dark';
}

const SLOT_PANE_IDS = ['slot-chart', 'slot-table', 'slot-text', 'slot-image'] as const;

function readSlots(): CustomWidgetStorySlots {
  const checked = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.checked ?? false;
  return {
    kpi: checked('slot-kpi'),
    chart: checked('slot-chart'),
    table: checked('slot-table'),
    text: checked('slot-text'),
    image: checked('slot-image'),
  };
}

function writeSlots(slots: CustomWidgetStorySlots): void {
  const set = (id: string, value: boolean) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.checked = value;
  };
  set('slot-kpi', slots.kpi);
  set('slot-chart', slots.chart);
  set('slot-table', slots.table);
  set('slot-text', slots.text);
  set('slot-image', slots.image);
}

function syncPaneDisable(slots: CustomWidgetStorySlots): void {
  const used = panesFromSlots(slots).length;
  for (const id of SLOT_PANE_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) continue;
    el.disabled = used >= MAX_PANES && !el.checked;
  }
}

function readOptions(): Options {
  const value = (id: string) => (document.getElementById(id) as HTMLSelectElement).value;
  return {
    slots: readSlots(),
    direction: value('direction-select') as ArrangingDirection,
    scale: value('scale-select') as Options['scale'],
    mode: value('mode-select') as Options['mode'],
  };
}

function slotsFromQuery(params: URLSearchParams): CustomWidgetStorySlots {
  const flag = (key: keyof CustomWidgetStorySlots) => params.get(key) === '1';
  const hasAny =
    params.has('kpi') ||
    params.has('chart') ||
    params.has('table') ||
    params.has('text') ||
    params.has('image');
  if (!hasAny) return { ...DEFAULT_SLOTS };
  return {
    kpi: flag('kpi'),
    chart: flag('chart'),
    table: flag('table'),
    text: flag('text'),
    image: flag('image'),
  };
}

function optionsToQuery(options: Options): string {
  const params = new URLSearchParams({
    embed: '1',
    direction: options.direction,
    scale: options.scale,
    mode: options.mode,
  });
  for (const key of ['kpi', 'chart', 'table', 'text', 'image'] as const) {
    if (options.slots[key]) params.set(key, '1');
  }
  return params.toString();
}

function optionsFromQuery(params: URLSearchParams): Options {
  return {
    slots: slotsFromQuery(params),
    direction: (params.get('direction') as ArrangingDirection) ?? 'horizontal',
    scale: (params.get('scale') as Options['scale']) ?? 'default',
    mode: (params.get('mode') as Options['mode']) ?? 'light',
  };
}

const DARK = {
  background: '#0b0f19',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  grid: '#374151',
};

async function mount(host: HTMLElement, options: Options): Promise<void> {
  await loadCustomWidget();
  host.replaceChildren();

  applyWidgetContext(host, {
    scale: options.scale,
    mode: options.mode,
    theme: options.mode === 'dark' ? DARK : {},
  });
  host.style.background = options.mode === 'dark' ? DARK.background : '#ffffff';

  const el = document.createElement('ui9000-custom-widget');
  el.setAttribute('data', JSON.stringify(composeCustomWidgetData(options.slots, options.direction)));
  el.setAttribute('scale', options.scale);
  el.setAttribute('direction', options.direction);
  host.appendChild(el);
}

const params = new URLSearchParams(window.location.search);

if (params.get('embed') === '1') {
  document.body.dataset.embed = 'true';
  void mount(document.getElementById('embed-host')!, optionsFromQuery(params));
} else {
  const render = () => {
    const options = readOptions();
    syncPaneDisable(options.slots);
    void mount(document.getElementById('page-host')!, options);
    const frame = document.getElementById('chat-frame') as HTMLIFrameElement;
    frame.src = `./custom-widget.html?${optionsToQuery(options)}`;
  };

  writeSlots(DEFAULT_SLOTS);
  const direction = document.getElementById('direction-select') as HTMLSelectElement | null;
  if (direction) direction.value = 'horizontal';

  for (const id of ['slot-kpi', ...SLOT_PANE_IDS, 'direction-select', 'scale-select', 'mode-select']) {
    document.getElementById(id)?.addEventListener('change', render);
  }
  render();
}
