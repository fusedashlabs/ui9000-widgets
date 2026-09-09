import type { GiniOverlays } from './types.js';

/** Binary Gini impurity — the curve the split annotation is measured against. */
export function giniImpurity(p: number): number {
  return 2 * p * (1 - p);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readCi(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const lo = readNumber(value[0]);
  const hi = readNumber(value[1]);
  if (lo === undefined || hi === undefined) return undefined;
  return [clamp01(Math.min(lo, hi)), clamp01(Math.max(lo, hi))];
}

function readSplit(value: unknown): GiniOverlays['split'] {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const pLeft = readNumber(raw.pLeft);
  const pRight = readNumber(raw.pRight);
  if (pLeft === undefined || pRight === undefined) return undefined;
  return {
    pLeft: clamp01(pLeft),
    pRight: clamp01(pRight),
    nLeft: readNumber(raw.nLeft),
    nRight: readNumber(raw.nRight),
  };
}

/**
 * Merge widget `meta` with host flags. Client precedence: an explicit prop wins
 * over `meta`, and every overlay stays off when neither says otherwise.
 */
export function resolveOverlays(
  meta: Partial<GiniOverlays> | null | undefined,
  flags: Pick<Partial<GiniOverlays>, 'showPHat' | 'showCI' | 'showSplit'> = {},
): GiniOverlays {
  const pHat = readNumber(meta?.pHat);
  return {
    pHat: pHat === undefined ? undefined : clamp01(pHat),
    ci: readCi(meta?.ci),
    split: readSplit(meta?.split),
    showPHat: flags.showPHat ?? meta?.showPHat ?? false,
    showCI: flags.showCI ?? meta?.showCI ?? false,
    showSplit: flags.showSplit ?? meta?.showSplit ?? false,
  };
}

export interface SplitAnnotation {
  pLeft: number;
  pRight: number;
  leftValue: number;
  rightValue: number;
  /** Impurity reduction: parent Gini − child-weighted Gini */
  delta: number;
}

/** Client split annotation — child markers plus the ΔGini they buy. */
export function splitAnnotation(
  overlays: GiniOverlays,
): SplitAnnotation | null {
  if (!overlays.showSplit || !overlays.split) return null;

  const { pLeft, pRight } = overlays.split;
  const nLeft = overlays.split.nLeft ?? 1;
  const nRight = overlays.split.nRight ?? 1;
  const total = nLeft + nRight;
  if (!(total > 0)) return null;

  const weighted =
    (nLeft / total) * giniImpurity(pLeft) +
    (nRight / total) * giniImpurity(pRight);
  const parent = giniImpurity(overlays.pHat ?? 0.5);

  return {
    pLeft,
    pRight,
    leftValue: giniImpurity(pLeft),
    rightValue: giniImpurity(pRight),
    delta: parent - weighted,
  };
}
