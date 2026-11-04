import { html, nothing, svg, type TemplateResult } from 'lit';


import {
  changeDecimals,
  formatChange,
  formatMetricValue,
  formatNodeValue,
  formatTimelineDate,
  getDateScale,
  getInitials,
  getScaleMonths,
  getScaleShare,
  nearestDate,
  yearOf,
  type NetworkLabels,
  type NetworkNode,
  type NetworkTopic,
  type NodeConnection,
  type PeriodPoint,
  type RankingEntry,
  type TopicMetric,
} from '../lib/index.js';

type Content = TemplateResult | typeof nothing;

/** Draws the metric of a panel; the element fills the box it returns. */
/** A picker in the style of the chart menu; the element keeps which one is open. */
export type MenuPickerSlot = (
  id: string,
  label: string,
  value: string,
  options: Array<{ value: string; label: string }>,
  onPick: (value: string) => void,
) => TemplateResult;

export interface MenuPickerOptions {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  open: boolean;
  onToggle: () => void;
  onPick: (value: string) => void;
  onClose: () => void;
}

/** Label and a button that opens a list, drawn with the chart menu's `menu-*` styles. */
export function renderMenuPicker(options: MenuPickerOptions): TemplateResult {
  const { id, label, value, open, onToggle, onPick, onClose } = options;
  const current = options.options.find((option) => option.value === value)?.label ?? value;
  return html`<div
    class="picker"
    data-picker=${id}
    @keydown=${(event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation();
        onClose();
      }
    }}
  >
    <span class="picker-label" id=${`${id}-label`}>${label}</span>
    <div class="menu-anchor">
      <button
        type="button"
        class="menu-btn picker-btn"
        aria-haspopup="listbox"
        aria-expanded=${open}
        aria-labelledby=${`${id}-label ${id}-value`}
        @click=${onToggle}
      >
        <span id=${`${id}-value`}>${current}</span>
        <svg class="picker-chevron" ?data-open=${open} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </button>
      ${open
        ? html`<div class="menu-dropdown picker-menu" role="listbox" aria-labelledby=${`${id}-label`}>
            ${options.options.map(
              (option) => html`<button
                type="button"
                role="option"
                class="menu-item"
                aria-selected=${option.value === value}
                @click=${() => onPick(option.value)}
              >
                ${option.label}
              </button>`,
            )}
          </div>`
        : nothing}
    </div>
  </div>`;
}

// Bottom corners of the stage: the topic list on the left, the legend on the right.
const TRENDS_LEFT = 12;
const LEGEND_RIGHT = 16;
const BESIDE_GAP = 12;

/** The topic list goes above the legend only when the two do not fit side by side. */
export function topicsCrowdLegend(
  stageWidth: number,
  topicsWidth: number,
  legendWidth: number,
): boolean {
  if (!stageWidth || !topicsWidth || !legendWidth) return false;
  return TRENDS_LEFT + topicsWidth + BESIDE_GAP + legendWidth + LEGEND_RIGHT > stageWidth;
}

export type MetricChartSlot = (
  key: string,
  series: PeriodPoint[],
  metric: TopicMetric | undefined,
  height?: number,
) => Content;

const upperFirst = (text: string): string => (text ? text[0].toUpperCase() + text.slice(1) : text);
const lowerFirst = (text: string): string => (text ? text[0].toLowerCase() + text.slice(1) : text);

function chevron(open: boolean): TemplateResult {
  return html`<svg
    class="trends-chevron"
    ?data-open=${open}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    aria-hidden="true"
  >
    <path d="M2 8 6 4l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>`;
}

