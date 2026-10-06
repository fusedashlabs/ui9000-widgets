import { css } from 'lit';

/**
 * Dark values are sampled from the Figma card (node 34:24312, 2x export
 * halved to CSS px). The shell matches the component asset card. Light is the
 * same structure on the white surface the sibling cards use.
 */
export const incidentsReviewStyles = css`
  :host {
    display: block;
    min-height: 0;
    font-family: var(--ui9000-font-family, Inter, system-ui, -apple-system, sans-serif);
    -webkit-font-smoothing: antialiased;
    --irc-bezel: linear-gradient(180deg, #eceef1 0%, #e4e7eb 100%);
    --irc-border: #dfe2e7;
    --irc-highlight: rgba(255, 255, 255, 0.9);
    --irc-surface: linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%);
    --irc-text: #21262e;
    --irc-muted: #6c7584;
    --irc-green: #18a865;
    --irc-red: #e0404f;
    --irc-amber: #dd9a12;
    --irc-blue: #2f7fe0;
    --irc-violet: #7c5ce0;
    --irc-grey: #8a929e;
    --irc-tick: #c9cdd3;
    --irc-seg-from: 14%;
    --irc-seg-to: 36%;
    --irc-value-font: 'Barlow Condensed', 'Avenir Next Condensed', 'Roboto Condensed', 'Arial Narrow',
      var(--ui9000-font-family, Inter), sans-serif;
  }

  :host([data-mode='dark']) {
    --irc-bezel: linear-gradient(180deg, #2a2727 0%, #312d2d 100%);
    --irc-border: rgba(255, 255, 255, 0.05);
    --irc-highlight: rgba(255, 255, 255, 0.42);
    --irc-surface: linear-gradient(180deg, #211f1f 0%, #272424 100%);
    --irc-text: #ffffff;
    --irc-muted: #919090;
    --irc-green: #3cb97a;
    --irc-red: #ff6f71;
    --irc-amber: #f0b424;
    --irc-blue: #5aa9ff;
    --irc-violet: #b18cff;
    --irc-grey: #a4a9b1;
    --irc-tick: #504e4e;
    --irc-seg-from: 11%;
    --irc-seg-to: 32%;
  }

  .card {
    box-sizing: border-box;
    height: 100%;
    padding: 5px;
    border: 1px solid var(--irc-border);
    border-radius: 15px;
    background: var(--irc-bezel);
    box-shadow: inset 0 1px 0 var(--irc-highlight);
    color: var(--irc-text);
    container-type: inline-size;
  }

  .surface {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 7px 11px 10px 10px;
    border-radius: 10px;
    background: var(--irc-surface);
    overflow: hidden;
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-height: 20px;
  }

  .title {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .filter {
    flex: none;
    max-width: 50%;
    margin: 4px 0 0 auto;
    padding: 0 8.5px;
    overflow: hidden;
    font-size: 12px;
    line-height: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Scale mark: a baseline with a short tick at each end. */
  .filter.scale {
    background:
      linear-gradient(currentColor, currentColor) left bottom / 1px 6px no-repeat,
      linear-gradient(currentColor, currentColor) right bottom / 1px 6px no-repeat,
      linear-gradient(currentColor, currentColor) left bottom / 100% 1px no-repeat;
  }

  .columns {
    display: grid;
    column-gap: 1px;
    margin-top: 13px;
  }

  /* The numbers share the card's columns, so the ticks sit under the total. */
  .numbers {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    column-gap: 1px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .count {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    --irc-tone: var(--irc-grey);
  }

  .green { --irc-tone: var(--irc-green); }
  .red { --irc-tone: var(--irc-red); }
  .amber { --irc-tone: var(--irc-amber); }
  .blue { --irc-tone: var(--irc-blue); }
  .violet { --irc-tone: var(--irc-violet); }
  .grey { --irc-tone: var(--irc-grey); }

  .count.total {
    align-items: flex-end;
    text-align: end;
  }

  .value {
    max-width: 100%;
    font-family: var(--irc-value-font);
    font-size: var(--irc-value-size, 43px);
    font-weight: 400;
    font-feature-settings: 'tnum', 'zero';
    line-height: 34px;
    white-space: nowrap;
  }

  .label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: calc(100% - 6px);
    color: var(--irc-muted);
    font-size: 11px;
    line-height: 14px;
    white-space: nowrap;
  }

  /* Long state names stop short of the next column. */
  .label-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* No dot, so the total label sits tighter under its number, as in Figma. */
  .count.total .label {
    margin-top: -2px;
    font-size: 12px;
  }

  .dot {
    width: 5.5px;
    height: 5.5px;
    flex: none;
    border-radius: 1.5px;
    background: var(--irc-tone);
  }

  .stages,
  .ticks {
    height: 16px;
    margin-top: 10px;
  }

  .stages {
    display: flex;
    gap: 1px;
    min-width: 0;
  }

  /* Lifecycle segment, sized by its count: the tone fades in from the left to a bright edge. */
  .seg {
    flex-basis: 0;
    min-width: 12px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--irc-tone) var(--irc-seg-from), transparent),
      color-mix(in srgb, var(--irc-tone) var(--irc-seg-to), transparent)
    );
    box-shadow: inset -2px 0 0 var(--irc-tone);
  }

  .seg:first-child {
    border-radius: 1.5px 0 0 1.5px;
  }

  /* The total is not a stage: grey ticks, whole ones only. */
  .ticks {
    background: linear-gradient(90deg, var(--irc-tick) 2px, transparent 2px) 0 0 / 3px 100% space;
  }

  .columns[data-states='4'] {
    --irc-value-size: 38px;
  }

  .columns[data-states='5'],
  .columns[data-states='6'],
  .columns[data-states='7'],
  .columns[data-states='8'] {
    --irc-value-size: 32px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .empty {
    margin: 0;
    padding: 24px 0;
    color: var(--irc-muted);
    font-size: 13px;
    text-align: center;
  }

  @container (max-width: 280px) {
    .columns {
      --irc-value-size: 34px;
    }

    .columns[data-states='4'],
    .columns[data-states='5'],
    .columns[data-states='6'],
    .columns[data-states='7'],
    .columns[data-states='8'] {
      --irc-value-size: 28px;
    }
  }
`;
