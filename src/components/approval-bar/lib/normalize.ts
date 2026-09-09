export type ApprovalStatus = 'proposed' | 'approved' | 'rejected';

export type ApprovalModel = {
  proposal: string;
  status: ApprovalStatus;
};

export function normalizeApproval(raw: unknown): ApprovalModel | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const proposal = typeof o.proposal === 'string' ? o.proposal.trim() : '';
  if (!proposal) return null;
  const status =
    o.status === 'approved' || o.status === 'rejected' || o.status === 'proposed'
      ? o.status
      : 'proposed';
  return { proposal, status };
}
