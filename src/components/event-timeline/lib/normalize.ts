export type TimelineEvent = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  severity: string;
  entityId?: string;
};

export function normalizeTimeline(raw: unknown): TimelineEvent[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { events?: unknown }).events)
      ? (raw as { events: unknown[] }).events
      : [];
  const events: TimelineEvent[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const ts = typeof o.ts === 'string' ? o.ts.trim() : '';
    const actor = typeof o.actor === 'string' ? o.actor.trim() : '';
    const action = typeof o.action === 'string' ? o.action.trim() : '';
    if (!ts || !actor || !action) continue;
    events.push({
      id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `${ts}-${actor}`,
      ts,
      actor,
      action,
      severity: typeof o.severity === 'string' ? o.severity : '',
      entityId: typeof o.entityId === 'string' ? o.entityId : undefined,
    });
  }
  return events.sort((a, b) => a.ts.localeCompare(b.ts));
}