/** Arrow and signed change: up-right in green, down-left in red. */
export function trendIndicator(
  change: number,
  unit = '%',
  decimals = 1,
  hint?: string,
): TemplateResult {
  const up = change >= 0;
  const text = formatChange(change, unit, decimals);
  return html`<span
    class="trend"
    ?data-up=${up}
    title=${hint ?? nothing}
    aria-label=${`${up ? 'Up' : 'Down'} ${text}${hint ? `: ${hint}` : ''}`}
  >
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <path
        d=${up ? 'M1.5 9.5 9.5 1.5M3.5 1.5h6v6' : 'M9.5 1.5 1.5 9.5M7.5 9.5h-6v-6'}
        fill="none"
        stroke="currentColor"
        stroke-width="1.3"
      />
    </svg>
    ${text}
  </span>`;
}

const topicRing = (color: string | undefined): TemplateResult =>
  html`<span class="topic-ring" style="border-color:${color ?? 'var(--graph-accent)'}"></span>`;

export interface TrendsOptions {
  topics: NetworkTopic[];
  selected: string | null;
  open: boolean;
  /** Topics are clipped only while they fold, so the card shadows stay whole. */
  moving: boolean;
  /** Title from the data ("Support by issue"). */
  title?: string;
  /** What a topic's change compares, shown on hover. */
  changeHint?: string;
  /** Folded it shows only its header, so it covers neither the graph nor the legend. */
  compact: boolean;
  /** Too narrow for it and the legend side by side: it sits above the legend. */
  raised: boolean;
  /** In the timeline row: the list opens above the row, over the graph. */
  docked: boolean;
  listMaxHeight: number;
  listId: string;
  onSelect: (name: string | null) => void;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * "Trends by Topics": collapsed it shows the selected topic only, expanded the
 * whole list. Picking a topic opens its details on the right.
 */
export function renderTrends(options: TrendsOptions): Content {
  const { topics, selected, open, moving, title, changeHint, compact, raised, docked } = options;
  const { listMaxHeight, listId, onSelect, onToggle, onOpen, onClose } = options;
  if (!topics.length) return nothing;

  const isShown = (name: string): boolean => open || (!compact && name === selected);
  const selectedTopic = topics.find((topic) => topic.name === selected);
  const heading = title ?? 'Trends by Topics';

  const card = (topic: NetworkTopic, shown: boolean): TemplateResult => {
    const isSelected = topic.name === selected;
    return html`<button
      type="button"
      class="topic-card"
      ?data-selected=${isSelected}
      aria-pressed=${isSelected}
      tabindex=${shown ? nothing : -1}
      @click=${() => onSelect(isSelected ? null : topic.name)}
    >
      ${topicRing(topic.color)}
      <span class="topic-name" title=${topic.name}>${topic.name}</span>
      <span class="topic-value">${formatMetricValue(topic.value, topic.unit)}</span>
      ${topic.change != null
        ? trendIndicator(topic.change, topic.changeUnit, 1, changeHint)
        : html`<span></span>`}
    </button>`;
  };

  if (docked) {
    return html`<div
      class="trends-inline"
      ?data-compact=${compact}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <button
        type="button"
        class="trends-inline-button"
        aria-expanded=${open}
        aria-controls=${listId}
        @click=${onToggle}
      >
        ${chevron(open)}
        <span class="trends-inline-text">
          ${heading}
          <span class="trends-inline-topic" title=${selectedTopic?.name ?? nothing}>
            ${selectedTopic
              ? html`${topicRing(selectedTopic.color)}
                  <span>${selectedTopic.name}</span>
                  <span>${formatMetricValue(selectedTopic.value, selectedTopic.unit)}</span>
                  ${!compact && selectedTopic.change != null
                    ? trendIndicator(selectedTopic.change, selectedTopic.changeUnit, 1, changeHint)
                    : nothing}`
              : html`<span>${topics.length} topics</span>`}
          </span>
        </span>
      </button>
      ${open
        ? html`<ul
            id=${listId}
            class="trends-popover"
            aria-label="Topics"
            style="max-height:${listMaxHeight}px"
          >
            ${topics.map((topic) => html`<li>${card(topic, true)}</li>`)}
          </ul>`
        : nothing}
    </div>`;
  }

  const folded = compact && !open;
  const empty = !topics.some((topic) => isShown(topic.name));
  return html`<div class="trends-dock" ?data-folded=${folded} ?data-raised=${raised}>
    <button
      type="button"
      class="trends-header"
      aria-expanded=${open}
      aria-controls=${listId}
      @click=${onToggle}
    >
      ${chevron(open)} ${heading}
    </button>
    ${folded && selectedTopic
      ? html`<button
          type="button"
          class="trends-selected"
          title=${selectedTopic.name}
          aria-controls=${listId}
          @click=${onOpen}
        >
          ${topicRing(selectedTopic.color)} ${selectedTopic.name}
        </button>`
      : nothing}
    <ul
      id=${listId}
      class="trends-list"
      aria-label="Topics"
      ?data-empty=${empty}
      ?data-folded=${folded}
    >
      ${topics.map((topic) => {
        const shown = isShown(topic.name);
        return html`<li
          class="trends-item"
          ?data-shown=${shown}
          ?data-clip=${moving || !shown}
          aria-hidden=${shown ? nothing : 'true'}
        >
          <div><div>${card(topic, shown)}</div></div>
        </li>`;
      })}
    </ul>
  </div>`;
}

// Date ticks: short marks at the top and bottom edge, month ticks longer.
const MINOR_TICK = 6;
const MAJOR_TICK = 12;
/** Dates moved over by Page Up / Page Down. */
const PAGE_DATES = 4;
/** At most this many date ticks; denser data shows every n-th date. */
const MAX_TICKS = 120;
/** Month names on a narrower part of the scale would collide. */
const MIN_MONTH_WIDTH = 0.05;

export interface TimelineOptions {
  /** Shown date (ms), one of `dates`. */
  value: number;
  /** Dates of the data (ms), earliest first. */
  dates: number[];
  /** A narrow widget: a lower bar, so the graph gets the room. */
  compact: boolean;
  /** Shown in the row in front of the year (the topics). */
  leading?: Content;
  onChange: (time: number) => void;
}

/**
 * Year, step buttons and a scale with a draggable date. It only offers the
 * dates of the data: the scale runs from the first to the last date of the
 * shown year, and every move lands on one of them.
 */
export function renderTimeline(options: TimelineOptions): TemplateResult {
  const { value, dates, compact, leading = nothing, onChange } = options;
  const current = dates.includes(value) ? value : nearestDate(dates, value);
  const index = dates.indexOf(current);
  const year = yearOf(current);
  const years = Array.from(new Set(dates.map(yearOf)));
  const yearDates = dates.filter((date) => yearOf(date) === year);
  const scale = getDateScale(yearDates);
  const months = getScaleMonths(scale);
  const every = Math.ceil(yearDates.length / MAX_TICKS);
  const ticks = yearDates
    .filter((_, position) => position % every === 0)
    .map((date) => getScaleShare(date, scale));
  const share = getScaleShare(current, scale);

  const go = (next: number): void => onChange(dates[Math.min(Math.max(next, 0), dates.length - 1)]);

  // Another year opens on its date nearest to the same day of the year.
  const yearIndex = years.indexOf(year);
  const setYear = (next: number): void => {
    const day = new Date(current);
    onChange(
      nearestDate(
        dates.filter((date) => yearOf(date) === next),
        Date.UTC(next, day.getUTCMonth(), day.getUTCDate()),
      ),
    );
  };

  const pick = (event: PointerEvent): void => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width) return;
    const at = (event.clientX - rect.left) / rect.width;
    onChange(nearestDate(yearDates, scale.start + at * (scale.end - scale.start)));
  };

  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowDown: -1,
    ArrowRight: 1,
    ArrowUp: 1,
    PageDown: -PAGE_DATES,
    PageUp: PAGE_DATES,
    Home: -dates.length,
    End: dates.length,
  };

  const yearButton = (up: boolean): TemplateResult => {
    const target = years[yearIndex + (up ? 1 : -1)];
    return html`<button
      type="button"
      class="icon-button year-step"
      aria-label=${up ? 'Next year' : 'Previous year'}
      ?disabled=${target == null}
      @click=${() => setYear(target)}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path
          d=${up ? 'M2 6.5 5 3.5l3 3' : 'M2 3.5 5 6.5l3-3'}
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
        />
      </svg>
    </button>`;
  };

  const stepButton = (right: boolean): TemplateResult => html`<button
    type="button"
    class="icon-button step-button"
    aria-label=${right ? 'Next date' : 'Previous date'}
    ?disabled=${right ? index >= dates.length - 1 : index <= 0}
    @click=${() => go(index + (right ? 1 : -1))}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d=${right ? 'M2 8h12M9 3l5 5-5 5' : 'M14 8H2M7 3 2 8l5 5'}
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>`;

  const tickRow = (bottom: boolean): TemplateResult => html`<svg
    class="timeline-ticks"
    ?data-bottom=${bottom}
    width="100%"
    height=${MAJOR_TICK}
    aria-hidden="true"
  >
    ${ticks.map(
      (tick) => svg`<line
        x1="${tick * 100}%"
        x2="${tick * 100}%"
        y1=${bottom ? MAJOR_TICK - MINOR_TICK : 0}
        y2=${bottom ? MAJOR_TICK : MINOR_TICK}
        stroke="var(--panel-tick-minor)"
      />`,
    )}
    ${months.map((month) =>
      month.share != null
        ? svg`<line
            x1="${month.share * 100}%"
            x2="${month.share * 100}%"
            y1="0"
            y2=${MAJOR_TICK}
            stroke="var(--panel-tick-major)"
          />`
        : nothing,
    )}
  </svg>`;

  return html`<div class="timeline-bar" ?data-compact=${compact}>
    ${leading}
    <div class="year-box">
      <div class="year-text">Year <strong>${year}</strong></div>
      ${years.length > 1
        ? html`<div class="year-stepper">${yearButton(true)} ${yearButton(false)}</div>`
        : nothing}
    </div>
    <div class="step-buttons">${stepButton(false)} ${stepButton(true)}</div>
    <div
      class="timeline-track"
      role="slider"
      tabindex="0"
      aria-label="Date"
      aria-valuemin=${dates[0]}
      aria-valuemax=${dates[dates.length - 1]}
      aria-valuenow=${current}
      aria-valuetext=${`${formatTimelineDate(current)} ${year}`}
      @pointerdown=${(event: PointerEvent) => {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        pick(event);
      }}
      @pointermove=${(event: PointerEvent) => {
        if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) pick(event);
      }}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key in steps) {
          event.preventDefault();
          go(index + steps[event.key]);
        }
      }}
    >
      ${tickRow(false)} ${tickRow(true)}
      ${months.map((month) =>
        month.width >= MIN_MONTH_WIDTH
          ? html`<span class="month-label" style="left:${month.middle * 100}%">${month.label}</span>`
          : nothing,
      )}
      <div class="timeline-thumb" style="left:${share * 100}%">
        <div class="timeline-knob">
          <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true">
            <path
              d="M3.5 1 1 4l2.5 3M6.5 1 9 4 6.5 7"
              fill="none"
              stroke="#FFFFFF"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="timeline-bubble">${formatTimelineDate(current)}</div>
      </div>
    </div>
  </div>`;
}

