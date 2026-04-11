export type InboxSnapshotStatus = 'ready' | 'empty' | 'partial' | 'error';
export type InboxOpportunityStatus = 'ready' | 'blocked' | 'degraded';
export type InboxConfidence = 'low' | 'medium' | 'high';
export type InboxDecisionAction = 'skip' | 'reject' | 'mute' | 'quote';
export type InboxOutcomeStatus = 'watching' | 'open' | 'closed';
export type InboxBaselineOutcome = 'unknown' | 'beat' | 'matched' | 'lagged';

export interface InboxGuardrail {
  key: string;
  label: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'block';
  detail: string;
}

export interface InboxMetric {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'warning' | 'negative' | 'accent';
}

export interface InboxOpportunity {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  rank: number;
  status: InboxOpportunityStatus;
  score: number;
  confidence: InboxConfidence;
  primaryThesis: string;
  primaryRisk: string;
  whyNow: string;
  whyTrust: string;
  whyNot: string;
  traderCount: number;
  avgWalletScore: number | null;
  holdersStillHolding: number;
  netFlow24hUsd: number;
  netFlow7dUsd: number;
  marketCapUsd: number;
  tokenAgeDays: number;
  keyMetrics: InboxMetric[];
  guardrails: InboxGuardrail[];
  rawPayload: Record<string, unknown>;
}

export interface InboxSnapshotSummary {
  headline: string;
  subheadline: string;
  counts: {
    total: number;
    ready: number;
    blocked: number;
    degraded: number;
  };
  topScore: number | null;
  topSymbol: string | null;
}

export interface InboxSnapshot {
  id: string;
  chain: string;
  status: InboxSnapshotStatus;
  generatedAt: string;
  summary: InboxSnapshotSummary;
  opportunities: InboxOpportunity[];
  rawPayload: Record<string, unknown>;
}

export interface InboxDecision {
  id: string;
  snapshotId: string;
  opportunityId: string;
  action: InboxDecisionAction;
  note: string | null;
  quoteStatus: string | null;
  quotePayload: Record<string, unknown> | null;
  rawPayload: Record<string, unknown>;
  createdAt: string;
}

export interface InboxOutcome {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  sourceSnapshotId: string;
  sourceOpportunityId: string;
  sourceDecisionId: string | null;
  status: InboxOutcomeStatus;
  horizonLabel: string | null;
  entryReference: string | null;
  entryPrice: number | null;
  amountUsd: number | null;
  pnlPct: number | null;
  pnlUsd: number | null;
  baselineLabel: string | null;
  baselineOutcome: InboxBaselineOutcome;
  notes: string | null;
  openedAt: string;
  updatedAt: string;
  createdAt: string;
}

export interface InboxResponse {
  snapshot: InboxSnapshot | null;
  recentDecisions: InboxDecision[];
  trackedOutcomes: InboxOutcome[];
}
