'use client';

import clsx from 'clsx';
import { fmtUsd } from '@/components/tools/utils';
import type { InboxOpportunity } from '@/lib/inbox/types';
import { ConfidenceBadge, Panel, SectionLabel, StatusDot } from '@/components/inbox/ui';

export function OpportunityQueue({
  opportunities,
  selectedId,
  onSelect,
}: {
  opportunities: InboxOpportunity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-border/50 px-4 py-4">
        <SectionLabel
          eyebrow="Opportunity Queue"
          title="Ranked by expected usefulness, not by hype"
          detail="Top row gets the strongest emphasis. Everything else stays quiet enough to compare."
        />
      </div>

      <div className="divide-y divide-border/30">
        {opportunities.map((opportunity, index) => {
          const selected = opportunity.id === selectedId;

          return (
            <button
              key={opportunity.id}
              type="button"
              onClick={() => onSelect(opportunity.id)}
              aria-label={`Select opportunity ${opportunity.tokenSymbol}`}
              className={clsx(
                'w-full px-4 py-4 text-left transition-colors',
                selected ? 'bg-data/5' : 'hover:bg-surface-elevated',
                index === 0 && 'bg-white/[0.02]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground">#{opportunity.rank.toString().padStart(2, '0')}</span>
                    <span className="text-base font-semibold text-foreground font-mono">{opportunity.tokenSymbol}</span>
                    <ConfidenceBadge confidence={opportunity.confidence} />
                    <StatusDot status={opportunity.status} />
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-foreground/90">{opportunity.primaryThesis}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{opportunity.primaryRisk}</p>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold text-foreground font-mono">{opportunity.score}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">score</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-5">
                <MetricPill label="7d flow" value={fmtUsd(opportunity.netFlow7dUsd)} tone={opportunity.netFlow7dUsd > 0 ? 'positive' : 'warning'} />
                <MetricPill label="24h flow" value={fmtUsd(opportunity.netFlow24hUsd)} tone={opportunity.netFlow24hUsd > 0 ? 'positive' : 'warning'} />
                <MetricPill label="SM wallets" value={String(opportunity.traderCount)} />
                <MetricPill label="Avg wallet" value={opportunity.avgWalletScore == null ? 'n/a' : opportunity.avgWalletScore.toFixed(0)} tone={opportunity.avgWalletScore != null && opportunity.avgWalletScore >= 60 ? 'positive' : undefined} />
                <MetricPill label="Mkt cap" value={fmtUsd(opportunity.marketCapUsd)} />
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'warning';
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border/40 bg-background px-2 py-2',
        tone === 'positive' && 'border-profit/20 text-profit',
        tone === 'warning' && 'border-signal-medium/20 text-signal-medium',
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-mono">{value}</div>
    </div>
  );
}
