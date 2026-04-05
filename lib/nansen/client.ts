import type {
  NetflowToken, WhoBoughtSoldEntry, WalletScore, ClusterSignal, TradeConfirmation,
  SmartMoneyDexTrade, SmartMoneyPerpTrade, SmartMoneyHolding,
  WalletTransaction, WalletCounterparty, RelatedWallet,
  TokenScreenerEntry, TokenFlowSegment, TokenHolder,
  PerpContract, PerpLeaderboardEntry,
  PredictionMarket, Alert, SearchResult,
} from './types';

let apiInstance: InstanceType<typeof import('nansen-cli/src/api.js').default> | null = null;

async function getApi() {
  if (!apiInstance) {
    const { default: NansenAPI } = await import('nansen-cli/src/api.js');
    apiInstance = new NansenAPI(process.env.NANSEN_API_KEY);
  }
  return apiInstance;
}

/** Export raw API instance for advanced tools that need direct access */
export async function getApiInstance() {
  return getApi();
}

function extractArray(result: Record<string, unknown>): unknown[] {
  const data = result?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if ('data' in obj && Array.isArray(obj.data)) return obj.data as unknown[];
    if ('results' in obj && Array.isArray(obj.results)) return obj.results as unknown[];
  }
  return [];
}

function extractObject(result: Record<string, unknown>): Record<string, unknown> {
  return (result?.data ?? result ?? {}) as Record<string, unknown>;
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

export async function getTradeQuote(params: { from: string; to: string; amountUsd: number; chain?: string }): Promise<TradeConfirmation & { error?: string }> {
  const chain = params.chain || 'solana';
  try {
    const { getQuote } = await import('nansen-cli/src/trading.js');

    // The Nansen trade API expects amount in the sell token's smallest unit.
    // For USDC (6 decimals): $20 = 20_000_000
    // For SOL (9 decimals): use lamports
    // Default to 6 decimals (USDC-like) for USD-denominated trades
    const decimals = params.from.toUpperCase() === 'SOL' ? 9 : 6;
    const rawAmount = String(Math.round(params.amountUsd * 10 ** decimals));

    const result = await getQuote({
      chain,
      from: params.from,
      to: params.to,
      amount: rawAmount,
    });

    const quote = result.quotes?.[0];
    if (!quote) {
      return {
        token: params.to, token_address: params.to, amount_usd: params.amountUsd,
        execution_price: 0, slippage_pct: 0, tx_hash: '', status: 'failed', chain,
        error: 'No quote returned. This trading pair may not be supported.',
      };
    }

    return {
      token: params.to, token_address: params.to, amount_usd: params.amountUsd,
      execution_price: parseFloat(quote.outputAmount) / 10 ** decimals,
      slippage_pct: quote.fees || 0,
      tx_hash: '', status: 'quote_only', chain,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      token: params.to, token_address: params.to, amount_usd: params.amountUsd,
      execution_price: 0, slippage_pct: 0, tx_hash: '', status: 'failed', chain,
      error: `Trade quote failed: ${errorMsg}`,
    };
  }
}

// ── Smart Money ─────────────────────────────────────────────────────

export async function getSmartMoneyDexTrades(params: { chain?: string; limit?: number } = {}): Promise<SmartMoneyDexTrade[]> {
  const api = await getApi();
  const result = await api.smartMoneyDexTrades({ chains: [params.chain || 'solana'], limit: params.limit || 30 });
  return extractArray(result as Record<string, unknown>) as SmartMoneyDexTrade[];
}

export async function getSmartMoneyPerpTrades(params: { limit?: number } = {}): Promise<SmartMoneyPerpTrade[]> {
  const api = await getApi();
  const result = await api.smartMoneyPerpTrades({ limit: params.limit || 30 });
  return extractArray(result as Record<string, unknown>) as SmartMoneyPerpTrade[];
}

export async function getSmartMoneyHoldings(params: { chain?: string; limit?: number } = {}): Promise<SmartMoneyHolding[]> {
  const api = await getApi();
  const result = await api.smartMoneyHoldings({ chains: [params.chain || 'solana'], limit: params.limit || 50 });
  return extractArray(result as Record<string, unknown>) as SmartMoneyHolding[];
}

export async function getSmartMoneyHistoricalHoldings(params: { chain?: string; days?: number } = {}): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.smartMoneyHistoricalHoldings({ chains: [params.chain || 'solana'], days: params.days || 30 });
  return extractArray(result as Record<string, unknown>);
}

// ── Wallet Intelligence ─────────────────────────────────────────────

