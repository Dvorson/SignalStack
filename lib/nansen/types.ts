// ── Existing types (Smart Money + Trading) ──────────────────────────

export interface WalletScore {
  address: string;
  chain: string;
  label: string;
  pnl_90d_pct: number;
  win_rate: number;
  avg_hold_hours: number;
  consistency: number;
  composite_score: number;
  top_holdings: unknown[];
  bought_volume_usd: number;
  sold_volume_usd: number;
}

export interface ClusterSignal {
  token: string;
  token_address: string;
  chain: string;
  wallets: WalletScore[];
  trader_count: number;
  avg_score: number;
  signal_strength: number;
  first_buy_at: string;
  window_hours: number;
  conviction: 'low' | 'medium' | 'high';
  net_flow_7d_usd: number;
  net_flow_24h_usd: number;
  market_cap_usd: number;
  token_sectors: string[];
  token_age_days: number;
}

export interface TradeConfirmation {
  token: string;
  token_address: string;
  amount_usd: number;
  execution_price: number;
  slippage_pct: number;
  tx_hash: string;
  status: 'success' | 'failed' | 'quote_only';
  chain: string;
}

export interface NetflowToken {
  token_address: string;
  token_symbol: string;
  net_flow_1h_usd: number;
  net_flow_24h_usd: number;
  net_flow_7d_usd: number;
  net_flow_30d_usd: number;
  chain: string;
  token_sectors: string[];
  trader_count: number;
  token_age_days: number;
  market_cap_usd: number;
}

export interface WhoBoughtSoldEntry {
  address: string;
  address_label: string;
  bought_token_volume: number;
  sold_token_volume: number;
  token_trade_volume: number;
  bought_volume_usd: number;
  sold_volume_usd: number;
  trade_volume_usd: number;
}

// ── Smart Money ─────────────────────────────────────────────────────

export interface SmartMoneyDexTrade {
  chain: string;
  timestamp: string;
  tx_hash: string;
  trader_address: string;
  trader_label: string;
  token_in_symbol: string;
  token_out_symbol: string;
  amount_in: number;
  amount_out: number;
  value_usd: number;
  dex_name: string;
}

export interface SmartMoneyPerpTrade {
  timestamp: string;
  trader_address: string;
  trader_label: string;
  symbol: string;
  side: string;
  size_usd: number;
  price: number;
  leverage: number;
}

export interface SmartMoneyHolding {
  token_address: string;
  token_symbol: string;
  chain: string;
  value_usd: number;
  holder_count: number;
}

// ── Wallet Intelligence ─────────────────────────────────────────────

export interface WalletTransaction {
  timestamp: string;
  tx_hash: string;
  from: string;
  to: string;
  value_usd: number;
  token_symbol: string;
  chain: string;
}

export interface WalletCounterparty {
  address: string;
  label: string;
  volume_usd: number;
  tx_count: number;
}

export interface RelatedWallet {
  address: string;
  label: string;
  chain: string;
  strength: number;
}

// ── Token Analysis ──────────────────────────────────────────────────

export interface TokenScreenerEntry {
  token_address: string;
  token_symbol: string;
  name: string;
  chain: string;
  price_usd: number;
  market_cap_usd: number;
  volume_usd: number;
  price_change_pct: number;
  liquidity_usd: number;
}

export interface TokenFlowEntry {
  chain: string;
  token_address: string;
  net_flow_usd: number;
  inflow_usd: number;
  outflow_usd: number;
}

export interface TokenFlowSegment {
  label: string;
  net_flow_usd: number;
  inflow_usd: number;
  outflow_usd: number;
  wallet_count: number;
}

export interface TokenHolder {
  address: string;
  label: string;
  share_pct: number;
  value_usd: number;
  balance: number;
}

// ── Perpetual Futures ───────────────────────────────────────────────

export interface PerpContract {
  symbol: string;
  volume_usd: number;
  open_interest_usd: number;
  price_change_pct: number;
}

export interface PerpLeaderboardEntry {
  address: string;
  label: string;
  pnl_usd: number;
  roi_pct: number;
  trade_count: number;
}

// ── Prediction Markets ──────────────────────────────────────────────

export interface PredictionMarket {
  market_id: string;
  title: string;
  status: string;
  category: string;
  volume_usd: number;
}

// ── Alerts ───────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  name: string;
  type: string;
  is_enabled: boolean;
  channels: string[];
  description: string;
}

// ── Search ───────────────────────────────────────────────────────────

export interface SearchResult {
  type: string;
  address?: string;
  symbol?: string;
  name?: string;
  chain?: string;
}

// ── Supported Chains ─────────────────────────────────────────────────

export const SUPPORTED_CHAINS = [
  'ethereum', 'solana', 'base', 'bnb', 'arbitrum', 'polygon', 'optimism',
  'avalanche', 'linea', 'scroll', 'mantle', 'ronin', 'sei', 'plasma',
  'sonic', 'monad', 'hyperevm', 'iotaevm',
] as const;

export type SupportedChain = typeof SUPPORTED_CHAINS[number];
