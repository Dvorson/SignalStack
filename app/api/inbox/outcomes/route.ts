import { randomUUID } from 'crypto';
import {
  createInboxOutcome,
  getInboxDecision,
  getInboxOpportunity,
  getInboxOutcome,
  updateInboxOutcome,
} from '@/lib/db';
import { toInboxOutcome } from '@/lib/inbox/serializers';
import { publishEvent } from '@/lib/realtime/events';

type OutcomeBody = {
  outcomeId?: string;
  snapshotId?: string;
  opportunityId?: string;
  sourceDecisionId?: string | null;
  status?: 'watching' | 'open' | 'closed';
  horizonLabel?: string | null;
  entryReference?: string | null;
  entryPrice?: number | string | null;
  amountUsd?: number | string | null;
  pnlPct?: number | string | null;
  pnlUsd?: number | string | null;
  baselineLabel?: string | null;
  baselineOutcome?: 'unknown' | 'beat' | 'matched' | 'lagged';
  notes?: string | null;
};

function parseNullableNumber(value: number | string | null | undefined) {
  if (value === '' || value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableString(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatus(value: string | undefined): 'watching' | 'open' | 'closed' | null {
  return value === 'watching' || value === 'open' || value === 'closed' ? value : null;
}

function normalizeBaselineOutcome(value: string | undefined): 'unknown' | 'beat' | 'matched' | 'lagged' {
  return value === 'beat' || value === 'matched' || value === 'lagged' ? value : 'unknown';
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as OutcomeBody;
  const status = normalizeStatus(body.status);

  if (!body.snapshotId || !body.opportunityId || !status) {
    return Response.json(
      { error: 'snapshotId, opportunityId, and a valid status are required.' },
      { status: 400 },
    );
  }

  const opportunity = getInboxOpportunity(body.snapshotId, body.opportunityId);
  if (!opportunity) {
    return Response.json({ error: 'Opportunity not found in this snapshot.' }, { status: 404 });
  }

  let sourceDecisionId: string | null = null;
  if (body.sourceDecisionId) {
    const decision = getInboxDecision(body.sourceDecisionId);
    if (!decision || decision.opportunity_id !== body.opportunityId) {
      return Response.json({ error: 'Source decision does not match this opportunity.' }, { status: 400 });
    }
    sourceDecisionId = decision.id;
  }

  const now = new Date().toISOString();

  if (body.outcomeId) {
    const existing = getInboxOutcome(body.outcomeId);
    if (!existing) {
      return Response.json({ error: 'Tracked outcome not found.' }, { status: 404 });
    }

    updateInboxOutcome({
      id: existing.id,
      status,
      horizonLabel: parseNullableString(body.horizonLabel),
      entryReference: parseNullableString(body.entryReference),
      entryPrice: parseNullableNumber(body.entryPrice),
      amountUsd: parseNullableNumber(body.amountUsd),
      pnlPct: parseNullableNumber(body.pnlPct),
      pnlUsd: parseNullableNumber(body.pnlUsd),
      baselineLabel: parseNullableString(body.baselineLabel),
      baselineOutcome: normalizeBaselineOutcome(body.baselineOutcome),
      notes: parseNullableString(body.notes),
      updatedAt: now,
    });

    const saved = getInboxOutcome(existing.id);
    if (!saved) {
      return Response.json({ error: 'Outcome update failed.' }, { status: 500 });
    }

    publishEvent('inbox', {
      type: 'outcome-updated',
      outcomeId: saved.id,
      tokenAddress: saved.token_address,
      timestamp: now,
    });

    return Response.json({ outcome: toInboxOutcome(saved) });
  }

  const outcomeId = randomUUID();
  createInboxOutcome({
    id: outcomeId,
    tokenSymbol: opportunity.token_symbol,
    tokenAddress: opportunity.token_address,
    chain: opportunity.chain,
    sourceSnapshotId: body.snapshotId,
    sourceOpportunityId: body.opportunityId,
    sourceDecisionId,
    status,
    horizonLabel: parseNullableString(body.horizonLabel),
    entryReference: parseNullableString(body.entryReference),
    entryPrice: parseNullableNumber(body.entryPrice),
    amountUsd: parseNullableNumber(body.amountUsd),
    pnlPct: parseNullableNumber(body.pnlPct),
    pnlUsd: parseNullableNumber(body.pnlUsd),
    baselineLabel: parseNullableString(body.baselineLabel),
    baselineOutcome: normalizeBaselineOutcome(body.baselineOutcome),
    notes: parseNullableString(body.notes),
    openedAt: now,
    updatedAt: now,
  });

  const saved = getInboxOutcome(outcomeId);
  if (!saved) {
    return Response.json({ error: 'Outcome creation failed.' }, { status: 500 });
  }

  publishEvent('inbox', {
    type: 'outcome-updated',
    outcomeId: saved.id,
    tokenAddress: saved.token_address,
    timestamp: now,
  });

  return Response.json({ outcome: toInboxOutcome(saved) }, { status: 201 });
}