export async function getWalletBalance(params: { address: string; chain?: string }): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.addressBalance({ address: params.address, chain: params.chain || 'ethereum' });
  return extractArray(result as Record<string, unknown>);
}

export async function getWalletLabels(params: { address: string; chain?: string }): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.addressLabels({ address: params.address, chain: params.chain || 'ethereum' });
  return extractArray(result as Record<string, unknown>);
}

export async function getWalletTransactions(params: { address: string; chain?: string; days?: number; limit?: number }): Promise<WalletTransaction[]> {
  const api = await getApi();
  const result = await api.addressTransactions({ address: params.address, chain: params.chain || 'ethereum', days: params.days || 30, limit: params.limit || 30 });
  return extractArray(result as Record<string, unknown>) as WalletTransaction[];
}

export async function getWalletCounterparties(params: { address: string; chain?: string; days?: number }): Promise<WalletCounterparty[]> {
  const api = await getApi();
  const result = await api.addressCounterparties({ address: params.address, chain: params.chain || 'ethereum', days: params.days || 30 });
  return extractArray(result as Record<string, unknown>) as WalletCounterparty[];
}

export async function getWalletRelated(params: { address: string; chain?: string }): Promise<RelatedWallet[]> {
  const api = await getApi();
  const result = await api.addressRelatedWallets({ address: params.address, chain: params.chain || 'ethereum' });
  return extractArray(result as Record<string, unknown>) as RelatedWallet[];
}

export async function getWalletPnlDetails(params: { address: string; chain?: string; days?: number }): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.addressPnl({ address: params.address, chain: params.chain || 'ethereum', days: params.days || 90 });
  return extractArray(result as Record<string, unknown>);
}

// ── Token Analysis ──────────────────────────────────────────────────

export async function getTokenScreener(params: { chain?: string; timeframe?: string; limit?: number } = {}): Promise<TokenScreenerEntry[]> {
  const api = await getApi();
  const result = await api.tokenScreener({ chain: params.chain || 'solana', timeframe: params.timeframe || '24h', limit: params.limit || 50 });
  return extractArray(result as Record<string, unknown>) as TokenScreenerEntry[];
}

