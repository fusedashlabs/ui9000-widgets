import { css } from 'lit';

/** Panels around the graph: layout, topics, timeline, details and the focus view. */
export const networkPanelStyles = css`
  .network-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    min-width: 0;
    gap: 12px;
    line-height: normal;
  }
  .network-layout[hidden] {
    display: none;
  }
  .network-layout[data-compact] {
    flex-direction: column;
  }
  .network-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  /* A narrow widget keeps room for the graph when its details open below. */
  .network-layout[data-compact] .network-main {
    min-height: 380px;
  }
  .icon-button,
  .trends-header,
  .trends-selected,
  .trends-inline-button,
  .topic-card,
  .metric-tab,
  .card-tab,
  .card-tile,
  .view-all,
  .compact-header {
    border: 0;
    padding: 0;
    background: transparent;
    font-family: inherit;
    cursor: pointer;
  }
  .icon-button:focus-visible,
  .trends-header:focus-visible,
  .trends-selected:focus-visible,
  .trends-inline-button:focus-visible,
  .topic-card:focus-visible,
  .metric-tab:focus-visible,
  .card-tab:focus-visible,
  .card-tile:focus-visible,
  .view-all:focus-visible,
  .compact-header:focus-visible,
  .timeline-track:focus-visible {
    outline: 2px solid #0098e6;
    outline-offset: 1px;
  }
  .data-control {
    position: absolute;
    top: 12px;
    left: 50%;
    z-index: 4;
    display: flex;
    align-items: center;
    transform: translateX(-50%);
  }
  .data-control[hidden] {
    display: none;
  }
  .stage-message {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    padding: 24px;
    text-align: center;
    font-size: 14px;
    line-height: 20px;
    color: var(--panel-muted);
    pointer-events: none;
  }

  /* The details column of a narrow widget, under the graph and folded. */
  .compact-panel {
    flex: 0 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-radius: 12px;
    background: var(--panel-sidebar);
    color: var(--panel-text);
  }
  .compact-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 10px;
    min-width: 0;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 18px;
    text-align: left;
    color: var(--panel-text);
  }
  .compact-title {
    flex: 0 0 auto;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .compact-metric {
    flex-shrink: 0;
    color: var(--panel-muted);
    font-variant-numeric: tabular-nums;
  }
  .compact-metric b {
    font-weight: 600;
    color: var(--panel-text);
  }
  .compact-body {
    display: flex;
    min-height: 0;
    overflow-y: auto;
  }
  .compact-body > aside {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
    overflow: visible;
  }

  /* On a see-through background the chart under it shows dimmed and blurred. */
  .trends-dock {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 4;
    width: 292px;
    max-width: calc(100% - 24px);
    max-height: calc(100% - 84px);
    display: flex;
    flex-direction: column;
    padding: 8px 4px 4px 10px;
    box-sizing: border-box;
    border-radius: 12px;
    background: var(--panel-dock);
    backdrop-filter: blur(4px);
  }
  .trends-dock[data-folded] {
    bottom: 16px;
    width: auto;
    padding: 10px 14px;
  }
  .trends-dock[data-raised] {
    bottom: 64px;
    max-height: calc(100% - 136px);
  }
  .trends-header {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    align-self: flex-start;
    padding: 4px 6px;
    margin: -4px -6px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 18px;
    color: var(--panel-text);
  }
  .trends-selected {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    margin-top: 8px;
    padding: 4px 10px;
    border-radius: 999px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: var(--panel-text);
    background: var(--panel-card);
    box-shadow: var(--panel-topic-shadow);
  }
  .trends-inline {
    position: relative;
    display: flex;
    flex: 0 1 320px;
    min-width: 0;
    border-right: 1px solid var(--panel-bar-edge);
  }
  .trends-inline[data-compact] {
    flex-basis: 220px;
  }
  .trends-inline-button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-width: 0;
    padding: 0 14px 0 22px;
    text-align: left;
    color: var(--panel-text);
  }
  .trends-inline[data-compact] .trends-inline-button {
    padding: 0 10px 0 14px;
  }
  .trends-inline-button:hover {
    background: var(--panel-tab);
  }
  .trends-inline-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-size: 11px;
    line-height: 13px;
    color: var(--panel-muted);
  }
  .trends-inline-topic {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 13px;
    line-height: 20px;
    font-weight: 600;
    color: var(--panel-text);
  }
  .trends-inline-topic > span:nth-child(2) {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .trends-inline-topic > span:nth-child(n + 3) {
    flex: none;
    font-weight: 400;
  }
  .trends-popover {
    position: absolute;
    left: 12px;
    bottom: calc(100% + 12px);
    z-index: 5;
    width: 292px;
    margin: 0;
    padding: 2px 10px 10px;
    box-sizing: border-box;
    list-style: none;
    overflow-y: auto;
    border-radius: 12px;
    background: var(--panel-dock);
    backdrop-filter: blur(4px);
    box-shadow: var(--panel-card-shadow);
  }
  .trends-popover > li {
    padding-top: 8px;
  }
  .trends-chevron {
    flex: none;
    transition: transform 0.2s ease;
  }
  .trends-chevron[data-open] {
    transform: rotate(180deg);
  }
  .trends-list {
    list-style: none;
    margin: 0;
    padding: 0 6px 6px 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    transition: padding-bottom 280ms ease;
  }
  .trends-list[data-empty] {
    padding-bottom: 0;
  }
  .trends-list[data-folded] {
    display: none;
  }
  .trends-item {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition:
      grid-template-rows 280ms ease,
      opacity 280ms ease,
      visibility 0s linear 280ms;
  }
  .trends-item[data-shown] {
    grid-template-rows: 1fr;
    opacity: 1;
    visibility: visible;
    transition:
      grid-template-rows 280ms ease,
      opacity 280ms ease,
      visibility 0s linear 0s;
  }
  .trends-item > div {
    min-height: 0;
    overflow: visible;
  }
  .trends-item[data-clip] > div {
    overflow: hidden;
  }
  /* The gap above a card folds away with it. */
  .trends-item > div > div {
    padding-top: 8px;
  }
  @media (prefers-reduced-motion: reduce) {
    .trends-list,
    .trends-item,
    .trends-item[data-shown] {
      transition: none;
    }
  }
  .topic-card {
    width: 100%;
    min-height: 52px;
    display: grid;
    grid-template-columns: 8px 1fr auto auto;
    align-items: center;
    column-gap: 17px;
    padding: 8px 14px 8px 12px;
    box-sizing: border-box;
    border-radius: 12px;
    text-align: left;
    background: var(--panel-card);
    box-shadow: var(--panel-topic-shadow);
    border: 1px solid transparent;
    transition: border-color 0.2s ease;
  }
  .topic-card[data-selected] {
    background: var(--panel-card-selected);
    border-color: #0098e6;
  }
  .topic-ring {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid;
    box-sizing: border-box;
  }
  .topic-name {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 13px;
    line-height: 17px;
    color: var(--panel-text);
  }
  .topic-value {
    font-size: 13px;
    line-height: 17px;
    color: var(--panel-text);
    font-variant-numeric: tabular-nums;
  }
  .trend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 56px;
    font-size: 13px;
    line-height: 17px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    color: var(--panel-down);
  }
  .trend[data-up] {
    color: var(--panel-up);
  }

  .timeline-bar {
    position: relative;
    display: flex;
    flex: none;
    align-items: stretch;
    height: 57px;
    margin-top: 36px;
    background: var(--panel-bar);
    border-top: 1px solid var(--panel-bar-edge);
    user-select: none;
  }
  .timeline-bar[data-compact] {
    height: 40px;
    margin-top: 30px;
  }
  .year-box {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    width: 138px;
    box-sizing: border-box;
    padding: 0 12px 0 22px;
    background: var(--panel-year-box);
  }
  .timeline-bar[data-compact] .year-box {
    gap: 8px;
    width: 104px;
    padding: 0 6px 0 14px;
  }
  .year-text {
    display: flex;
    flex-direction: column;
    font-size: 11px;
    line-height: 13px;
    color: var(--panel-muted);
  }
  .year-text strong {
    font-size: 15px;
    line-height: 20px;
    font-weight: 600;
    color: var(--panel-text);
  }
  .year-stepper {
    display: flex;
    flex-direction: column;
  }
  .icon-button {
    display: grid;
    place-items: center;
    color: var(--panel-text);
    border-radius: 4px;
  }
  .icon-button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  /* A 32 x 24 target each; the arrow itself stays small. */
  .year-step {
    width: 32px;
    height: 24px;
  }
  .timeline-bar[data-compact] .year-step {
    height: 18px;
  }
  .year-step:hover:not(:disabled) {
    background: var(--panel-button);
  }
  .step-buttons {
    display: flex;
    flex: none;
    align-items: center;
    gap: 4px;
    padding: 0 16px 0 22px;
  }
  .timeline-bar[data-compact] .step-buttons {
    padding: 0 8px 0 10px;
  }
  .step-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--panel-button);
  }
  .timeline-bar[data-compact] .step-button {
    width: 28px;
    height: 28px;
  }
  .timeline-track {
    position: relative;
    flex: 1;
    min-width: 0;
    margin-right: 18px;
    cursor: pointer;
    touch-action: none;
  }
  .timeline-ticks {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
  }
  .timeline-ticks[data-bottom] {
    top: auto;
    bottom: 0;
  }
  .month-label {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 12px;
    line-height: 16px;
    color: var(--panel-faint);
    pointer-events: none;
  }
  .timeline-thumb {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 1px solid #0098e6;
    pointer-events: none;
  }
  .timeline-knob {
    position: absolute;
    top: 50%;
    left: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #0098e6;
    transform: translate(-50%, -50%);
    display: grid;
    place-items: center;
  }
  .timeline-bubble {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    transform: translateX(-50%);
    padding: 4px 10px;
    border-radius: 999px;
    white-space: nowrap;
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    color: var(--panel-text);
    background: var(--panel-bubble);
    box-shadow: var(--panel-card-shadow);
  }

  .sidebar {
    width: 316px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 18px 16px;
    box-sizing: border-box;
    border-radius: 12px;
    overflow-y: auto;
    background: var(--panel-sidebar);
    color: var(--panel-text);
  }
  .sidebar-title {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 15px;
    line-height: 20px;
    font-weight: 600;
    color: var(--panel-text);
  }
  .metric-note {
    margin: 0;
    font-size: 12px;
    line-height: 16px;
    color: var(--panel-muted);
  }
  .period-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--panel-muted);
  }
  .period-row select {
    appearance: none;
    border: 0;
    padding: 0 16px 0 0;
    font: inherit;
    color: var(--panel-text);
    background: transparent
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0h8L4 5z' fill='%238A8F99'/%3E%3C/svg%3E")
      no-repeat right center;
    cursor: pointer;
  }
  .metric-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
  }
  .metric-tab {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 8px 6px;
    border-radius: 4px;
    text-align: left;
  }
  .metric-tab[data-active] {
    background: var(--panel-tab);
  }
  .metric-value {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 4px;
    white-space: nowrap;
    font-size: 17px;
    line-height: 22px;
    font-weight: 600;
    color: var(--panel-text);
  }
  .metric-value > .trend,
  .card-tile-value > .trend {
    min-width: 0;
  }
  .metric-label {
    overflow-wrap: break-word;
    font-size: 13px;
    line-height: 16px;
    color: var(--panel-muted);
  }
  .metric-tab[data-active] .metric-label {
    color: var(--panel-text);
  }
  .metric-chart {
    width: 100%;
    min-width: 0;
    flex: none;
  }
  .ranking-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .ranking-table th {
    padding: 0 0 10px;
    font-size: 11px;
    font-weight: 400;
    text-align: left;
    color: var(--panel-muted);
    border-bottom: 1px solid var(--panel-line);
  }
  .ranking-table td {
    height: 32px;
    padding: 0;
    color: var(--panel-text);
    font-variant-numeric: tabular-nums;
  }
  .ranking-table td:first-child {
    width: 28px;
    color: var(--panel-faint);
  }
  .ranking-table th:nth-child(3),
  .ranking-table td:nth-child(3),
  .ranking-table th:last-child,
  .ranking-table td:last-child {
    text-align: right;
  }
  .ranking-table td:nth-child(3) {
    padding-right: 14px;
  }

  .node-card {
    flex: 0 1 520px;
    min-width: 360px;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow-y: auto;
    background: var(--panel-sidebar);
    color: var(--panel-text);
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 64px;
    padding: 12px 24px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--panel-line);
  }
  .avatar {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 500;
    color: var(--panel-muted);
    background: var(--panel-tab);
    box-shadow: inset 0 0 0 1px var(--panel-line);
  }
  .avatar[data-large] {
    width: 40px;
    height: 40px;
    font-size: 15px;
  }
  .card-name {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .card-name strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 18px;
    line-height: 24px;
    font-weight: 500;
    color: var(--panel-text);
  }
  .card-name span {
    font-size: 15px;
    line-height: 20px;
    color: var(--panel-muted);
  }
  .card-tabs {
    display: flex;
    align-items: stretch;
    gap: 28px;
    padding: 0 24px;
    border-bottom: 1px solid var(--panel-line);
  }
  .card-tab {
    padding: 8px 0 6px;
    font-size: 16px;
    line-height: 20px;
    color: var(--panel-muted);
    border-bottom: 2px solid transparent;
  }
  .card-tab[data-active] {
    color: #0098e6;
    border-bottom-color: #0098e6;
  }
  .card-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 20px 20px;
  }
  .card-tiles {
    display: grid;
    gap: 4px;
  }
  .card-tile {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 10px 8px;
    border-radius: 6px;
    text-align: left;
  }
  .card-tile[data-active] {
    background: var(--panel-tab);
  }
  .card-tile-value {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 6px;
    white-space: nowrap;
    font-size: 18px;
    line-height: 22px;
    font-weight: 600;
    color: var(--panel-text);
  }
  .card-tile-label {
    overflow-wrap: break-word;
    font-size: 15px;
    line-height: 19px;
    color: var(--panel-muted);
  }
  .card-tile[data-active] .card-tile-label {
    color: var(--panel-text);
  }
  .card-bio {
    margin: 0;
    font-size: 15px;
    line-height: 22px;
    color: var(--panel-text);
    white-space: pre-line;
  }
  .card-columns {
    display: grid;
    border-top: 1px solid var(--panel-line);
  }
  .card-columns > section + section {
    border-left: 1px solid var(--panel-line);
  }
  .card-section {
    min-width: 0;
    border-top: 1px solid var(--panel-line);
  }
  .card-columns > .card-section {
    border-top: 0;
  }
  .card-section-title {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 0 20px;
    border-bottom: 1px solid var(--panel-line);
    font-size: 17px;
    line-height: 24px;
    font-weight: 600;
    white-space: nowrap;
    color: var(--panel-text);
  }
  .card-section-title > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-section-title em {
    font-style: normal;
    color: #0098e6;
  }
  .view-all {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 400;
    color: #0098e6;
  }
  .card-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 16px;
  }
  .card-table th {
    height: 36px;
    padding: 0 8px 0 0;
    font-size: 13px;
    line-height: 16px;
    font-weight: 400;
    text-align: left;
    vertical-align: bottom;
    color: var(--panel-muted);
  }
  .card-table td {
    height: 32px;
    padding: 0 8px 0 0;
    color: var(--panel-text);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .card-table th:first-child,
  .card-table td:first-child {
    width: 36px;
    padding-left: 20px;
    color: var(--panel-faint);
  }
  .card-table th:last-child,
  .card-table td:last-child {
    padding-right: 20px;
  }
  .card-table tbody tr:first-child td {
    padding-top: 4px;
  }
  .card-table .cell-end {
    text-align: right;
  }
  .card-row {
    cursor: pointer;
  }
  .card-row[data-active] {
    background: var(--panel-bar);
    box-shadow: inset 3px 0 0 #0098e6;
  }
  .card-row:hover {
    background: var(--panel-tab);
  }
  .card-row:focus-visible {
    outline: 2px solid #0098e6;
    outline-offset: -2px;
  }
  .card-cell-name {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .card-cell-name > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Takes the free width of its table; a long name ends with "...". */
  .card-table .card-name-cell {
    width: 100%;
    max-width: 0;
  }

  .focus-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
    background: var(--focus-background);
    animation: focus-appear 260ms ease-out both;
  }
  .focus-overlay:focus-visible {
    outline: 2px solid #0098e6;
    outline-offset: -2px;
  }
  .focus-overlay:focus:not(:focus-visible) {
    outline: none;
  }
  @keyframes focus-appear {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .focus-overlay {
      animation: none;
    }
  }
  .focus-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 16px;
    height: 64px;
    padding-left: 24px;
    background: var(--panel-card);
    border-bottom: 1px solid var(--panel-line);
  }
  .focus-back {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    color: #ffffff;
    background: #0098e6;
  }
  .focus-back:focus-visible {
    outline: 2px solid #0098e6;
    outline-offset: 2px;
  }
  .focus-title {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 20px;
    line-height: 26px;
    font-weight: 400;
    color: var(--panel-text);
  }
  .topic-picker {
    flex-shrink: 0;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    min-width: 220px;
    padding: 0 24px;
    box-sizing: border-box;
    border-left: 1px solid var(--panel-line);
    font-size: 13px;
    line-height: 16px;
    color: var(--panel-muted);
  }
  .topic-picker select {
    appearance: none;
    border: 0;
    padding: 0 28px 0 0;
    font: inherit;
    font-size: 16px;
    line-height: 22px;
    color: var(--panel-text);
    background: transparent
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='8'%3E%3Cpath d='M1 1l6 6 6-6' fill='none' stroke='%238A8F99' stroke-width='1.5'/%3E%3C/svg%3E")
      no-repeat right center;
    cursor: pointer;
  }
  .topic-picker select:focus-visible {
    outline: 2px solid #0098e6;
    outline-offset: 2px;
  }
  .focus-canvas {
    position: relative;
    flex: 1;
    min-height: 0;
  }
`;
