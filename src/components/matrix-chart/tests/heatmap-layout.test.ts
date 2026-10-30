import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  fitTotals,
  getHeaderHeight,
  getHeatmapCells,
  getReadableTextColor,
  getRowPitch,
  heatmapCellKey,
  orderByTotals,
  parseColor,
  wrapLabel,
} from '../lib/heatmap-layout.js';
import { hasNaturalOrder } from '../lib/domain.js';

describe("orderByTotals", () => {
  const totals = new Map([
    ["Healthcare", 823],
    ["Taxes", 766],
    ["2nd Amendment", 741],
    ["Traditional Marriage", 826],
    ["School Choice", 766],
  ]);
  const domain = [
    "2nd Amendment",
    "Healthcare",
    "School Choice",
    "Taxes",
    "Traditional Marriage",
  ];

  it("puts the largest total first, equal totals in their order", () => {
    expect(orderByTotals(domain, totals, false)).toEqual([
      "Traditional Marriage",
      "Healthcare",
      "School Choice",
      "Taxes",
      "2nd Amendment",
    ]);
  });

  it("keeps an axis with an order of its own", () => {
    expect(orderByTotals(domain, totals, true)).toBe(domain);
  });
});

describe("hasNaturalOrder", () => {
  it("knows numbers, dates and weekdays", () => {
    expect(hasNaturalOrder(["2024", "2025", "2026"])).toBe(true);
    expect(hasNaturalOrder(["2026-07-06", "2026-07-13"])).toBe(true);
    expect(hasNaturalOrder(["Mon", "Tue", "Wed"])).toBe(true);
  });

  it("leaves categories to be ordered by their totals", () => {
    expect(hasNaturalOrder(["Healthcare", "Taxes"])).toBe(false);
    expect(hasNaturalOrder(["AZ-1", "CA-22"])).toBe(false);
    expect(hasNaturalOrder([])).toBe(false);
  });
});

describe("getRowPitch", () => {
  const base = {
    pitch: 32,
    cellPitch: 20,
    isInKpi: false,
    fillHeight: true,
    rowCount: 5,
  };

  it("shares the height under the header among the rows", () => {
    expect(getRowPitch({ ...base, availableHeight: 401 })).toBe(80);
  });

  // FUS-3928: five product segments in a low widget, the last one was hidden.
  it("shrinks the rows to fit when all of them fit at the lowest fit pitch", () => {
    expect(
      getRowPitch({ ...base, availableHeight: 115, minFitPitch: 22 })
    ).toBe(23);
    expect(
      getRowPitch({ ...base, availableHeight: 100, minFitPitch: 22 })
    ).toBe(32);
  });

  it("keeps the design pitch when the rows do not fit, so they scroll", () => {
    expect(getRowPitch({ ...base, availableHeight: 100 })).toBe(32);
  });

  it("keeps the design pitch without filling or before measuring", () => {
    expect(
      getRowPitch({ ...base, fillHeight: false, availableHeight: 401 })
    ).toBe(32);
    expect(getRowPitch({ ...base, availableHeight: 0 })).toBe(32);
    expect(getRowPitch({ ...base, rowCount: 0, availableHeight: 401 })).toBe(
      32
    );
  });

  it("keeps the cells of a KPI square", () => {
    expect(getRowPitch({ ...base, isInKpi: true, availableHeight: 401 })).toBe(
      20
    );
  });
});

// 6 px per character at any font size keeps the expectations readable.
const measure = (text: string) => text.length * 6;

describe("getHeatmapCells", () => {
  const rows = ["a", "b", "c", "d"];
  const columns = ["x", "y"];
  const values = new Map([
    [heatmapCellKey("b", "x"), 5],
    [heatmapCellKey("c", "x"), -2],
    [heatmapCellKey("d", "y"), 3],
    [heatmapCellKey("a", "y"), 0],
    // Not a row of the grid: ignored.
    [heatmapCellKey("z", "x"), 9],
  ]);

  it("keeps the filled cells and the runs of empty ones per column", () => {
    const { columns: cells } = getHeatmapCells(rows, columns, values);
    expect(cells[0]).toEqual({
      cells: [
        { rowIndex: 1, value: 5 },
        { rowIndex: 2, value: -2 },
      ],
      emptyRuns: [
        [0, 1],
        [3, 4],
      ],
    });
    expect(cells[1]).toEqual({
      cells: [{ rowIndex: 3, value: 3 }],
      emptyRuns: [[0, 3]],
    });
  });

  it("adds up the positive values of every row and column", () => {
    const { rowTotals, columnTotals } = getHeatmapCells(rows, columns, values);
    expect(Object.fromEntries(rowTotals)).toEqual({ b: 5, d: 3 });
    expect(Object.fromEntries(columnTotals)).toEqual({ x: 5, y: 3 });
  });

  it("gives one empty run to an empty column", () => {
    const { columns: cells } = getHeatmapCells(rows, ["empty"], values);
    expect(cells[0]).toEqual({ cells: [], emptyRuns: [[0, 4]] });
  });
});

