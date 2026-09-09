import { html, nothing, type TemplateResult } from 'lit';

export type ChartLegendSwatch =
  | { kind: 'line'; color: string }
  | { kind: 'swatch'; color: string; opacity?: number }
  | { kind: 'dashed-line'; color: string };

export type ChartLegendEntry = {
  label: string;
  swatch: ChartLegendSwatch;
};

function renderSwatch(swatch: ChartLegendSwatch): TemplateResult {
  if (swatch.kind === 'swatch') {
    const opacity = swatch.opacity ?? 1;
    return html`<span
      class="legend-swatch"
      style="background:${swatch.color};opacity:${opacity}"
    ></span>`;
  }
  if (swatch.kind === 'dashed-line') {
    return html`<span
      class="legend-line legend-line--dashed"
      style="--legend-color:${swatch.color}"
    ></span>`;
  }
  return html`<span
    class="legend-line"
    style="--legend-color:${swatch.color}"
  ><span class="legend-dot" style="background:${swatch.color}"></span></span>`;
}

/** HTML legend row above the plot (MCP shell — not SVG). */
export function renderChartLegend(
  entries: ChartLegendEntry[],
): TemplateResult | typeof nothing {
  if (!entries.length) return nothing;
  return html`
    <div class="chart-legend" part="legend">
      ${entries.map(
        (entry) => html`
          <span class="legend-item">
            ${renderSwatch(entry.swatch)}
            <span class="legend-label">${entry.label}</span>
          </span>
        `,
      )}
    </div>
  `;
}

/**
 * FuseDash `legendType="palette"` — Low + sequential swatches + High.
 * Used by Sankey / treemap (and any sequential-ramp chart) in the shell.
 */
export function renderPaletteLegend(
  colors: string[],
): TemplateResult | typeof nothing {
  if (!colors.length) return nothing;
  return html`
    <div class="legend-palette" part="legend">
      <span>Low</span>
      <div class="legend-palette-swatches">
        ${colors.map(
          (color) =>
            html`<div
              class="legend-palette-swatch"
              style="background-color:${color}"
            ></div>`,
        )}
      </div>
      <span>High</span>
    </div>
  `;
}
