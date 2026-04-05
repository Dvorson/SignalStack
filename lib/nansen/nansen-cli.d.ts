declare module 'nansen-cli/src/api.js' {
  class NansenAPI {
    constructor(apiKey?: string, baseUrl?: string, options?: Record<string, unknown>);
    smartMoneyNetflow(params: { chains: string[]; limit?: number; [key: string]: unknown }): Promise<{ data?: unknown; pagination?: unknown }>;
    smartMoneyDexTrades(params: { chains: string[]; limit?: number; [key: string]: unknown }): Promise<{ data?: unknown; pagination?: unknown }>;
    smartMoneyHoldings(params: { chains: string[]; limit?: number; [key: string]: unknown }): Promise<{ data?: unknown; pagination?: unknown }>;
    tokenWhoBoughtSold(params: { tokenAddress: string; chain?: string; limit?: number; buyOrSell?: string; [key: string]: unknown }): Promise<{ data?: unknown; pagination?: unknown }>;
    tokenInformation(params: { tokenAddress: string; chain?: string }): Promise<{ data?: Record<string, unknown> }>;
    tokenIndicators(params: { tokenAddress: string; chain?: string }): Promise<{ data?: Record<string, unknown> }>;
    addressPnlSummary(params: { address: string; chain?: string; days?: number }): Promise<{ data?: Record<string, unknown> }>;
    addressPnl(params: { address: string; chain?: string; days?: number }): Promise<{ data?: { data?: unknown[] } }>;
    addressBalance(params: { address: string; chain?: string }): Promise<{ data?: { data?: unknown[] } }>;
    addressLabels(params: { address: string; chain?: string }): Promise<{ data?: { data?: unknown[] } }>;
    getAccount(): Promise<{ data?: { plan?: string; credits_remaining?: number } }>;
  }
  export default NansenAPI;
}

declare module 'nansen-cli/src/trading.js' {
  export function getQuote(params: {
    chain: string;
    from: string;
    to: string;
    amount: string;
    wallet?: string;
  }): Promise<{
    quotes?: Array<{
      transaction: string;
      routes: unknown[];
      fees: number;
      outputAmount: string;
    }>;
  }>;
  export function executeTransaction(params: {
    chain: string;
    signedTransaction: string;
  }): Promise<{
    txHash: string;
    status: string;
  }>;
}
