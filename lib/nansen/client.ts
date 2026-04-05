import type { NetflowToken, WhoBoughtSoldEntry, WalletScore, ClusterSignal, TradeConfirmation } from './types';

let apiInstance: InstanceType<typeof import('nansen-cli/src/api.js').default> | null = null;

async function getApi() {
  if (!apiInstance) {
    const { default: NansenAPI } = await import('nansen-cli/src/api.js');
    apiInstance = new NansenAPI(process.env.NANSEN_API_KEY);
  }
  return apiInstance;
}

function extractArray(result: Record<string, unknown>): unknown[] {
  const data = result?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/**
 * Fetch ALL tokens with smart money activity on a chain.
 * One API call, ~50 credits, returns the complete picture (187 tokens on Solana).
 */
export async function getSmartMoneyNetflow(params: { chain?: string; limit?: number } = {}): Promise<NetflowToken[]> {
  const api = await getApi();
  const result = await api.smartMoneyNetflow({
    chains: [params.chain || 'solana'],
    limit: params.limit || 200, // Get everything — Solana has ~187 tokens with SM activity
  });
  return extractArray(result as Record<string, unknown>) as NetflowToken[];
}

/**
 * Get wallets that bought/sold a specific token. ~10 credits per call.
 */
export async function getWhoBoughtSold(params: { tokenAddress: string; chain?: string; limit?: number }): Promise<WhoBoughtSoldEntry[]> {
  const api = await getApi();
  const result = await api.tokenWhoBoughtSold({
    tokenAddress: params.tokenAddress,
    chain: params.chain || 'solana',
    limit: params.limit || 30,
  });
  return extractArray(result as Record<string, unknown>) as WhoBoughtSoldEntry[];
}

/**
 * Get PnL summary for a specific wallet. ~10 credits per call.
 * Only use for deep analysis on specific wallets, not bulk scanning.
 */
export async function getWalletPnlSummary(params: { address: string; chain?: string; days?: number }): Promise<{
  realized_pnl_usd: number;
  realized_pnl_percent: number;
  win_rate: number;
  traded_times: number;
  traded_token_count: number;
  top5_tokens: string[];
}> {
  const api = await getApi();
  const result = await api.addressPnlSummary({
    address: params.address,
    chain: params.chain || 'solana',
    days: params.days || 90,
  });
  const data = (result?.data ?? result) as Record<string, unknown>;
  return {
    realized_pnl_usd: (data?.realized_pnl_usd as number) ?? 0,
    realized_pnl_percent: (data?.realized_pnl_percent as number) ?? 0,
    win_rate: (data?.win_rate as number) ?? 0,
    traded_times: (data?.traded_times as number) ?? 0,
    traded_token_count: (data?.traded_token_count as number) ?? 0,
    top5_tokens: (data?.top5_tokens as string[]) ?? [],
  };
}

/**
 * Score a wallet. skipProfiler=true uses volume-only scoring (free).
 * skipProfiler=false calls addressPnlSummary (10 credits).
 */
export async function computeWalletScore(
  address: string,
  chain: string,
  buyerData?: WhoBoughtSoldEntry,
  options?: { skipProfiler?: boolean },
): Promise<WalletScore> {
  let pnl = { realized_pnl_usd: 0, realized_pnl_percent: 0, win_rate: 0, traded_times: 0, traded_token_count: 0, top5_tokens: [] as string[] };

  if (!options?.skipProfiler) {
    try {
      pnl = await getWalletPnlSummary({ address, chain });
    } catch {
      // profiler failed, fall through to volume scoring
    }
  }

  if (pnl.traded_times > 0) {
    const consistency = pnl.win_rate > 0 ? Math.max(0, 1 - (Math.abs(pnl.realized_pnl_percent) / 200)) : 0;
    const normalizedPnl = Math.min(1, Math.max(0, (pnl.realized_pnl_percent + 100) / 300));
    const compositeScore = Math.round(
      (0.4 * normalizedPnl + 0.35 * pnl.win_rate + 0.25 * consistency) * 100
    );
    return {
      address, chain, label: '',
      pnl_90d_pct: pnl.realized_pnl_percent,
      win_rate: pnl.win_rate,
      avg_hold_hours: 0, consistency,
      composite_score: Math.max(0, Math.min(100, compositeScore)),
      top_holdings: pnl.top5_tokens,
      bought_volume_usd: buyerData?.bought_volume_usd ?? 0,
      sold_volume_usd: buyerData?.sold_volume_usd ?? 0,
    };
  }

  if (buyerData && buyerData.bought_volume_usd > 0) {
    const volumeRatio = buyerData.sold_volume_usd > 0
      ? (buyerData.sold_volume_usd - buyerData.bought_volume_usd) / buyerData.bought_volume_usd
      : 0;
    return {
      address, chain,
      label: buyerData.address_label || '',
      pnl_90d_pct: volumeRatio * 100,
      win_rate: volumeRatio > 0 ? 0.6 : 0.4,
      avg_hold_hours: 0, consistency: 0.5,
      composite_score: Math.max(0, Math.min(100, Math.round(50 + volumeRatio * 50))),
      top_holdings: [],
      bought_volume_usd: buyerData.bought_volume_usd,
      sold_volume_usd: buyerData.sold_volume_usd,
    };
  }

  return {
    address, chain, label: '',
    pnl_90d_pct: 0, win_rate: 0, avg_hold_hours: 0, consistency: 0, composite_score: 0,
    top_holdings: [], bought_volume_usd: 0, sold_volume_usd: 0,
  };
}

/**
 * Detect cluster convergence from ALL tokens on the chain.
 * Uses netflow trader_count as the signal — no per-token API calls needed.
 * One API call gets the full picture.
 */
export async function getClusterSignals(params: { chain?: string; minWallets?: number } = {}): Promise<ClusterSignal[]> {
  const chain = params.chain || 'solana';
  const minWallets = params.minWallets || 3;

  // One call — get ALL tokens with smart money activity
  const allTokens = await getSmartMoneyNetflow({ chain, limit: 200 });

  // Every token with trader_count >= minWallets is a cluster signal
  const converging = allTokens
    .filter(t => t.trader_count >= minWallets)
    .sort((a, b) => b.trader_count - a.trader_count || b.net_flow_7d_usd - a.net_flow_7d_usd);

  const signals: ClusterSignal[] = converging.map(token => {
    const signalStrength = Math.round((token.trader_count * (token.net_flow_7d_usd > 0 ? 1.5 : 0.5)) * 100) / 100;
    const conviction: 'low' | 'medium' | 'high' =
      token.trader_count >= 7 ? 'high' : token.trader_count >= 5 ? 'medium' : 'low';

    return {
      token: token.token_symbol,
      token_address: token.token_address,
      chain,
      wallets: [],
      trader_count: token.trader_count,
      avg_score: 0,
      signal_strength: signalStrength,
      first_buy_at: new Date().toISOString(),
      window_hours: 24,
      conviction,
      net_flow_7d_usd: token.net_flow_7d_usd,
      net_flow_24h_usd: token.net_flow_24h_usd,
      market_cap_usd: token.market_cap_usd,
      token_sectors: token.token_sectors,
      token_age_days: token.token_age_days,
    };
  });

  return signals;
}

export async function getTradeQuote(params: { tokenAddress: string; amountUsd: number; chain?: string }): Promise<TradeConfirmation> {
  const chain = params.chain || 'solana';
  try {
    const { getQuote } = await import('nansen-cli/src/trading.js');
    const result = await getQuote({
      chain, from: 'SOL', to: params.tokenAddress,
      amount: String(Math.round(params.amountUsd * 1e9)),
    });
    const quote = result.quotes?.[0];
    return {
      token: '', token_address: params.tokenAddress, amount_usd: params.amountUsd,
      execution_price: quote ? parseFloat(quote.outputAmount) / 1e9 : 0,
      slippage_pct: 0, tx_hash: '', status: 'quote_only', chain,
    };
  } catch {
    return {
      token: '', token_address: params.tokenAddress, amount_usd: params.amountUsd,
      execution_price: 0, slippage_pct: 0, tx_hash: '', status: 'failed', chain,
    };
  }
}
