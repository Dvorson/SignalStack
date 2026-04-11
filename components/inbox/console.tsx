'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OpportunityDetailRail } from '@/components/inbox/detail-rail';
import { ChatDock } from '@/components/inbox/chat-dock';
import { OpportunityQueue } from '@/components/inbox/queue';
import { ActionButton, Panel } from '@/components/inbox/ui';
import type { InboxDecision, InboxOutcome, InboxResponse, InboxSnapshot } from '@/lib/inbox/types';

type InboxApiResponse = InboxResponse & {
  error?: string;
  latestSnapshotId?: string;
};

export function InboxConsole() {
  const [snapshot, setSnapshot] = useState<InboxSnapshot | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<InboxDecision[]>([]);
  const [trackedOutcomes, setTrackedOutcomes] = useState<InboxOutcome[]>([]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [invalidationMessage, setInvalidationMessage] = useState<string | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);
  const snapshotRef = useRef<InboxSnapshot | null>(null);
  const selectedOpportunityIdRef = useRef<string | null>(null);

  const opportunities = snapshot?.opportunities ?? [];

  const selectedOpportunity = useMemo(() => {
    if (!selectedOpportunityId) return opportunities[0] ?? null;
    return opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ?? null;
  }, [opportunities, selectedOpportunityId]);

  const trackedOutcome = useMemo(() => {
    if (!selectedOpportunity) return null;
    return trackedOutcomes.find((outcome) => (
      outcome.chain === selectedOpportunity.chain
      && outcome.tokenAddress === selectedOpportunity.tokenAddress
    )) ?? null;
  }, [selectedOpportunity, trackedOutcomes]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    selectedOpportunityIdRef.current = selectedOpportunityId;
  }, [selectedOpportunityId]);

  const fetchSnapshot = useCallback(async (forceRefresh: boolean) => {
    const isFirstLoad = snapshotRef.current == null;
    if (isFirstLoad) setLoading(true);
    if (!isFirstLoad) setRefreshing(true);

    try {
      const res = await fetch(`/api/inbox${forceRefresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      const data = (await res.json()) as InboxApiResponse;

      if (!res.ok) {
        throw new Error(data.error || 'Inbox request failed.');
      }

      startTransition(() => {
        setSnapshot(data.snapshot);
        setRecentDecisions(data.recentDecisions ?? []);
        setTrackedOutcomes(data.trackedOutcomes ?? []);
        setPageError(data.error ?? null);
        if (forceRefresh) {
          setQuoteState(null);
        }

        if (!data.snapshot) {
          setSelectedOpportunityId(null);
          setTrackedOutcomes([]);
          return;
        }

        const currentSelection = selectedOpportunityIdRef.current;
        const preferred =
          data.snapshot.opportunities.find((opportunity) => opportunity.id === currentSelection)
          ?? data.snapshot.opportunities.find((opportunity) => opportunity.status === 'ready')
          ?? data.snapshot.opportunities[0]
          ?? null;

        if (currentSelection && !data.snapshot.opportunities.some((opportunity) => opportunity.id === currentSelection)) {
          setInvalidationMessage('The previous selection changed in the latest snapshot, so the rail jumped to the current best available idea.');
        } else if (!forceRefresh) {
          setInvalidationMessage(null);
        }

        setSelectedOpportunityId(preferred?.id ?? null);
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Inbox request failed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot(false);
  }, [fetchSnapshot]);

  useEffect(() => {
    const dismissed = window.sessionStorage.getItem('signalstack-inbox-orientation-dismissed');
    setShowOrientation(dismissed !== '1');
  }, []);

  useEffect(() => {
    const source = new EventSource('/api/inbox/stream');
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string };
      if (payload.type === 'snapshot-updated' || payload.type === 'decision-created' || payload.type === 'outcome-updated') {
        void fetchSnapshot(false);
      }
    };

    return () => {
      source.close();
    };
  }, [fetchSnapshot]);

  const dismissOrientation = () => {
    window.sessionStorage.setItem('signalstack-inbox-orientation-dismissed', '1');
    setShowOrientation(false);
  };

  const handleAction = async (action: 'skip' | 'reject' | 'mute' | 'quote') => {
    if (!snapshot || !selectedOpportunity) return;

    setBusyAction(action);
    setInvalidationMessage(null);

    try {
      const res = await fetch('/api/inbox/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          opportunityId: selectedOpportunity.id,
          action,
        }),
      });

      const data = (await res.json()) as InboxApiResponse & {
        decision?: InboxDecision | null;
        quote?: Record<string, unknown> | null;
      };

      if (res.status === 409) {
        setInvalidationMessage(data.error || 'This quote or action is stale. Refresh and review again.');
        await fetchSnapshot(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Action failed.');
      }

      setRecentDecisions(data.recentDecisions ?? []);
      setQuoteState(data.quote ?? null);

      if (action !== 'quote') {
        const currentIndex = opportunities.findIndex((opportunity) => opportunity.id === selectedOpportunity.id);
        const next =
          opportunities.slice(currentIndex + 1).find((opportunity) => opportunity.status === 'ready')
          ?? opportunities.find((opportunity) => opportunity.id !== selectedOpportunity.id)
          ?? null;
        setSelectedOpportunityId(next?.id ?? null);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveOutcome = async (payload: {
    outcomeId?: string;
    sourceDecisionId?: string | null;
    status: 'watching' | 'open' | 'closed';
    horizonLabel?: string | null;
    entryReference?: string | null;
    entryPrice?: number | null;
    amountUsd?: number | null;
    pnlPct?: number | null;
    pnlUsd?: number | null;
    baselineLabel?: string | null;
    baselineOutcome?: 'unknown' | 'beat' | 'matched' | 'lagged';
    notes?: string | null;
  }) => {
    if (!snapshot || !selectedOpportunity) return;

    setSavingOutcome(true);
    setPageError(null);

    try {
      const res = await fetch('/api/inbox/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          opportunityId: selectedOpportunity.id,
          ...payload,
        }),
      });

      const data = (await res.json()) as { error?: string; outcome?: InboxOutcome };
      if (!res.ok || !data.outcome) {
        throw new Error(data.error || 'Outcome save failed.');
      }

      const savedOutcome = data.outcome;
      setTrackedOutcomes((current) => {
        const withoutToken = current.filter((outcome) => !(
          outcome.chain === savedOutcome.chain
          && outcome.tokenAddress === savedOutcome.tokenAddress
        ));
        return [savedOutcome, ...withoutToken];
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Outcome save failed.');
    } finally {
      setSavingOutcome(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Panel className="p-6">
          <div className="text-sm font-mono text-data animate-pulse">Building a fresh trade inbox...</div>
          <div className="mt-2 text-sm text-muted-foreground">Cheap scan first, enrichment second, guardrails always.</div>
        </Panel>
      </div>
    );
  }

  if (!snapshot && pageError) {
    return (
      <div className="p-6">
        <Panel className="p-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-loss font-mono">Data temporarily unavailable</div>
          <div className="mt-2 text-lg font-semibold text-foreground">The inbox could not build a usable snapshot.</div>
          <div className="mt-2 max-w-2xl text-sm text-muted-foreground">{pageError}</div>
          <div className="mt-4">
            <ActionButton onClick={() => fetchSnapshot(true)}>Try again</ActionButton>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <Panel className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-mono">Trade Inbox</div>
              <h1 className="mt-2 text-2xl font-semibold text-foreground font-mono">{snapshot?.summary.headline ?? 'No trade today'}</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {pageError
                  ? `Showing the latest stored snapshot. ${pageError}`
                  : snapshot?.summary.subheadline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SummaryChip label="total" value={String(snapshot?.summary.counts.total ?? 0)} />
              <SummaryChip label="ready" value={String(snapshot?.summary.counts.ready ?? 0)} tone="positive" />
              <SummaryChip label="blocked" value={String(snapshot?.summary.counts.blocked ?? 0)} tone="warning" />
              <SummaryChip label="partial" value={String(snapshot?.summary.counts.degraded ?? 0)} tone="warning" />
              <ActionButton onClick={() => fetchSnapshot(true)} disabled={refreshing}>
                {refreshing ? 'Refreshing...' : 'Refresh snapshot'}
              </ActionButton>
            </div>
          </div>

          {showOrientation ? (
            <div className="mt-4 rounded-2xl border border-data/20 bg-data/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-data font-mono">First session</div>
              <div className="mt-2 grid gap-3 lg:grid-cols-3">
                <OrientationBlock title="Rank means triage">
                  Higher rows deserve attention first. The score is a utility rank, not a promise.
                </OrientationBlock>
                <OrientationBlock title="Why now / trust / not">
                  The rail explains timing, trust, and the main reason to stay skeptical.
                </OrientationBlock>
                <OrientationBlock title="Chat stays secondary">
                  Use the dock when a ranked idea raises a real question. Don’t start in chat.
                </OrientationBlock>
              </div>
              <div className="mt-3">
                <ActionButton onClick={dismissOrientation}>Dismiss</ActionButton>
              </div>
            </div>
          ) : null}

          {snapshot?.status === 'partial' ? (
            <div className="mt-4 rounded-2xl border border-signal-medium/30 bg-signal-medium/10 p-4 text-sm text-foreground">
              This snapshot is usable, but at least one candidate came back with degraded enrichment or failed a soft trust check.
            </div>
          ) : null}
        </Panel>

        {snapshot && snapshot.opportunities.length === 0 ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Panel className="p-6">
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-mono">No trade today</div>
              <div className="mt-2 text-xl font-semibold text-foreground font-mono">Nothing cleared the guardrails.</div>
              <div className="mt-2 max-w-2xl text-sm text-muted-foreground">
                That is a feature, not a bug. Quiet markets should look intentional, not broken.
              </div>
              <div className="mt-4">
                <ActionButton onClick={() => fetchSnapshot(true)} disabled={refreshing}>
                  {refreshing ? 'Refreshing...' : 'Try another fresh scan'}
                </ActionButton>
              </div>
            </Panel>

            <ChatDock opportunity={null} />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_380px]">
            <OpportunityQueue
              opportunities={snapshot?.opportunities ?? []}
              selectedId={selectedOpportunity?.id ?? null}
              onSelect={(id) => {
                setSelectedOpportunityId(id);
                setInvalidationMessage(null);
                setQuoteState(null);
              }}
            />

            <div className="space-y-4">
              <OpportunityDetailRail
                opportunity={selectedOpportunity}
                recentDecisions={recentDecisions}
                trackedOutcome={trackedOutcome}
                quoteState={quoteState}
                invalidationMessage={invalidationMessage}
                busyAction={busyAction}
                savingOutcome={savingOutcome}
                onAction={handleAction}
                onSaveOutcome={handleSaveOutcome}
                onRefresh={() => fetchSnapshot(true)}
              />
              <ChatDock opportunity={selectedOpportunity} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'warning';
}) {
  return (
    <div className={`rounded-full border px-3 py-1.5 text-xs font-mono ${tone === 'positive' ? 'border-profit/20 text-profit' : tone === 'warning' ? 'border-signal-medium/20 text-signal-medium' : 'border-border/40 text-muted-foreground'}`}>
      {label}: {value}
    </div>
  );
}

function OrientationBlock({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <div className="rounded-xl border border-data/20 bg-background/60 p-3">
      <div className="text-xs font-mono text-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