export const PERIODS = [
  { months: 3, label: 'Last 3 months' },
  { months: 6, label: 'Last 6 months' },
  { months: 12, label: 'Last 12 months' },
];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days from the first to the last point of a metric. */
function spanDays(metric: TopicMetric): number {
  const points = metric.series ?? [];
  if (points.length < 2) return 0;
  const days = (Date.parse(points[points.length - 1].date) - Date.parse(points[0].date)) / DAY_MS;
  return Number.isFinite(days) ? days : 0;
}

const noChartNote = (metric: TopicMetric): string =>
  `${metric.description}${
    (metric.series?.length ?? 0) < 2 ? ' One figure for the whole period, so no chart.' : ''
  }`;

export interface TopicSidebarOptions {
  topic: NetworkTopic | null;
  ranking: RankingEntry[];
  labels?: NetworkLabels;
  period: number;
  metricIndex: number;
  ascending: boolean;
  series: PeriodPoint[];
  chart: MetricChartSlot;
  picker: MenuPickerSlot;
  onPeriod: (months: number) => void;
  onMetric: (index: number) => void;
  onSort: () => void;
}

/** Right column: the selected topic's metrics and the ranking. */
export function renderTopicSidebar(options: TopicSidebarOptions): TemplateResult {
  const { topic, ranking, labels, period, metricIndex, ascending, series, chart, picker } = options;
  const { onPeriod, onMetric, onSort } = options;
  const metrics = topic?.metrics ?? [];
  const metric = metrics[Math.min(metricIndex, metrics.length - 1)];
  // Periods pick nothing when the data is shorter than the shortest one.
  const showPeriod = !labels || Math.max(0, ...metrics.map(spanDays)) > PERIODS[0].months * 30;
  const rows = [...ranking].sort((a, b) => (ascending ? a.value - b.value : b.value - a.value));

  return html`<aside class="sidebar" aria-label="Topic details">
    ${topic && metrics.length
      ? html`<h3 class="sidebar-title">${topic.name}</h3>
          ${showPeriod
            ? html`<div class="period-row">
                ${picker(
                  'period',
                  'Period',
                  String(period),
                  PERIODS.map(({ months, label }) => ({ value: String(months), label })),
                  (value) => onPeriod(Number(value)),
                )}
              </div>`
            : nothing}
          <div class="metric-tabs" role="tablist" aria-label="Metrics">
            ${metrics.slice(0, 3).map((item, index) => {
              const active = item === metric;
              return html`<button
                type="button"
                role="tab"
                class="metric-tab"
                aria-selected=${active}
                ?data-active=${active}
                @click=${() => onMetric(index)}
              >
                <span class="metric-value">
                  ${formatMetricValue(item.value, item.unit)}
                  ${item.change != null
                    ? trendIndicator(
                        item.change,
                        item.changeUnit ?? '',
                        changeDecimals(item.change, item.changeUnit),
                      )
                    : nothing}
                </span>
                <span class="metric-label">${item.label}</span>
              </button>`;
            })}
          </div>
          ${metric?.description ? html`<p class="metric-note">${noChartNote(metric)}</p>` : nothing}
          ${chart('sidebar', series, metric)}`
      : nothing}
    ${rows.length
      ? html`<h3 class="sidebar-title">
            ${labels?.ranking ?? 'Ranking'}
            <button
              type="button"
              class="icon-button"
              aria-label=${ascending ? 'Sort high to low' : 'Sort low to high'}
              @click=${onSort}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M2.5 3h13l-5 6v5.5l-3 1.5V9z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </h3>
          <table class="ranking-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">${labels?.rankingName ?? 'Name'}</th>
                ${labels?.rankingValue
                  ? html`<th scope="col">${labels.rankingValue}</th>
                      <th scope="col">${labels.rankingChange}</th>`
                  : html`<th scope="col" colspan="2">Value</th>`}
              </tr>
            </thead>
            <tbody>
              ${rows.map(
                (row, index) => html`<tr>
                  <td>${index + 1}</td>
                  <td>${row.name}</td>
                  <td>${formatMetricValue(row.value, row.unit)}</td>
                  <td>
                    ${row.change != null
                      ? trendIndicator(
                          row.change,
                          row.changeUnit,
                          labels?.rankingChange ? 1 : 2,
                          labels?.topicChange,
                        )
                      : nothing}
                  </td>
                </tr>`,
              )}
            </tbody>
          </table>`
      : nothing}
  </aside>`;
}

