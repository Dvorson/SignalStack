import { randomUUID } from 'crypto';
import {
  createInboxDecision,
  getInboxOpportunity,
  getLatestInboxSnapshot,
  getRecentInboxDecisionsForSnapshot,
} from '@/lib/db';
import { toInboxDecision } from '@/lib/inbox/serializers';
import { getTradeQuote } from '@/lib/nansen/client';
import { publishEvent } from '@/lib/realtime/events';

type DecisionBody = {
  snapshotId?: string;
  opportunityId?: string;
  action?: 'skip' | 'reject' | 'mute' | 'quote';
  note?: string;
  amountUsd?: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as DecisionBody;
  const { snapshotId, opportunityId, action } = body;

  if (!snapshotId || !opportunityId || !action) {
    return Response.json({ error: 'snapshotId, opportunityId, and action are required.' }, { status: 400 });
  }

  const latestSnapshot = getLatestInboxSnapshot();
  if (!latestSnapshot) {
    return Response.json({ error: 'No inbox snapshot exists yet.' }, { status: 404 });
  }

  if (latestSnapshot.id !== snapshotId) {
    return Response.json(
      {
        error: 'This snapshot is stale. Refresh before taking action.',
        latestSnapshotId: latestSnapshot.id,
      },
      { status: 409 },
    );
  }

  const opportunity = getInboxOpportunity(snapshotId, opportunityId);
  if (!opportunity) {
    return Response.json({ error: 'Opportunity not found in this snapshot.' }, { status: 404 });
  }

  let quotePayload: Awaited<ReturnType<typeof getTradeQuote>> | null = null;
  if (action === 'quote') {
    if (opportunity.status === 'blocked') {
      return Response.json(
        { error: 'This opportunity is blocked by the current guardrails.' },
        { status: 400 },
      );
    }

    const amountUsd = Math.min(Math.max(body.amountUsd ?? 20, 1), 50);
    if (process.env.SIGNALSTACK_MOCK_QUOTES === '1') {
      quotePayload = opportunity.token_symbol.toUpperCase().includes('FAIL')
        ? {
            token: opportunity.token_symbol,
            token_address: opportunity.token_address,
            amount_usd: amountUsd,
            execution_price: 0,
            slippage_pct: 0,
            tx_hash: '',
            status: 'failed',
            chain: opportunity.chain,
            error: 'Mock quote failure for test coverage.',
          }
        : {
            token: opportunity.token_symbol,
            token_address: opportunity.token_address,
            amount_usd: amountUsd,
            execution_price: 0.000123,
            slippage_pct: 0.45,
            tx_hash: '',
            status: 'quote_only',
            chain: opportunity.chain,
          };
    } else {
      quotePayload = await getTradeQuote({
        from: 'USDC',
        to: opportunity.token_address,
        amountUsd,
        chain: opportunity.chain,
      });
    }
  }

  const decisionId = randomUUID();
  createInboxDecision({
    id: decisionId,
    snapshotId,
    opportunityId,
    action,
    note: body.note ?? null,
    quoteStatus: quotePayload?.status ?? null,
    quotePayload,
    rawPayload: {
      action,
      note: body.note ?? null,
      amountUsd: body.amountUsd ?? 20,
      quotePayload,
    },
  });

  publishEvent('inbox', {
    type: 'decision-created',
    decisionId,
    snapshotId,
    opportunityId,
    action,
    timestamp: new Date().toISOString(),
  });

  const decisions = getRecentInboxDecisionsForSnapshot(snapshotId, 8).map(toInboxDecision);
  const decision = decisions.find((item) => item.id === decisionId) ?? null;

  return Response.json({
    decision,
    quote: quotePayload,
    recentDecisions: decisions,
  });
}
