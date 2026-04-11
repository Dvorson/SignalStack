import { randomUUID } from 'crypto';
import type { ClusterSignal, WhoBoughtSoldEntry } from '@/lib/nansen/types';
import { computeWalletScore, getClusterSignals, getWhoBoughtSold } from '@/lib/nansen/client';
import type {
  InboxConfidence,
  InboxGuardrail,
  InboxMetric,
  InboxOpportunity,
  InboxSnapshot,
  InboxSnapshotStatus,
} from '@/lib/inbox/types';

const DEFAULT_CHAIN = 'solana';
const MAX_ENRICHED_CANDIDATES = 8;
const BUYER_LIMIT = 12;
const SCORE_CONCURRENCY = 3;

type CandidateEvaluation = {
  opportunity: InboxOpportunity;
  preliminaryScore: number;
};

function formatCompactUsd(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function confidenceFromScore(score: number, blocked: boolean): InboxConfidence {
  if (blocked) return 'low';
  if (score >= 78) return 'high';
  if (score >= 58) return 'medium';
  return 'low';
}

function toneForMetric(
  value: number,
  positiveThreshold: number,
  warningThreshold: number,
): InboxMetric['tone'] {
  if (value >= positiveThreshold) return 'positive';
  if (value <= warningThreshold) return 'warning';
  return 'default';
}

function preliminaryScore(signal: ClusterSignal) {
  const traderScore = Math.min(30, signal.trader_count * 4);
  const convictionBoost = signal.conviction === 'high' ? 16 : signal.conviction === 'medium' ? 10 : 5;
  const netFlowScore = Math.min(26, Math.max(-10, Math.log10(Math.max(Math.abs(signal.net_flow_7d_usd), 1)) * 4));
  const directionBoost = signal.net_flow_7d_usd > 0 ? 8 : -12;
  const agePenalty = signal.token_age_days < 2 ? 20 : signal.token_age_days < 7 ? 10 : 0;
  const marketCapPenalty = signal.market_cap_usd < 250_000 ? 18 : signal.market_cap_usd < 1_000_000 ? 9 : 0;

  return traderScore + convictionBoost + netFlowScore + directionBoost - agePenalty - marketCapPenalty;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function buildGuardrails(
  signal: ClusterSignal,
  avgWalletScore: number | null,
  holdersStillHolding: number,
  degradedReason: string | null,
): InboxGuardrail[] {
  const guards: InboxGuardrail[] = [
    {
      key: 'trader-count',
      label: 'Trader count',
      passed: signal.trader_count >= 3,
      severity: signal.trader_count >= 3 ? 'info' : 'block',
      detail: signal.trader_count >= 3
        ? `${signal.trader_count} smart-money wallets converging`
        : `Only ${signal.trader_count} wallets, not enough breadth`,
    },
    {
      key: 'net-flow',
      label: 'Net flow',
      passed: signal.net_flow_7d_usd > 0,
      severity: signal.net_flow_7d_usd > 0 ? 'info' : 'block',
      detail: signal.net_flow_7d_usd > 0
        ? `${formatCompactUsd(signal.net_flow_7d_usd)} net inflow over 7d`
        : `${formatCompactUsd(signal.net_flow_7d_usd)} net 7d flow, trend is not supportive`,
    },
    {
      key: 'token-age',
      label: 'Token age',
      passed: signal.token_age_days >= 2,
      severity: signal.token_age_days >= 2 ? 'info' : 'block',
      detail: signal.token_age_days >= 2
        ? `${Math.round(signal.token_age_days)} day trading history`
        : `Only ${Math.round(signal.token_age_days)} days old`,
    },
    {
      key: 'market-cap',
      label: 'Market cap',
      passed: signal.market_cap_usd >= 250_000,
      severity: signal.market_cap_usd >= 250_000 ? 'info' : 'block',
      detail: signal.market_cap_usd >= 250_000
        ? `${formatCompactUsd(signal.market_cap_usd)} market cap`
        : `${formatCompactUsd(signal.market_cap_usd)} market cap, too fragile`,
    },
    {
      key: 'wallet-quality',
      label: 'Wallet quality',
      passed: avgWalletScore == null ? false : avgWalletScore >= 45,
      severity: avgWalletScore == null ? 'warning' : avgWalletScore >= 45 ? 'info' : 'warning',
      detail: avgWalletScore == null
        ? 'Could not verify buyer quality from recent flow data'
        : `Average fast score ${avgWalletScore.toFixed(0)} across recent buyers`,
    },
    {
      key: 'holders-still-holding',
      label: 'Still holding',
      passed: holdersStillHolding >= 2,
      severity: holdersStillHolding >= 2 ? 'info' : 'warning',
      detail: holdersStillHolding >= 2
        ? `${holdersStillHolding} tracked wallets still net long`
        : 'Recent buyers are already rotating out',
    },
  ];

  if (degradedReason) {
    guards.push({
      key: 'degraded',
      label: 'Data quality',
      passed: false,
      severity: 'warning',
      detail: degradedReason,
    });
  }

  return guards;
}

function summarizeRisk(guardrails: InboxGuardrail[]) {
  return (
    guardrails.find((guard) => !guard.passed && guard.severity === 'block')?.detail
    || guardrails.find((guard) => !guard.passed)?.detail
    || 'No obvious hard block, but still size this like an experiment.'
  );
}

function buildMetrics(
  signal: ClusterSignal,
  avgWalletScore: number | null,
  holdersStillHolding: number,
): InboxMetric[] {
  return [
    {
      label: '7d flow',
      value: formatCompactUsd(signal.net_flow_7d_usd),
      tone: toneForMetric(signal.net_flow_7d_usd, 0, 0),
    },
    {
      label: '24h flow',
      value: formatCompactUsd(signal.net_flow_24h_usd),
      tone: toneForMetric(signal.net_flow_24h_usd, 0, 0),
    },
    {
      label: 'SM wallets',
      value: String(signal.trader_count),
      tone: signal.trader_count >= 6 ? 'positive' : 'default',
    },
    {
      label: 'Avg wallet',
      value: avgWalletScore == null ? 'n/a' : avgWalletScore.toFixed(0),
      tone: avgWalletScore == null ? 'warning' : avgWalletScore >= 60 ? 'positive' : avgWalletScore >= 45 ? 'default' : 'warning',
    },
    {
      label: 'Still holding',
      value: String(holdersStillHolding),
      tone: holdersStillHolding >= 2 ? 'positive' : 'warning',
    },
  ];
}

async function enrichCandidate(signal: ClusterSignal): Promise<CandidateEvaluation> {
  let buyers: WhoBoughtSoldEntry[] = [];
  let degradedReason: string | null = null;

  try {
    buyers = await getWhoBoughtSold({
      tokenAddress: signal.token_address,
      chain: signal.chain,
      limit: BUYER_LIMIT,
    });
  } catch (error) {
    degradedReason = error instanceof Error ? error.message : 'Buyer quality data was unavailable.';
  }

  let avgWalletScore: number | null = null;
  let holdersStillHolding = 0;

  if (buyers.length > 0) {
    const scores = await mapWithConcurrency(
      buyers.slice(0, 6),
      SCORE_CONCURRENCY,
      async (buyer) => computeWalletScore(buyer.address, signal.chain, buyer, { skipProfiler: true }),
    );

    if (scores.length > 0) {
      avgWalletScore = scores.reduce((sum, score) => sum + score.composite_score, 0) / scores.length;
      holdersStillHolding = buyers.filter((buyer) => buyer.bought_volume_usd > buyer.sold_volume_usd).length;
    }
  } else if (!degradedReason) {
    degradedReason = 'No recent buyer profiles came back for this token.';
  }

  const guards = buildGuardrails(signal, avgWalletScore, holdersStillHolding, degradedReason);
  const blocked = guards.some((guard) => !guard.passed && guard.severity === 'block');
  const degraded = !blocked && guards.some((guard) => !guard.passed && guard.severity === 'warning');

  const finalScore = Math.max(
    0,
    Math.round(
      preliminaryScore(signal)
        + (avgWalletScore ?? 40) * 0.4
        + holdersStillHolding * 3
        - guards.filter((guard) => !guard.passed && guard.severity === 'warning').length * 4,
    ),
  );

  const confidence = confidenceFromScore(finalScore, blocked);
  const status = blocked ? 'blocked' : degraded ? 'degraded' : 'ready';
  const riskSummary = summarizeRisk(guards);

  const opportunity: InboxOpportunity = {
    id: randomUUID(),
    tokenSymbol: signal.token,
    tokenAddress: signal.token_address,
    chain: signal.chain,
    rank: 0,
    status,
    score: finalScore,
    confidence,
    primaryThesis: `${signal.trader_count} smart-money wallets are converging on ${signal.token} with ${formatCompactUsd(signal.net_flow_7d_usd)} net 7d flow.`,
    primaryRisk: riskSummary,
    whyNow: `${formatCompactUsd(signal.net_flow_24h_usd)} moved in over the last 24h, so this is fresh enough to deserve a fast look.`,
    whyTrust: avgWalletScore == null
      ? 'Signal breadth is real, but wallet-quality enrichment came back incomplete.'
      : `Recent buyers score ${avgWalletScore.toFixed(0)} on the fast wallet-quality pass, and ${holdersStillHolding} are still net long.`,
    whyNot: riskSummary,
    traderCount: signal.trader_count,
    avgWalletScore,
    holdersStillHolding,
    netFlow24hUsd: signal.net_flow_24h_usd,
    netFlow7dUsd: signal.net_flow_7d_usd,
    marketCapUsd: signal.market_cap_usd,
    tokenAgeDays: signal.token_age_days,
    keyMetrics: buildMetrics(signal, avgWalletScore, holdersStillHolding),
    guardrails: guards,
    rawPayload: {
      signal,
      buyerCount: buyers.length,
      degradedReason,
    },
  };

  return {
    opportunity,
    preliminaryScore: preliminaryScore(signal),
  };
}

function buildSummary(opportunities: InboxOpportunity[]): InboxSnapshot['summary'] {
  const ready = opportunities.filter((opportunity) => opportunity.status === 'ready');
  const blocked = opportunities.filter((opportunity) => opportunity.status === 'blocked');
  const degraded = opportunities.filter((opportunity) => opportunity.status === 'degraded');
  const top = opportunities[0] ?? null;

  if (opportunities.length === 0) {
    return {
      headline: 'No trade today',
      subheadline: 'Nothing cleared the current guardrails, which is better than forcing a trade.',
      counts: { total: 0, ready: 0, blocked: 0, degraded: 0 },
      topScore: null,
      topSymbol: null,
    };
  }

  return {
    headline: ready.length > 0
      ? `${ready.length} opportunities deserve a real look`
      : 'No clean setup cleared the rules',
    subheadline: ready.length > 0
      ? `${top?.tokenSymbol ?? 'Top idea'} leads the queue right now. Blocked and degraded setups stay visible so you can see what got filtered out.`
      : 'The system still shows what it saw, but it is telling you not to force the trade.',
    counts: {
      total: opportunities.length,
      ready: ready.length,
      blocked: blocked.length,
      degraded: degraded.length,
    },
    topScore: top?.score ?? null,
    topSymbol: top?.tokenSymbol ?? null,
  };
}

export async function buildInboxSnapshot({
  chain = DEFAULT_CHAIN,
}: {
  chain?: string;
} = {}): Promise<InboxSnapshot> {
  const signals = await getClusterSignals({ chain, minWallets: 3 });

  const shortlisted = signals
    .slice()
    .sort((left, right) => preliminaryScore(right) - preliminaryScore(left))
    .slice(0, MAX_ENRICHED_CANDIDATES);

  const enriched = await Promise.all(shortlisted.map((signal) => enrichCandidate(signal)));
  const opportunities = enriched
    .sort((left, right) => {
      if (right.opportunity.score !== left.opportunity.score) {
        return right.opportunity.score - left.opportunity.score;
      }
      if (right.preliminaryScore !== left.preliminaryScore) {
        return right.preliminaryScore - left.preliminaryScore;
      }
      return right.opportunity.netFlow24hUsd - left.opportunity.netFlow24hUsd;
    })
    .map(({ opportunity }, index) => ({
      ...opportunity,
      rank: index + 1,
    }));

  const readyCount = opportunities.filter((opportunity) => opportunity.status === 'ready').length;
  const status: InboxSnapshotStatus =
    opportunities.length === 0 ? 'empty' : readyCount === 0 ? 'partial' : opportunities.some((opportunity) => opportunity.status === 'degraded') ? 'partial' : 'ready';

  return {
    id: randomUUID(),
    chain,
    status,
    generatedAt: new Date().toISOString(),
    summary: buildSummary(opportunities),
    opportunities,
    rawPayload: {
      totalSignals: signals.length,
      shortlisted: shortlisted.map((signal) => ({
        token: signal.token,
        tokenAddress: signal.token_address,
        traderCount: signal.trader_count,
        netFlow7dUsd: signal.net_flow_7d_usd,
      })),
    },
  };
}