/** Rows each list shows until "View all" opens it. */
const LIST_ROWS = 5;
export const CARD_CHART_MONTHS = 6;
const CARD_CHART_HEIGHT = 240;
const MAX_TILES = 5;

export type CardList = 'topics' | 'connections' | 'ranking';
export type CardTab = 'statistics' | 'bio';

export interface NodeDetailsOptions {
  node: NetworkNode;
  /** Nodes linked to `node`, strongest link first. */
  connections: NodeConnection[];
  /** Topics the node belongs to. */
  topics: string[];
  /** Topic picked in the widget; its ranking is listed. */
  topicName: string | null;
  ranking: RankingEntry[];
  /** Connections of a ranked name when the ranking has none. */
  connectionsOf: (name: string) => number | undefined;
  labels?: NetworkLabels;
  tab: CardTab;
  metricIndex: number;
  open: Record<CardList, boolean>;
  series: PeriodPoint[];
  chart: MetricChartSlot;
  onTab: (tab: CardTab) => void;
  onMetric: (index: number) => void;
  onToggleList: (list: CardList) => void;
  onTopicSelect: (name: string) => void;
  onNodeSelect: (id: string) => void;
}

function viewAll(open: boolean, onToggle: () => void): TemplateResult {
  return html`<button type="button" class="view-all" aria-expanded=${open} @click=${onToggle}>
    ${open ? 'Show less' : 'View all'}
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d=${open ? 'M12 7H2M6 3 2 7l4 4' : 'M2 7h10M8 3l4 4-4 4'}
        fill="none"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>`;
}