describe("fitTotals", () => {
  it("shows the full numbers when they all fit", () => {
    expect(fitTotals([13, 1200], 40, 32, 11, 2, measure)).toEqual({
      texts: ["13", "1,200"],
      rotated: false,
    });
  });

  it("shortens every number of the line when one does not fit", () => {
    expect(fitTotals([13, 136241], 32, 32, 11, 2, measure)).toEqual({
      texts: ["13", "136K"],
      rotated: false,
    });
  });

  it("turns the short numbers along narrow boxes", () => {
    // 16 px wide columns under a 32 px high totals row.
    expect(fitTotals([1, 92043, 136241], 16, 32, 11, 2, measure)).toEqual({
      texts: ["1", "92K", "136K"],
      rotated: true,
    });
  });

  it("turns the full numbers when they fit along the boxes", () => {
    expect(fitTotals([1, 999], 16, 40, 11, 2, measure)).toEqual({
      texts: ["1", "999"],
      rotated: true,
    });
  });

  it("leaves out a number that fits in no form", () => {
    expect(fitTotals([5, 1234567], 12, 24, 11, 2, measure)).toEqual({
      texts: ["5", ""],
      rotated: false,
    });
  });
});

// FUS-3928: the heatmap of product segments by F1 / OP / F2 had a 135 px
// header for two-letter column names, so its rows did not fit the widget.
describe("getHeaderHeight", () => {
  // 6 px per character, as an 11 px font roughly measures.
  const measure = (text: string) => text.length * 6;
  const header = (columnLabels: string[]) =>
    getHeaderHeight({
      columnLabels,
      fontSize: 11,
      minHeight: 40,
      maxHeight: 135,
      padding: 15,
      measure,
    });

  it("is low for short column names", () => {
    expect(header(["F1", "OP", "F2"])).toBe(40);
  });

  it("grows with the longest name, up to the full height", () => {
    expect(header(["F1", "Contested segment"])).toBe(17 * 6 + 15 + 2);
    expect(header(["A very long column name that wraps"])).toBe(135);
  });

  it("is the lowest height without columns", () => {
    expect(header([])).toBe(40);
  });
});

// Every character is 5px wide.
const measureFive = (text: string) => text.length * 5;

describe("wrapLabel", () => {
  it("keeps a short label on one line", () => {
    expect(wrapLabel("UN Women", 100, 11, 2, measureFive)).toEqual(["UN Women"]);
  });

  it("wraps words onto a second line", () => {
    expect(
      wrapLabel("United Nations Organisation", 75, 11, 2, measureFive)
    ).toEqual(["United Nations", "Organisation"]);
  });

  it("ends the last line with an ellipsis when the label does not fit", () => {
    expect(
      wrapLabel(
        "Organization of Petroleum Exporting Countries",
        100,
        11,
        2,
        measureFive
      )
    ).toEqual(["Organization of", "Petroleum Exporti..."]);
  });

  it("cuts a single word that is wider than the line", () => {
    expect(wrapLabel("Supercalifragilistic", 50, 11, 1, measureFive)).toEqual([
      "Superca...",
    ]);
  });
});

const DARK = "#2E2156";
const WHITE = "#FFFFFF";

describe("parseColor", () => {
  it("reads hex and rgb(a) colours", () => {
    expect(parseColor("#2E2156")).toEqual([46, 33, 86]);
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("rgba(255, 255, 255, 1)")).toEqual([255, 255, 255]);
    expect(parseColor("not a colour")).toBeNull();
  });
});

describe("getReadableTextColor", () => {
  it("uses dark text on a light total over the light page", () => {
    expect(getReadableTextColor("#A0F1E3", 0.3, "#FFFFFF", [DARK, WHITE])).toBe(
      DARK
    );
  });

  it("uses white text on a faint total over the dark page", () => {
    expect(getReadableTextColor("#A0F1E3", 0.1, "#13161D", [DARK, WHITE])).toBe(
      WHITE
    );
  });

  it("keeps dark text on a full lilac total in the dark theme", () => {
    expect(getReadableTextColor("#C093FA", 1, "#13161D", [DARK, WHITE])).toBe(
      DARK
    );
  });

  it("falls back to the first candidate for an unknown colour", () => {
    expect(getReadableTextColor("var(--x)", 1, "#FFFFFF", [DARK, WHITE])).toBe(
      DARK
    );
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG value for black on white", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
  });
});
