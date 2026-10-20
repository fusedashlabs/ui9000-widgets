const NUMBER = new Intl.NumberFormat('en-US');

/** `1204` → `1,204`. */
export function formatAssetHealthCount(value: number): string {
  return NUMBER.format(value);
}

/** Quarter-hour slot index → `HH:MM`. */
export function formatSlotTime(slot: number): string {
  const hours = String(Math.floor(slot / 4) % 24).padStart(2, '0');
  const minutes = String((slot % 4) * 15).padStart(2, '0');
  return `${hours}:${minutes}`;
}