/** Enter or Space on a row does what a click does. */
const onRowKey =
  (action: () => void) =>
  (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

const avatar = (name: string, large = false): TemplateResult =>
  html`<span class="avatar" ?data-large=${large} aria-hidden="true">${getInitials(name)}</span>`;

/**
 * Card of the node picked in the focus view: name, statistics or bio, its
 * topics and connections, and the ranking on the current topic.
 */
export function renderNodeDetails(options: NodeDetailsOptions): TemplateResult {
  const { node, connections, topics, topicName, ranking, connectionsOf, labels } = options;
  const { tab, metricIndex, open, series, chart } = options;
  const { onTab, onMetric, onToggleList, onTopicSelect, onNodeSelect } = options;
  const name = node.label;
  const metrics = (node.metrics ?? []).slice(0, MAX_TILES);
  const hasBio = !!node.bio?.trim();
  const metric = metrics[Math.min(metricIndex, metrics.length - 1)];
  const showTabs = metrics.length > 0 || hasBio;
  const currentTab: CardTab = tab === 'bio' && hasBio ? 'bio' : 'statistics';
  const visible = <T,>(rows: T[], list: CardList): T[] =>
    open[list] ? rows : rows.slice(0, LIST_ROWS);
  const linksTitle = node.linksLabel ?? 'Connections';
  const rankingTitle = labels?.ranking
    ? topicName
      ? `${topicName}: ${lowerFirst(labels.ranking)}`
      : labels.ranking
    : topicName
      ? `Ranking on ${topicName}`
      : 'Ranking';

  const cardTab = (value: CardTab, text: string): TemplateResult => html`<button
    type="button"
    role="tab"
    class="card-tab"
    aria-selected=${currentTab === value}
    ?data-active=${currentTab === value}
    @click=${() => onTab(value)}
  >
    ${text}
  </button>`;

  return html`<aside class="node-card" aria-label=${`${name} details`}>
    <div class="card-header">
      ${avatar(name, true)}
      <div class="card-name">
        <strong title=${name}>${name}</strong>
        <span>${node.role ?? node.type}</span>
      </div>
    </div>
    ${showTabs
      ? html`<div class="card-tabs" role="tablist" aria-label="Node details">
            ${metrics.length ? cardTab('statistics', 'Statistics') : nothing}
            ${hasBio ? cardTab('bio', labels?.bio ?? 'Bio') : nothing}
          </div>
          <div class="card-body">
            ${currentTab === 'bio' || !metrics.length
              ? html`<p class="card-bio">${node.bio}</p>`
              : html`<div
                    class="card-tiles"
                    role="tablist"
                    aria-label="Statistics"
                    style="grid-template-columns:repeat(${metrics.length},minmax(0,auto))"
                  >
                    ${metrics.map((item, index) => {
                      const active = item === metric;
                      return html`<button
                        type="button"
                        role="tab"
                        class="card-tile"
                        aria-selected=${active}
                        ?data-active=${active}
                        @click=${() => onMetric(index)}
                      >
                        <span class="card-tile-value">
                          ${formatMetricValue(item.value, item.unit)}
                          ${item.change != null
                            ? trendIndicator(
                                item.change,
                                item.changeUnit ?? '',
                                changeDecimals(item.change, item.changeUnit),
                              )
                            : nothing}
                        </span>
                        <span class="card-tile-label">${item.label}</span>
                      </button>`;
                    })}
                  </div>
                  ${metric?.description
                    ? html`<p class="metric-note">${noChartNote(metric)}</p>`
                    : nothing}
                  ${chart('card', series, metric, CARD_CHART_HEIGHT)}`}
          </div>`
      : nothing}
    ${topics.length || connections.length
      ? html`<div
          class="card-columns"
          style="grid-template-columns:repeat(${(topics.length ? 1 : 0) +
          (connections.length ? 1 : 0)},minmax(0,1fr))"
        >
          ${topics.length
            ? html`<section class="card-section" aria-label="Topics">
                <h3 class="card-section-title">
                  <span>Topics</span>
                  ${topics.length > LIST_ROWS
                    ? viewAll(open.topics, () => onToggleList('topics'))
                    : nothing}
                </h3>
                <table class="card-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${visible(topics, 'topics').map((topic, index) => {
                      const active = topic === topicName;
                      return html`<tr
                        class="card-row"
                        ?data-active=${active}
                        tabindex="0"
                        aria-current=${active ? 'true' : nothing}
                        @click=${() => onTopicSelect(topic)}
                        @keydown=${onRowKey(() => onTopicSelect(topic))}
                      >
                        <td>${index + 1}</td>
                        <td class="card-name-cell" title=${topic}>
                          <span class="card-cell-name"><span>${topic}</span></span>
                        </td>
                      </tr>`;
                    })}
                  </tbody>
                </table>
              </section>`
            : nothing}
          ${connections.length
            ? html`<section class="card-section" aria-label=${linksTitle}>
                <h3 class="card-section-title">
                  <span>${linksTitle}</span>
                  ${connections.length > LIST_ROWS
                    ? viewAll(open.connections, () => onToggleList('connections'))
                    : nothing}
                </h3>
                <table class="card-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Name</th>
                      ${labels?.linkValue
                        ? html`<th scope="col" class="cell-end">${upperFirst(labels.linkValue)}</th>`
                        : nothing}
                    </tr>
                  </thead>
                  <tbody>
                    ${visible(connections, 'connections').map(
                      (item, index) => html`<tr
                        class="card-row"
                        tabindex="0"
                        @click=${() => onNodeSelect(item.node.id)}
                        @keydown=${onRowKey(() => onNodeSelect(item.node.id))}
                      >
                        <td>${index + 1}</td>
                        <td class="card-name-cell" title=${item.node.label}>
                          <span class="card-cell-name">
                            ${avatar(item.node.label)}
                            <span>${item.node.label}</span>
                          </span>
                        </td>
                        ${labels?.linkValue
                          ? html`<td class="cell-end">${formatNodeValue(item.weight)}</td>`
                          : nothing}
                      </tr>`,
                    )}
                  </tbody>
                </table>
              </section>`
            : nothing}
        </div>`
      : nothing}
    ${ranking.length
      ? html`<section class="card-section" aria-label=${labels?.ranking ?? 'Ranking'}>
          <h3 class="card-section-title">
            <span title=${rankingTitle}>
              ${labels?.ranking
                ? topicName
                  ? html`<em>${topicName}</em>: ${lowerFirst(labels.ranking)}`
                  : labels.ranking
                : topicName
                  ? html`Ranking on <em>${topicName}</em>`
                  : 'Ranking'}
            </span>
            ${ranking.length > LIST_ROWS
              ? viewAll(open.ranking, () => onToggleList('ranking'))
              : nothing}
          </h3>
          <table class="card-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">${labels?.rankingName ?? 'Title'}</th>
                <th scope="col">${labels?.rankingValue ?? 'Value'}</th>
                <th scope="col" class="cell-end">${labels?.rankingChange ?? 'Connections'}</th>
              </tr>
            </thead>
            <tbody>
              ${visible(ranking, 'ranking').map(
                (row, index) => html`<tr>
                  <td>${index + 1}</td>
                  <td class="card-name-cell" title=${row.name}>
                    <span class="card-cell-name">${avatar(row.name)}<span>${row.name}</span></span>
                  </td>
                  <td>${formatMetricValue(row.value, row.unit)}</td>
                  <td class="cell-end">
                    ${labels?.rankingChange
                      ? row.change != null
                        ? trendIndicator(row.change, row.changeUnit, 1, labels.topicChange)
                        : nothing
                      : (row.connections ?? connectionsOf(row.name) ?? '—')}
                  </td>
                </tr>`,
              )}
            </tbody>
          </table>
        </section>`
      : nothing}
  </aside>`;
}

