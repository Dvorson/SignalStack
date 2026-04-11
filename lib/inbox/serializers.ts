import type {
  PersistedInboxDecision,
  PersistedInboxOutcome,
  PersistedInboxOpportunity,
  PersistedInboxSnapshot,
} from '@/lib/db';
import type { InboxDecision, InboxOpportunity, InboxOutcome, InboxSnapshot } from '@/lib/inbox/types';

function toOpportunity(opportunity: PersistedInboxOpportunity): InboxOpportunity {
  return {
    id: opportunity.id,
    tokenSymbol: opportunity.token_symbol,
    tokenAddress: opportunity.token_address,
    chain: opportunity.chain,
    rank: opportunity.rank,
    status: opportunity.status,
    score: opportunity.score,
    confidence: opportunity.confidence,
    primaryThesis: opportunity.primary_thesis,
    primaryRisk: opportunity.primary_risk,
    whyNow: opportunity.why_now,
    whyTrust: opportunity.why_trust,
    whyNot: opportunity.why_not,
    traderCount: opportunity.trader_count,
    avgWalletScore: opportunity.avg_wallet_score,
    holdersStillHolding: opportunity.holders_still_holding,
    netFlow24hUsd: opportunity.net_flow_24h_usd,
    netFlow7dUsd: opportunity.net_flow_7d_usd,
    marketCapUsd: opportunity.market_cap_usd,
    tokenAgeDays: opportunity.token_age_days,
    keyMetrics: opportunity.keyMetrics as InboxOpportunity['keyMetrics'],
    guardrails: opportunity.guardrails as InboxOpportunity['guardrails'],
    rawPayload: opportunity.rawPayload as Record<string, unknown>,
  };
}

export function toInboxSnapshot(snapshot: PersistedInboxSnapshot): InboxSnapshot {
  return {
    id: snapshot.id,
    chain: snapshot.chain,
    status: snapshot.status,
    generatedAt: snapshot.generated_at,
    summary: snapshot.summary as InboxSnapshot['summary'],
    opportunities: snapshot.opportunities.map(toOpportunity),
    rawPayload: snapshot.rawPayload as Record<string, unknown>,
  };
}

export function toInboxDecision(decision: PersistedInboxDecision): InboxDecision {
  return {
    id: decision.id,
    snapshotId: decision.snapshot_id,
    opportunityId: decision.opportunity_id,
    action: decision.action,
    note: decision.note,
    quoteStatus: decision.quote_status,
    quotePayload: decision.quotePayload as Record<string, unknown> | null,
    rawPayload: decision.rawPayload as Record<string, unknown>,
    createdAt: decision.created_at,
  };
}

export function toInboxOutcome(outcome: PersistedInboxOutcome): InboxOutcome {
  return {
    id: outcome.id,
    tokenSymbol: outcome.token_symbol,
    tokenAddress: outcome.token_address,
    chain: outcome.chain,
    sourceSnapshotId: outcome.source_snapshot_id,
    sourceOpportunityId: outcome.source_opportunity_id,
    sourceDecisionId: outcome.source_decision_id,
    status: outcome.status,
    horizonLabel: outcome.horizon_label,
    entryReference: outcome.entry_reference,
    entryPrice: outcome.entry_price,
    amountUsd: outcome.amount_usd,
    pnlPct: outcome.pnl_pct,
    pnlUsd: outcome.pnl_usd,
    baselineLabel: outcome.baseline_label,
    baselineOutcome: outcome.baseline_outcome,
    notes: outcome.notes,
    openedAt: outcome.opened_at,
    updatedAt: outcome.updated_at,
    createdAt: outcome.created_at,
  };
}
