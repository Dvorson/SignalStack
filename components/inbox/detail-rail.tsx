'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmtUsd } from '@/components/tools/utils';
import type {
  InboxBaselineOutcome,
  InboxDecision,
  InboxOpportunity,
  InboxOutcome,
  InboxOutcomeStatus,
} from '@/lib/inbox/types';
import { ActionButton, ConfidenceBadge, Panel, SectionLabel, StatusDot } from '@/components/inbox/ui';

type OutcomeFormState = {
  status: InboxOutcomeStatus;
  horizonLabel: string;
  entryReference: string;
  entryPrice: string;
  amountUsd: string;
  pnlPct: string;
  pnlUsd: string;
  baselineLabel: string;
  baselineOutcome: InboxBaselineOutcome;
  notes: string;
  sourceDecisionId: string | null;
};

function toInputNumber(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getQuoteValue(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : null;
}

function getLatestSuccessfulQuoteDecision(opportunity: InboxOpportunity | null, recentDecisions: InboxDecision[]) {
  if (!opportunity) return null;
  return recentDecisions.find((decision) => (
    decision.opportunityId === opportunity.id
    && decision.action === 'quote'
    && decision.quotePayload
    && decision.quoteStatus !== 'failed'
  )) ?? null;
}

function buildOutcomeFormState(
  opportunity: InboxOpportunity | null,
  trackedOutcome: InboxOutcome | null,
  latestQuoteDecision: InboxDecision | null,
  quoteState: Record<string, unknown> | null,
): OutcomeFormState {
  const liveQuoteSource = quoteState && quoteState.status !== 'failed' ? quoteState : null;
  const decisionQuoteSource = latestQuoteDecision?.quotePayload ?? null;
  const quoteSource = liveQuoteSource ?? decisionQuoteSource;

  return {
    status: trackedOutcome?.status ?? (quoteSource ? 'open' : 'watching'),
    horizonLabel: trackedOutcome?.horizonLabel ?? 'intraday',
    entryReference: trackedOutcome?.entryReference
      ?? (quoteSource ? 'Inbox quote' : opportunity ? `Watching ${opportunity.tokenSymbol}` : ''),
    entryPrice: toInputNumber(trackedOutcome?.entryPrice ?? getQuoteValue(quoteSource, 'execution_price')),
    amountUsd: toInputNumber(trackedOutcome?.amountUsd ?? getQuoteValue(quoteSource, 'amount_usd')),
    pnlPct: toInputNumber(trackedOutcome?.pnlPct),
    pnlUsd: toInputNumber(trackedOutcome?.pnlUsd),
    baselineLabel: trackedOutcome?.baselineLabel ?? 'No-trade baseline',
    baselineOutcome: trackedOutcome?.baselineOutcome ?? 'unknown',
    notes: trackedOutcome?.notes ?? '',
    sourceDecisionId: trackedOutcome?.sourceDecisionId ?? latestQuoteDecision?.id ?? null,
  };
}

function formatSignedPercent(value: number | null) {
  if (value == null) return 'n/a';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function outcomeTone(value: number | null) {
  if (value == null) return 'text-muted-foreground';
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-muted-foreground';
}

export function OpportunityDetailRail({
  opportunity,
  recentDecisions,
  trackedOutcome,
  quoteState,
  invalidationMessage,
  busyAction,
  savingOutcome,
  onAction,
  onSaveOutcome,
  onRefresh,
}: {
  opportunity: InboxOpportunity | null;
  recentDecisions: InboxDecision[];
  trackedOutcome: InboxOutcome | null;
  quoteState: Record<string, unknown> | null;
  invalidationMessage: string | null;
  busyAction: string | null;
  savingOutcome: boolean;
  onAction: (action: 'skip' | 'reject' | 'mute' | 'quote') => void;
  onSaveOutcome: (payload: {
    outcomeId?: string;
    sourceDecisionId?: string | null;
    status: InboxOutcomeStatus;
    horizonLabel?: string | null;
    entryReference?: string | null;
    entryPrice?: number | null;
    amountUsd?: number | null;
    pnlPct?: number | null;
    pnlUsd?: number | null;
    baselineLabel?: string | null;
    baselineOutcome?: InboxBaselineOutcome;
    notes?: string | null;
  }) => void;
  onRefresh: () => void;
}) {
  const latestQuoteDecision = useMemo(
    () => getLatestSuccessfulQuoteDecision(opportunity, recentDecisions),
    [opportunity, recentDecisions],
  );
  const [outcomeForm, setOutcomeForm] = useState<OutcomeFormState>(
    buildOutcomeFormState(opportunity, trackedOutcome, latestQuoteDecision, quoteState),
  );

  useEffect(() => {
    setOutcomeForm(buildOutcomeFormState(opportunity, trackedOutcome, latestQuoteDecision, quoteState));
  }, [opportunity, trackedOutcome, latestQuoteDecision, quoteState]);

  if (!opportunity) {
    return (
      <Panel className="p-4">
        <SectionLabel
          eyebrow="Selected Trade"
          title="Pick a row to inspect it"
          detail="The queue does the triage. This rail turns one idea into a decision."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionLabel
              eyebrow="Selected Trade"
              title={opportunity.tokenSymbol}
              detail={opportunity.primaryThesis}
            />
          </div>
          <div className="flex flex-col items-end gap-2">
            <ConfidenceBadge confidence={opportunity.confidence} />
            <StatusDot status={opportunity.status} />
          </div>
        </div>

        {invalidationMessage ? (
          <div className="mt-4 rounded-xl border border-signal-medium/30 bg-signal-medium/10 p-3">
            <div className="text-xs font-mono uppercase tracking-[0.16em] text-signal-medium">Invalidated</div>
            <div className="mt-1 text-sm text-foreground">{invalidationMessage}</div>
            <div className="mt-3">
              <ActionButton onClick={onRefresh}>Refresh latest snapshot</ActionButton>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="7d flow" value={fmtUsd(opportunity.netFlow7dUsd)} />
          <Metric label="24h flow" value={fmtUsd(opportunity.netFlow24hUsd)} />
          <Metric label="Mkt cap" value={fmtUsd(opportunity.marketCapUsd)} />
          <Metric label="Token age" value={`${Math.round(opportunity.tokenAgeDays)}d`} />
        </div>

        <div className="mt-4 space-y-3">
          <NarrativeBlock label="Why now" body={opportunity.whyNow} />
          <NarrativeBlock label="Why trust it" body={opportunity.whyTrust} />
          <NarrativeBlock label="Why not" body={opportunity.whyNot} tone="warning" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton onClick={() => onAction('skip')} disabled={busyAction != null}>
            {busyAction === 'skip' ? 'Skipping...' : 'Skip'}
          </ActionButton>
          <ActionButton onClick={() => onAction('mute')} disabled={busyAction != null}>
            {busyAction === 'mute' ? 'Muting...' : 'Mute'}
          </ActionButton>
          <ActionButton tone="danger" onClick={() => onAction('reject')} disabled={busyAction != null}>
            {busyAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </ActionButton>
          <ActionButton
            tone="accent"
            onClick={() => onAction('quote')}
            disabled={busyAction != null || opportunity.status === 'blocked' || Boolean(invalidationMessage)}
          >
            {busyAction === 'quote' ? 'Loading quote...' : 'Get quote'}
          </ActionButton>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionLabel
          eyebrow="Quote Readiness"
          title={quoteState ? 'Latest quote response' : 'No quote requested yet'}
          detail={quoteState ? 'Quotes are advisory until you refresh and confirm again.' : 'Requesting a quote logs the action and checks whether the idea is still valid.'}
        />
        {quoteState ? (
          <div className="mt-4 space-y-2 text-sm">
            {Object.entries(quoteState).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-3 border-b border-border/20 py-2 last:border-b-0">
                <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                <span className="text-right text-foreground">{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border/40 bg-background px-3 py-3 text-sm text-muted-foreground">
            Quotes are fetched on demand. Nothing executes automatically.
          </div>
        )}
      </Panel>

      <Panel className="p-4">
        <SectionLabel
          eyebrow="Outcome Tracking"
          title={trackedOutcome ? 'Latest tracked result' : 'Start tracking what happened next'}
          detail="Use one tracked record per token to see whether the inbox is helping or just looking organized."
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Status" value={trackedOutcome?.status ?? 'not tracked'} />
          <Metric
            label="P&L %"
            value={formatSignedPercent(trackedOutcome?.pnlPct ?? null)}
            className={outcomeTone(trackedOutcome?.pnlPct ?? null)}
          />
          <Metric
            label="P&L USD"
            value={trackedOutcome?.pnlUsd == null ? 'n/a' : fmtUsd(trackedOutcome.pnlUsd)}
            className={outcomeTone(trackedOutcome?.pnlUsd ?? null)}
          />
          <Metric label="Baseline" value={trackedOutcome?.baselineOutcome ?? 'unknown'} />
        </div>

        {trackedOutcome ? (
          <div className="mt-3 rounded-xl border border-border/40 bg-background px-3 py-3 text-sm text-muted-foreground">
            Tracking started {new Date(trackedOutcome.openedAt).toLocaleString()} and last updated {new Date(trackedOutcome.updatedAt).toLocaleString()}.
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-data/20 bg-data/5 px-3 py-3 text-sm text-foreground">
            {latestQuoteDecision
              ? 'The latest successful quote already prefilled the entry fields below.'
              : 'No successful quote is attached yet, so this will start as a manual watch unless you quote first.'}
          </div>
        )}

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveOutcome({
              outcomeId: trackedOutcome?.id,
              sourceDecisionId: outcomeForm.sourceDecisionId,
              status: outcomeForm.status,
              horizonLabel: outcomeForm.horizonLabel,
              entryReference: outcomeForm.entryReference,
              entryPrice: toNullableNumber(outcomeForm.entryPrice),
              amountUsd: toNullableNumber(outcomeForm.amountUsd),
              pnlPct: toNullableNumber(outcomeForm.pnlPct),
              pnlUsd: toNullableNumber(outcomeForm.pnlUsd),
              baselineLabel: outcomeForm.baselineLabel,
              baselineOutcome: outcomeForm.baselineOutcome,
              notes: outcomeForm.notes,
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <label htmlFor="outcome-status" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Status</label>
              <select
                id="outcome-status"
                value={outcomeForm.status}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, status: event.target.value as InboxOutcomeStatus }))}
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-data/40"
              >
                <option value="watching">Watching</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </Field>

            <Field>
              <label htmlFor="outcome-horizon" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Time horizon</label>
              <input
                id="outcome-horizon"
                value={outcomeForm.horizonLabel}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, horizonLabel: event.target.value }))}
                placeholder="intraday / swing / multi-day"
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
              />
            </Field>
          </div>

          <Field>
            <label htmlFor="outcome-entry-reference" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Entry reference</label>
            <input
              id="outcome-entry-reference"
              value={outcomeForm.entryReference}
              onChange={(event) => setOutcomeForm((current) => ({ ...current, entryReference: event.target.value }))}
              placeholder="Inbox quote / manual entry / live fill"
              className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <label htmlFor="outcome-entry-price" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Entry price</label>
              <input
                id="outcome-entry-price"
                inputMode="decimal"
                value={outcomeForm.entryPrice}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, entryPrice: event.target.value }))}
                placeholder="0.000123"
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
              />
            </Field>

            <Field>
              <label htmlFor="outcome-amount-usd" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Position size USD</label>
              <input
                id="outcome-amount-usd"
                inputMode="decimal"
                value={outcomeForm.amountUsd}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, amountUsd: event.target.value }))}
                placeholder="20"
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <label htmlFor="outcome-pnl-pct" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">P&amp;L %</label>
              <input
                id="outcome-pnl-pct"
                inputMode="decimal"
                value={outcomeForm.pnlPct}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, pnlPct: event.target.value }))}
                placeholder="12.5"
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
              />
            </Field>

            <Field>
              <label htmlFor="outcome-pnl-usd" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">P&amp;L USD</label>
              <input
                id="outcome-pnl-usd"
                inputMode="decimal"
                value={outcomeForm.pnlUsd}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, pnlUsd: event.target.value }))}
                placeholder="4.5"
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <label htmlFor="outcome-baseline-label" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Baseline</label>
              <input
                id="outcome-baseline-label"
                value={outcomeForm.baselineLabel}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, baselineLabel: event.target.value }))}
                placeholder="No-trade baseline / SOL beta"
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
              />
            </Field>

            <Field>
              <label htmlFor="outcome-baseline-outcome" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Vs baseline</label>
              <select
                id="outcome-baseline-outcome"
                value={outcomeForm.baselineOutcome}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, baselineOutcome: event.target.value as InboxBaselineOutcome }))}
                className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-data/40"
              >
                <option value="unknown">Unknown</option>
                <option value="beat">Beat</option>
                <option value="matched">Matched</option>
                <option value="lagged">Lagged</option>
              </select>
            </Field>
          </div>

          <Field>
            <label htmlFor="outcome-notes" className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">Notes</label>
            <textarea
              id="outcome-notes"
              value={outcomeForm.notes}
              onChange={(event) => setOutcomeForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              placeholder="What actually happened after the signal?"
              className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-data/40"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton type="submit" tone="accent" disabled={savingOutcome}>
              {savingOutcome ? 'Saving outcome...' : trackedOutcome ? 'Update outcome' : 'Start tracking'}
            </ActionButton>
            <span className="text-xs text-muted-foreground">
              The latest tracked result follows this token across inbox refreshes.
            </span>
          </div>
        </form>
      </Panel>

      <Panel className="p-4">
        <SectionLabel
          eyebrow="Recent Decisions"
          title="Keep momentum after each call"
          detail="Skip, reject, mute, and quote all count as decisions. The rail advances so the session keeps moving."
        />
        <div className="mt-4 space-y-2">
          {recentDecisions.length === 0 ? (
            <div className="rounded-xl border border-border/40 bg-background px-3 py-3 text-sm text-muted-foreground">
              No decisions logged yet for this snapshot.
            </div>
          ) : (
            recentDecisions.map((decision) => (
              <div key={decision.id} className="rounded-xl border border-border/40 bg-background px-3 py-3">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.16em]">
                  <span className="text-foreground">{decision.action}</span>
                  <span className="text-muted-foreground">{new Date(decision.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {decision.quoteStatus ? (
                  <div className="mt-1 text-sm text-muted-foreground">Quote status: {decision.quoteStatus}</div>
                ) : null}
                {decision.note ? (
                  <div className="mt-1 text-sm text-muted-foreground">{decision.note}</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}

function NarrativeBlock({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone?: 'warning';
}) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${tone === 'warning' ? 'border-signal-medium/20 bg-signal-medium/5' : 'border-border/40 bg-background'}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">{label}</div>
      <div className="mt-1 text-sm text-foreground">{body}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">{label}</div>
      <div className={`mt-1 text-sm font-mono ${className ?? 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