export interface CompactDetailsOptions {
  /** Topic or node the details are about. */
  title: string;
  /** Shown next to the title while folded. */
  metrics?: TopicMetric[];
  open: boolean;
  bodyId: string;
  body: Content;
  onToggle: () => void;
}

/** The details column of a narrow widget: under the graph, folded to one line until opened. */
export function renderCompactDetails(options: CompactDetailsOptions): TemplateResult {
  const { title, metrics = [], open, bodyId, body, onToggle } = options;
  return html`<section class="compact-panel">
    <button
      type="button"
      class="compact-header"
      aria-expanded=${open}
      aria-controls=${bodyId}
      @click=${onToggle}
    >
      ${chevron(!open)}
      <span class="compact-title" title=${title}>${title}</span>
      ${metrics.slice(0, 3).map(
        (metric) => html`<span class="compact-metric">
          ${metric.label} <b>${formatMetricValue(metric.value, metric.unit)}</b>
        </span>`,
      )}
    </button>
    ${open ? html`<div class="compact-body" id=${bodyId}>${body}</div>` : nothing}
  </section>`;
}

const ALL_TOPICS = 'All topics';

export interface FocusHeaderOptions {
  node: NetworkNode;
  topicNames: string[];
  topicName: string | null;
  /** What a topic is in the data ("Issue"); names the picker. */
  topicLabel?: string;
  picker: MenuPickerSlot;
  onClose: () => void;
  onTopicChange: (name: string) => void;
}

/** Bar of the focus view: back, the node's name and the topic picker. */
export function renderFocusHeader(options: FocusHeaderOptions): TemplateResult {
  const { node, topicNames, topicName, topicLabel, picker, onClose, onTopicChange } = options;
  return html`<div class="focus-header">
    <button type="button" class="focus-back" aria-label="Back to the network" @click=${onClose}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M10 3 5 8l5 5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <h2 class="focus-title" title=${node.label}>${node.label}</h2>
    ${topicNames.length
      ? html`<div class="topic-picker">
          ${picker(
            'topic',
            topicLabel ?? 'Topic',
            topicName ?? ALL_TOPICS,
            (topicName ? topicNames : [ALL_TOPICS, ...topicNames]).map((name) => ({
              value: name,
              label: name,
            })),
            (name) => {
              if (name !== ALL_TOPICS) onTopicChange(name);
            },
          )}
        </div>`
      : nothing}
  </div>`;
}