export async function getTokenInfo(params: { tokenAddress: string; chain?: string }): Promise<Record<string, unknown>> {
  const api = await getApi();
  const result = await api.tokenInformation({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana' });
  return extractObject(result as Record<string, unknown>);
}

export async function getTokenIndicators(params: { tokenAddress: string; chain?: string }): Promise<Record<string, unknown>> {
  const api = await getApi();
  const result = await api.tokenIndicators({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana' });
  return extractObject(result as Record<string, unknown>);
}

export async function getTokenFlows(params: { tokenAddress: string; chain?: string; days?: number; label?: string }): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.tokenFlows({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana', days: params.days || 7, label: params.label });
  return extractArray(result as Record<string, unknown>);
}

export async function getTokenFlowIntelligence(params: { tokenAddress: string; chain?: string; timeframe?: string }): Promise<TokenFlowSegment[]> {
  const api = await getApi();
  const result = await api.tokenFlowIntelligence({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana', timeframe: params.timeframe || '24h' });
  return extractArray(result as Record<string, unknown>) as TokenFlowSegment[];
}

export async function getTokenHolders(params: { tokenAddress: string; chain?: string; limit?: number }): Promise<TokenHolder[]> {
  const api = await getApi();
  const result = await api.tokenHolders({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana', limit: params.limit || 30 });
  return extractArray(result as Record<string, unknown>) as TokenHolder[];
}

export async function getTokenDexTrades(params: { tokenAddress: string; chain?: string; days?: number; limit?: number }): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.tokenDexTrades({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana', days: params.days || 7, limit: params.limit || 30 });
  return extractArray(result as Record<string, unknown>);
}

export async function getTokenOhlcv(params: { tokenAddress: string; chain?: string; timeframe?: string }): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.tokenOhlcv({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana', timeframe: params.timeframe || '1h' });
  return extractArray(result as Record<string, unknown>);
}

// ── Perpetual Futures ───────────────────────────────────────────────

export async function getPerpScreener(params: { days?: number; limit?: number } = {}): Promise<PerpContract[]> {
  const api = await getApi();
  const result = await api.perpScreener({ days: params.days || 7, limit: params.limit || 30 });
  return extractArray(result as Record<string, unknown>) as PerpContract[];
}

export async function getPerpLeaderboard(params: { days?: number; limit?: number } = {}): Promise<PerpLeaderboardEntry[]> {
  const api = await getApi();
  const result = await api.perpLeaderboard({ days: params.days || 7, limit: params.limit || 30 });
  return extractArray(result as Record<string, unknown>) as PerpLeaderboardEntry[];
}

// ── Prediction Markets ──────────────────────────────────────────────

export async function getPredictionMarketScreener(params: { query?: string; mode?: 'market' | 'event' | 'categories' } = {}): Promise<PredictionMarket[]> {
  const api = await getApi();
  const mode = params.mode || 'market';
  let result;
  if (mode === 'event') {
    result = await api.pmEventScreener({ query: params.query });
  } else if (mode === 'categories') {
    result = await api.pmCategories();
  } else {
    result = await api.pmMarketScreener({ query: params.query });
  }
  return extractArray(result as Record<string, unknown>) as PredictionMarket[];
}

export async function getPredictionMarketDetail(params: { marketId: string; include?: string[] }): Promise<Record<string, unknown>> {
  const api = await getApi();
  const include = params.include || ['ohlcv', 'orderbook', 'topHolders'];
  const results: Record<string, unknown> = { marketId: params.marketId };

  const calls = include.map(async (field) => {
    try {
      switch (field) {
        case 'ohlcv': results.ohlcv = extractArray(await api.pmOhlcv({ marketId: params.marketId }) as Record<string, unknown>); break;
        case 'orderbook': results.orderbook = extractObject(await api.pmOrderbook({ marketId: params.marketId }) as Record<string, unknown>); break;
        case 'topHolders': results.topHolders = extractArray(await api.pmTopHolders({ marketId: params.marketId }) as Record<string, unknown>); break;
        case 'trades': results.trades = extractArray(await api.pmTradesByMarket({ marketId: params.marketId }) as Record<string, unknown>); break;
        case 'pnl': results.pnl = extractObject(await api.pmPnlByMarket({ marketId: params.marketId }) as Record<string, unknown>); break;
      }
    } catch { /* individual field failure is ok */ }
  });
  await Promise.all(calls);
  return results;
}

// ── Alerts ───────────────────────────────────────────────────────────

export async function listAlerts(): Promise<Alert[]> {
  const api = await getApi();
  const result = await api.alertsList();
  return extractArray(result as Record<string, unknown>) as Alert[];
}

export async function createAlert(params: { name: string; type: string; chains?: string[]; description?: string; [k: string]: unknown }): Promise<Record<string, unknown>> {
  const api = await getApi();
  const result = await api.alertsCreate(params as { name: string; type: string; [k: string]: unknown });
  return extractObject(result as Record<string, unknown>);
}

export async function updateAlert(params: { id: string; [k: string]: unknown }): Promise<Record<string, unknown>> {
  const api = await getApi();
  const result = await api.alertsUpdate(params as { id: string; [k: string]: unknown });
  return extractObject(result as Record<string, unknown>);
}

export async function toggleAlert(params: { id: string; enabled: boolean }): Promise<Record<string, unknown>> {
  const api = await getApi();
  const result = await api.alertsToggle({ id: params.id, enabled: params.enabled, disabled: !params.enabled });
  return extractObject(result as Record<string, unknown>);
}

export async function deleteAlert(params: { id: string }): Promise<Record<string, unknown>> {
  const api = await getApi();
  const result = await api.alertsDelete({ id: params.id });
  return extractObject(result as Record<string, unknown>);
}

// ── Search ───────────────────────────────────────────────────────────

export async function searchNansen(params: { query: string; type?: string; limit?: number }): Promise<SearchResult[]> {
  const api = await getApi();
  const result = await api.generalSearch({ query: params.query, type: params.type, limit: params.limit || 20 });
  return extractArray(result as Record<string, unknown>) as SearchResult[];
}

export async function searchEntities(params: { query: string }): Promise<unknown[]> {
  const api = await getApi();
  const result = await api.entitySearch({ query: params.query });
  return extractArray(result as Record<string, unknown>);
}

// ── Bridge ───────────────────────────────────────────────────────────

export async function getBridgeStatus(params: { txHash: string; fromChain: string; toChain: string }): Promise<Record<string, unknown>> {
  const { getBridgeStatus: bridgeStatus } = await import('nansen-cli/src/trading.js');
  return bridgeStatus(params.txHash, params.fromChain, params.toChain);
}

// ── Account ──────────────────────────────────────────────────────────

export async function getAccountStatus(): Promise<{ plan: string; credits_remaining: number }> {
  const api = await getApi();
  const result = await api.getAccount();
  const data = (result?.data ?? result) as Record<string, unknown>;
  return { plan: (data?.plan as string) ?? 'unknown', credits_remaining: (data?.credits_remaining as number) ?? 0 };
}
