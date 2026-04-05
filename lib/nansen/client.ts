import type { NetflowToken, WhoBoughtSoldEntry, WalletScore, ClusterSignal, TradeConfirmation } from './types';

let apiInstance: InstanceType<typeof import('nansen-cli/src/api.js').default> | null = null;

async function getApi() {
  if (!apiInstance) {
    const { default: NansenAPI } = await import('nansen-cli/src/api.js');
    apiInstance = new NansenAPI(process.env.NANSEN_API_KEY);
  }
  return apiInstance;
}

// The nansen-cli programmatic API returns { data: [...], pagination: {...} }
// where data is the array of results directly (not nested as data.data)
function extractArray(result: Record<string, unknown>): unknown[] {
  const data = result?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

export async function getSmartMoneyNetflow(params: { chain?: string; limit?: number } = {}): Promise<NetflowToken[]> {
  const api = await getApi();
  const result = await api.smartMoneyNetflow({
    chains: [params.chain || 'solana'],
    limit: params.limit || 50,
  });
  return extractArray(result as Record<string, unknown>) as NetflowToken[];
}

export async function getWhoBoughtSold(params: { tokenAddress: string; chain?: string; limit?: number }): Promise<WhoBoughtSoldEntry[]> {
  const api = await getApi();
  const result = await api.tokenWhoBoughtSold({
    tokenAddress: params.tokenAddress,
    chain: params.chain || 'solana',
    limit: params.limit || 30,
  });
  return extractArray(result as Record<string, unknown>) as WhoBoughtSoldEntry[];
}

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
  // addressPnlSummary returns a single object, not an array
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
      // profiler failed, use volume fallback
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
      avg_hold_hours: 0,
      consistency,
      composite_score: Math.max(0, Math.min(100, compositeScore)),
      top_holdings: pnl.top5_tokens,
      bought_volume_usd: buyerData?.bought_volume_usd ?? 0,
      sold_volume_usd: buyerData?.sold_volume_usd ?? 0,
    };
  }

  // Fallback: score from buy/sell volume ratios
  if (buyerData && buyerData.bought_volume_usd > 0) {
    const volumeRatio = buyerData.sold_volume_usd > 0
      ? (buyerData.sold_volume_usd - buyerData.bought_volume_usd) / buyerData.bought_volume_usd
      : 0;
    return {
      address, chain,
      label: buyerData.address_label || '',
      pnl_90d_pct: volumeRatio * 100,
      win_rate: volumeRatio > 0 ? 0.6 : 0.4,
      avg_hold_hours: 0,
      consistency: 0.5,
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

export async function getClusterSignals(params: { chain?: string; minWallets?: number } = {}): Promise<ClusterSignal[]> {
  const chain = params.chain || 'solana';
  const minWallets = params.minWallets || 3;

  const tokens = await getSmartMoneyNetflow({ chain, limit: 30 });
  const qualifying = tokens.filter(t => t.trader_count >= minWallets);
  const signals: ClusterSignal[] = [];

  for (const token of qualifying.slice(0, 10)) {
    const buyers = await getWhoBoughtSold({ tokenAddress: token.token_address, chain, limit: 15 });
    const walletScores: WalletScore[] = [];

    for (const buyer of buyers.slice(0, 10)) {
      const score = await computeWalletScore(buyer.address, chain, buyer, { skipProfiler: true });
      score.label = buyer.address_label || score.label;
      walletScores.push(score);
    }

    const scoredWallets = walletScores.filter(w => w.composite_score > 0);
    if (scoredWallets.length < minWallets) continue;

    const avgScore = scoredWallets.reduce((s, w) => s + w.composite_score, 0) / scoredWallets.length;
    const signalStrength = (scoredWallets.length * avgScore) / 100;
    const conviction: 'low' | 'medium' | 'high' =
      signalStrength > 4 ? 'high' : signalStrength > 2 ? 'medium' : 'low';

    signals.push({
      token: token.token_symbol,
      token_address: token.token_address,
      chain,
      wallets: scoredWallets.sort((a, b) => b.composite_score - a.composite_score),
      avg_score: Math.round(avgScore),
      signal_strength: Math.round(signalStrength * 100) / 100,
      first_buy_at: new Date().toISOString(),
      window_hours: 24,
      conviction,
      net_flow_7d_usd: token.net_flow_7d_usd,
      market_cap_usd: token.market_cap_usd,
    });
  }

  return signals.sort((a, b) => b.signal_strength - a.signal_strength);
}

export async function getTradeQuote(params: { tokenAddress: string; amountUsd: number; chain?: string }): Promise<TradeConfirmation> {
  const chain = params.chain || 'solana';

  try {
    const { getQuote } = await import('nansen-cli/src/trading.js');
    const result = await getQuote({
      chain,
      from: 'SOL',
      to: params.tokenAddress,
      amount: String(Math.round(params.amountUsd * 1e9)),
    });

    const quote = result.quotes?.[0];
    return {
      token: '', token_address: params.tokenAddress,
      amount_usd: params.amountUsd,
      execution_price: quote ? parseFloat(quote.outputAmount) / 1e9 : 0,
      slippage_pct: 0, tx_hash: '', status: 'quote_only', chain,
    };
  } catch {
    return {
      token: '', token_address: params.tokenAddress,
      amount_usd: params.amountUsd,
      execution_price: 0, slippage_pct: 0, tx_hash: '', status: 'failed', chain,
    };
  }
}
