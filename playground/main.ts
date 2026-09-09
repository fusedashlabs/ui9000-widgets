import { applyWidgetContext } from '../src/context/widget-context.js';
import {
  loadBarChart,
  loadLineChart,
  loadLollipop,
  loadStepLineChart,
} from '../src/lazy/index.js';

const lineData = {
  series: [
    {
      id: 'revenue',
      name: 'Revenue',
      points: [
        { x: 'Jan', y: 42 },
        { x: 'Feb', y: 58 },
        { x: 'Mar', y: 51 },
        { x: 'Apr', y: 71 },
        { x: 'May', y: 63 },
        { x: 'Jun', y: 80 },
      ],
    },
    {
      id: 'cost',
      name: 'Cost',
      points: [
        { x: 'Jan', y: 28 },
        { x: 'Feb', y: 32 },
        { x: 'Mar', y: 30 },
        { x: 'Apr', y: 41 },
        { x: 'May', y: 38 },
        { x: 'Jun', y: 45 },
      ],
    },
  ],
};

const lollipopData = [
  { label: 'North', value: 64 },
  { label: 'South', value: 48 },
  { label: 'East', value: 72 },
  { label: 'West', value: 39 },
  { label: 'Central', value: 55 },
];

const stepLineData = {
  series: [
    {
      id: 'plan',
      name: 'Plan',
      points: [
        { x: '2024-01-01', y: 20 },
        { x: '2024-02-01', y: 20 },
        { x: '2024-03-01', y: 45 },
        { x: '2024-04-01', y: 45 },
        { x: '2024-05-01', y: 68 },
        { x: '2024-06-01', y: 68 },
      ],
    },
    {
      id: 'actual',
      name: 'Actual',
      points: [
        { x: '2024-01-01', y: 14 },
        { x: '2024-02-01', y: 31 },
        { x: '2024-03-01', y: 31 },
        { x: '2024-04-01', y: 52 },
        { x: '2024-05-01', y: 52 },
        { x: '2024-06-01', y: 74 },
      ],
    },
  ],
};

const barData = [
  { label: 'Jan', value: 30 },
  { label: 'Feb', value: 45 },
  { label: 'Mar', value: 20 },
  { label: 'Apr', value: 52 },
  { label: 'May', value: 38 },
  { label: 'Jun', value: 61 },
];

const groupedBarData = {
  series: [
    {
      id: 'north',
      name: 'North',
      points: [
        { x: 'Q1', y: 32 },
        { x: 'Q2', y: 45 },
        { x: 'Q3', y: 28 },
        { x: 'Q4', y: 51 },
      ],
    },
    {
      id: 'south',
      name: 'South',
      points: [
        { x: 'Q1', y: 24 },
        { x: 'Q2', y: 31 },
        { x: 'Q3', y: 40 },
        { x: 'Q4', y: 36 },
      ],
    },
    {
      id: 'west',
      name: 'West',
      points: [
        { x: 'Q1', y: 18 },
        { x: 'Q2', y: 22 },
        { x: 'Q3', y: 33 },
        { x: 'Q4', y: 27 },
      ],
    },
  ],
};

function applyTheme(): void {
  const mode = (document.getElementById('mode-select') as HTMLSelectElement).value as
    | 'light'
    | 'dark';
  const scale = (document.getElementById('scale-select') as HTMLSelectElement).value as
    | 'compact'
    | 'default'
    | 'comfortable';

  const ctx = document.getElementById('widget-context')!;
  applyWidgetContext(ctx, {
    mode,
    scale,
    theme:
      mode === 'dark'
        ? {
            primary: '#60a5fa',
            secondary: '#a78bfa',
            background: 'transparent',
            grid: '#374151',
            text: '#f9fafb',
            textMuted: '#9ca3af',
            fontFamily: 'system-ui, sans-serif',
          }
        : undefined,
  });
}

async function mountCharts(): Promise<void> {
  applyTheme();
  const scale = (document.getElementById('scale-select') as HTMLSelectElement).value;
  const orientation = (document.getElementById('orientation-select') as HTMLSelectElement)
    .value;
  const grafType = (document.getElementById('graf-type-select') as HTMLSelectElement).value;

  await loadLineChart();
  const lineHost = document.getElementById('line-host')!;
  lineHost.replaceChildren();
  const lineEl = document.createElement('ui9000-line-chart');
  lineEl.setAttribute('data', JSON.stringify(lineData));
  lineEl.setAttribute('scale', scale);
  lineEl.setAttribute('curve', 'monotone');
  lineEl.toggleAttribute('show-grid', true);
  lineEl.toggleAttribute('show-legend', true);
  lineEl.toggleAttribute('show-tooltip', true);
  lineEl.setAttribute('y-label', 'USD');
  lineHost.appendChild(lineEl);

  await loadLollipop();
  const lollipopHost = document.getElementById('lollipop-host')!;
  lollipopHost.replaceChildren();
  const lollipopEl = document.createElement('ui9000-lollipop');
  lollipopEl.setAttribute('data', JSON.stringify(lollipopData));
  lollipopEl.setAttribute('scale', scale);
  lollipopEl.setAttribute('orientation', orientation);
  lollipopEl.toggleAttribute('show-grid', true);
  lollipopEl.toggleAttribute('show-tooltip', true);
  lollipopEl.setAttribute('y-label', orientation === 'vertical' ? 'Score' : '');
  lollipopHost.appendChild(lollipopEl);

  await loadStepLineChart();
  const stepHost = document.getElementById('step-line-host')!;
  stepHost.replaceChildren();
  const stepEl = document.createElement('ui9000-step-line-chart');
  stepEl.setAttribute('data', JSON.stringify(stepLineData));
  stepEl.setAttribute('scale', scale);
  stepEl.setAttribute('graf-type', grafType);
  stepEl.toggleAttribute('show-grid', true);
  stepEl.toggleAttribute('show-legend', true);
  stepEl.toggleAttribute('show-tooltip', true);
  stepEl.setAttribute('y-label', 'Units');
  stepHost.appendChild(stepEl);

  await loadBarChart();
  const barLayout = (document.getElementById('bar-layout-select') as HTMLSelectElement).value;
  const barHost = document.getElementById('bar-host')!;
  barHost.replaceChildren();
  const barEl = document.createElement('ui9000-bar-chart');
  const singleBar = barLayout === 'single' || barLayout === 'cumulative';
  barEl.setAttribute('data', JSON.stringify(singleBar ? barData : groupedBarData));
  barEl.setAttribute('scale', scale);
  barEl.setAttribute('orientation', orientation);
  barEl.setAttribute('layout', barLayout === 'stacked' ? 'stacked' : 'grouped');
  barEl.toggleAttribute('cumulative-line', barLayout === 'cumulative');
  barEl.toggleAttribute('show-grid', true);
  barEl.toggleAttribute('show-legend', true);
  barEl.toggleAttribute('show-tooltip', true);
  barEl.setAttribute('y-label', orientation === 'vertical' ? 'Units' : '');
  barHost.appendChild(barEl);
}

document.getElementById('bar-layout-select')?.addEventListener('change', () => void mountCharts());
document.getElementById('reload-btn')?.addEventListener('click', () => void mountCharts());
document.getElementById('mode-select')?.addEventListener('change', () => void mountCharts());
document.getElementById('scale-select')?.addEventListener('change', () => void mountCharts());
document
  .getElementById('orientation-select')
  ?.addEventListener('change', () => void mountCharts());
document
  .getElementById('graf-type-select')
  ?.addEventListener('change', () => void mountCharts());

void mountCharts();
