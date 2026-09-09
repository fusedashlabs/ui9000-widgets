export interface PunchcardCell {
  x: string;
  y: string;
  value: number;
  color?: string;
}

export interface PunchcardModel {
  cells: PunchcardCell[];
  xDomain: string[];
  yDomain: string[];
}

/** Chat cells or FuseDash WidgetItem (`data` + `xAxe`/`yAxe`/`groupBy`/`uniqueValues`). */
export type PunchcardInput =
  | PunchcardCell[]
  | { cells: PunchcardCell[]; xDomain?: string[]; yDomain?: string[] }
  | PunchcardModel
  | Record<string, unknown>;
