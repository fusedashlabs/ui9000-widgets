import { css } from 'lit';

export { stepLineChartStyles as biasVarianceTradeoffChartStyles } from '../../step-line-chart/element/styles.js';

/**
 * The crosshair focuses the curve nearest the cursor and dims its siblings in
 * the plot; the tooltip rows follow the same emphasis.
 */
export const biasVarianceHoverStyles = css`
  .tooltip .row.focused {
    font-weight: 600;
  }
  .tooltip .row.dimmed {
    opacity: 0.65;
  }
`;
