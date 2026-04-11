import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nansen/client', () => ({
  getClusterSignals: vi.fn(),
  getWhoBoughtSold: vi.fn(),
  computeWalletScore: vi.fn(),
}));

import { buildInboxSnapshot } from '@/lib/inbox/build-snapshot';
import {
  computeWalletScore,
  getClusterSignals,
  getWhoBoughtSold,
} from '@/lib/nansen/client';
import type { ClusterSignal, WhoBoughtSoldEntry } from '@/lib/nansen/types';

const mockedGetClusterSignals = vi.mocked(getClusterSignals);
const mockedGetWhoBoughtSold = vi.mocked(getWhoBoughtSold);
const mockedComputeWalletScore = vi.mocked(computeWalletScore);

function makeSignal(overrides: Partial<ClusterSignal>): ClusterSignal {
  return {
    token: 'ALPHA',
    token_address: 'alpha-token',
    chain: 'solana',
    wallets: [],
    trader_count: 6,
    avg_score: 0,
    signal_strength: 15,
    first_buy_at: new Date().toISOString(),
    window_hours: 24,
    conviction: 'high',
    net_flow_7d_usd: 2_500_000,
    net_flow_24h_usd: 450_000,
    market_cap_usd: 9_000_000,
    token_sectors: ['meme'],
    token_age_days: 18,
    ...overrides,
  };
}

function makeBuyer(address: string, bought: number, sold: number): WhoBoughtSoldEntry {
  return {
    address,
    address_label: '',
    bought_token_volume: bought,
    sold_token_volume: sold,
    token_trade_volume: bought + sold,
    bought_volume_usd: bought,
    sold_volume_usd: sold,
    trade_volume_usd: bought + sold,
  };
}

describe('buildInboxSnapshot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('ranks clean opportunities above blocked ones and builds a ready snapshot', async () => {
    mockedGetClusterSignals.mockResolvedValue([
      makeSignal({ token: 'ALPHA', token_address: 'alpha-token' }),
      makeSignal({
        token: 'BLOCK',
        token_address: 'block-token',
        net_flow_7d_usd: -50_000,
        net_flow_24h_usd: -5_000,
        market_cap_usd: 120_000,
        token_age_days: 1,
        conviction: 'medium',
        trader_count: 3,
      }),
    ]);

    mockedGetWhoBoughtSold.mockImplementation(async ({ tokenAddress }) => {
      if (tokenAddress === 'alpha-token') {
        return [
          makeBuyer('wallet-a', 120_000, 10_000),
          makeBuyer('wallet-b', 90_000, 20_000),
          makeBuyer('wallet-c', 75_000, 15_000),
        ];
      }

      return [
        makeBuyer('wallet-d', 25_000, 35_000),
        makeBuyer('wallet-e', 10_000, 20_000),
      ];
    });

    mockedComputeWalletScore.mockImplementation(async (address) => ({
      address,
      chain: 'solana',
      label: '',
      pnl_90d_pct: 0,
      win_rate: 0,
      avg_hold_hours: 0,
      consistency: 0,
      composite_score: address.includes('wallet-a') || address.includes('wallet-b') || address.includes('wallet-c') ? 82 : 28,
      top_holdings: [],
      bought_volume_usd: 0,
      sold_volume_usd: 0,
    }));

    const snapshot = await buildInboxSnapshot();

    expect(snapshot.status).toBe('ready');
    expect(snapshot.summary.counts.ready).toBe(1);
    expect(snapshot.summary.counts.blocked).toBe(1);
    expect(snapshot.opportunities[0]?.tokenSymbol).toBe('ALPHA');
    expect(snapshot.opportunities[0]?.status).toBe('ready');
    expect(snapshot.opportunities[1]?.status).toBe('blocked');
    expect(snapshot.opportunities[1]?.primaryRisk).toMatch(/market cap|trend/i);
  });

  it('marks the snapshot partial when enrichment data is degraded', async () => {
    mockedGetClusterSignals.mockResolvedValue([
      makeSignal({ token: 'DEGRADE', token_address: 'degrade-token', conviction: 'medium' }),
    ]);

    mockedGetWhoBoughtSold.mockRejectedValue(new Error('mock buyer failure'));

    const snapshot = await buildInboxSnapshot();

    expect(snapshot.status).toBe('partial');
    expect(snapshot.opportunities[0]?.status).toBe('degraded');
    expect(snapshot.opportunities[0]?.guardrails.some((guard) => guard.key === 'degraded')).toBe(true);
  });

  it('uses 24h flow as a deterministic tie-breaker', async () => {
    mockedGetClusterSignals.mockResolvedValue([
      makeSignal({ token: 'FAST', token_address: 'fast-token', net_flow_24h_usd: 350_000 }),
      makeSignal({ token: 'SLOW', token_address: 'slow-token', net_flow_24h_usd: 150_000 }),
    ]);

    mockedGetWhoBoughtSold.mockResolvedValue([
      makeBuyer('wallet-a', 60_000, 10_000),
      makeBuyer('wallet-b', 55_000, 5_000),
    ]);

    mockedComputeWalletScore.mockResolvedValue({
      address: 'wallet-a',
      chain: 'solana',
      label: '',
      pnl_90d_pct: 0,
      win_rate: 0,
      avg_hold_hours: 0,
      consistency: 0,
      composite_score: 70,
      top_holdings: [],
      bought_volume_usd: 0,
      sold_volume_usd: 0,
    });

    const snapshot = await buildInboxSnapshot();

    expect(snapshot.opportunities[0]?.tokenSymbol).toBe('FAST');
    expect(snapshot.opportunities[1]?.tokenSymbol).toBe('SLOW');
  });

  it('returns an empty snapshot when no signals are available', async () => {
    mockedGetClusterSignals.mockResolvedValue([]);

    const snapshot = await buildInboxSnapshot();

    expect(snapshot.status).toBe('empty');
    expect(snapshot.opportunities).toHaveLength(0);
    expect(snapshot.summary.headline).toBe('No trade today');
  });
});
