export interface WalletScore {
  address: string;
  chain: string;
  label: string;
  pnl_90d_pct: number;
  win_rate: number;
  avg_hold_hours: number;
  consistency: number;
  composite_score: number;
  top_holdings: string[];
  bought_volume_usd: number;
  sold_volume_usd: number;
}

export interface ClusterSignal {
  token: string;
  token_address: string;
  chain: string;
  wallets: WalletScore[];
  avg_score: number;
  signal_strength: number;
  first_buy_at: string;
  window_hours: number;
  conviction: 'low' | 'medium' | 'high';
  net_flow_7d_usd: number;
  market_cap_usd: number;
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
