import {
  getLatestInboxOutcomesForSnapshot,
  getLatestInboxSnapshot,
  getRecentInboxDecisionsForSnapshot,
  saveInboxSnapshot,
} from '@/lib/db';
import { buildInboxSnapshot } from '@/lib/inbox/build-snapshot';
import { toInboxDecision, toInboxOutcome, toInboxSnapshot } from '@/lib/inbox/serializers';
import { publishEvent } from '@/lib/realtime/events';

export const dynamic = 'force-dynamic';

function persistSnapshot(snapshot: Awaited<ReturnType<typeof buildInboxSnapshot>>) {
  saveInboxSnapshot({
    id: snapshot.id,
    chain: snapshot.chain,
    status: snapshot.status,
    summary: snapshot.summary,
    rawPayload: snapshot.rawPayload,
    opportunityCount: snapshot.opportunities.length,
    blockedCount: snapshot.opportunities.filter((opportunity) => opportunity.status === 'blocked').length,
    generatedBy: 'manual-refresh',
    generatedAt: snapshot.generatedAt,
    opportunities: snapshot.opportunities.map((opportunity) => ({
      id: opportunity.id,
      tokenSymbol: opportunity.tokenSymbol,
      tokenAddress: opportunity.tokenAddress,
      chain: opportunity.chain,
      rank: opportunity.rank,
      status: opportunity.status,
      score: opportunity.score,
      confidence: opportunity.confidence,
      primaryThesis: opportunity.primaryThesis,
      primaryRisk: opportunity.primaryRisk,
      whyNow: opportunity.whyNow,
      whyTrust: opportunity.whyTrust,
      whyNot: opportunity.whyNot,
      traderCount: opportunity.traderCount,
      avgWalletScore: opportunity.avgWalletScore,
      holdersStillHolding: opportunity.holdersStillHolding,
      netFlow24hUsd: opportunity.netFlow24hUsd,
      netFlow7dUsd: opportunity.netFlow7dUsd,
      marketCapUsd: opportunity.marketCapUsd,
      tokenAgeDays: opportunity.tokenAgeDays,
      keyMetrics: opportunity.keyMetrics,
      guardrails: opportunity.guardrails,
      rawPayload: opportunity.rawPayload,
    })),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldRefresh = url.searchParams.get('refresh') === '1';

  try {
    let snapshot = getLatestInboxSnapshot();

    if (!snapshot || shouldRefresh) {
      const built = await buildInboxSnapshot({ chain: 'solana' });
      persistSnapshot(built);
      snapshot = getLatestInboxSnapshot();
      publishEvent('inbox', {
        type: 'snapshot-updated',
        snapshotId: built.id,
        timestamp: built.generatedAt,
      });
    }

    if (!snapshot) {
      return Response.json({ snapshot: null, recentDecisions: [], trackedOutcomes: [] }, { status: 200 });
    }

    return Response.json({
      snapshot: toInboxSnapshot(snapshot),
      recentDecisions: getRecentInboxDecisionsForSnapshot(snapshot.id, 8).map(toInboxDecision),
      trackedOutcomes: getLatestInboxOutcomesForSnapshot(snapshot.id).map(toInboxOutcome),
    });
  } catch (error) {
    const fallback = getLatestInboxSnapshot();
    if (fallback) {
      return Response.json({
        snapshot: toInboxSnapshot(fallback),
        recentDecisions: getRecentInboxDecisionsForSnapshot(fallback.id, 8).map(toInboxDecision),
        trackedOutcomes: getLatestInboxOutcomesForSnapshot(fallback.id).map(toInboxOutcome),
        error: error instanceof Error ? error.message : 'Inbox refresh failed.',
      });
    }

    return Response.json(
      { error: error instanceof Error ? error.message : 'Inbox refresh failed.' },
      { status: 503 },
    );
  }
}
