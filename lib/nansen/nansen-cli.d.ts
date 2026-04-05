type ApiResponse = Promise<{ data?: unknown; pagination?: unknown }>;
type ApiObjResponse = Promise<{ data?: Record<string, unknown> }>;

declare module 'nansen-cli/src/api.js' {
  class NansenAPI {
    constructor(apiKey?: string, baseUrl?: string, options?: Record<string, unknown>);

    // Account
    getAccount(): Promise<{ data?: { plan?: string; credits_remaining?: number } }>;

    // Smart Money
    smartMoneyNetflow(params: { chains: string[]; [k: string]: unknown }): ApiResponse;
    smartMoneyDexTrades(params: { chains: string[]; [k: string]: unknown }): ApiResponse;
    smartMoneyPerpTrades(params?: { [k: string]: unknown }): ApiResponse;
    smartMoneyDcas(params?: { [k: string]: unknown }): ApiResponse;
    smartMoneyHoldings(params: { chains: string[]; [k: string]: unknown }): ApiResponse;
    smartMoneyHistoricalHoldings(params: { chains: string[]; days?: number; [k: string]: unknown }): ApiResponse;

    // Profiler
    addressPnlSummary(params: { address: string; chain?: string; days?: number; [k: string]: unknown }): ApiObjResponse;
    addressPnl(params: { address: string; chain?: string; days?: number; [k: string]: unknown }): ApiResponse;
    addressBalance(params: { address: string; chain?: string; [k: string]: unknown }): ApiResponse;
    addressLabels(params: { address: string; chain?: string; [k: string]: unknown }): ApiResponse;
    addressTransactions(params: { address: string; chain?: string; days?: number; [k: string]: unknown }): ApiResponse;
    addressCounterparties(params: { address: string; chain?: string; days?: number; [k: string]: unknown }): ApiResponse;
    addressHistoricalBalances(params: { address: string; chain?: string; days?: number; [k: string]: unknown }): ApiResponse;
    addressRelatedWallets(params: { address: string; chain?: string; [k: string]: unknown }): ApiResponse;
    addressPerpPositions(params: { address: string; [k: string]: unknown }): ApiResponse;
    addressPerpTrades(params: { address: string; days?: number; [k: string]: unknown }): ApiResponse;
    entitySearch(params: { query: string; [k: string]: unknown }): ApiResponse;

    // Token (TGM)
    tokenScreener(params?: { chain?: string; timeframe?: string; [k: string]: unknown }): ApiResponse;
    tokenInformation(params: { tokenAddress: string; chain?: string; [k: string]: unknown }): ApiObjResponse;
    tokenIndicators(params: { tokenAddress: string; chain?: string; [k: string]: unknown }): ApiObjResponse;
    tokenFlows(params: { tokenAddress: string; chain?: string; days?: number; label?: string; [k: string]: unknown }): ApiResponse;
    tokenFlowIntelligence(params: { tokenAddress: string; chain?: string; timeframe?: string; [k: string]: unknown }): ApiResponse;
    tokenWhoBoughtSold(params: { tokenAddress: string; chain?: string; [k: string]: unknown }): ApiResponse;
    tokenDexTrades(params: { tokenAddress: string; chain?: string; days?: number; [k: string]: unknown }): ApiResponse;
    tokenTransfers(params: { tokenAddress: string; chain?: string; days?: number; [k: string]: unknown }): ApiResponse;
    tokenHolders(params: { tokenAddress: string; chain?: string; [k: string]: unknown }): ApiResponse;
    tokenPnlLeaderboard(params: { tokenAddress: string; chain?: string; days?: number; [k: string]: unknown }): ApiResponse;
    tokenOhlcv(params: { tokenAddress: string; chain?: string; timeframe?: string; [k: string]: unknown }): ApiResponse;
    tokenJupDca(params: { tokenAddress: string; [k: string]: unknown }): ApiResponse;
    tokenPerpPositions(params: { symbol: string; [k: string]: unknown }): ApiResponse;
    tokenPerpTrades(params: { symbol: string; days?: number; [k: string]: unknown }): ApiResponse;
    tokenPerpPnlLeaderboard(params: { symbol: string; days?: number; [k: string]: unknown }): ApiResponse;

    // Perps
    perpScreener(params?: { days?: number; [k: string]: unknown }): ApiResponse;
    perpLeaderboard(params?: { days?: number; [k: string]: unknown }): ApiResponse;

    // Prediction Markets
    pmMarketScreener(params?: { query?: string; [k: string]: unknown }): ApiResponse;
    pmEventScreener(params?: { query?: string; [k: string]: unknown }): ApiResponse;
    pmCategories(params?: { [k: string]: unknown }): ApiResponse;
    pmOhlcv(params: { marketId: string; [k: string]: unknown }): ApiResponse;
    pmOrderbook(params: { marketId: string; [k: string]: unknown }): ApiResponse;
    pmTopHolders(params: { marketId: string; [k: string]: unknown }): ApiResponse;
    pmTradesByMarket(params: { marketId: string; [k: string]: unknown }): ApiResponse;
    pmPnlByMarket(params: { marketId: string; [k: string]: unknown }): ApiResponse;
    pmPnlByAddress(params: { address: string; [k: string]: unknown }): ApiResponse;
    pmPositionDetail(params: { marketId: string; [k: string]: unknown }): ApiResponse;
    pmTradesByAddress(params: { address: string; [k: string]: unknown }): ApiResponse;

    // Alerts
    alertsList(params?: { [k: string]: unknown }): ApiResponse;
    alertsCreate(params: { name: string; type: string; [k: string]: unknown }): ApiObjResponse;
    alertsUpdate(params: { id: string; [k: string]: unknown }): ApiObjResponse;
    alertsToggle(params: { id: string; enabled?: boolean; disabled?: boolean; [k: string]: unknown }): ApiObjResponse;
    alertsDelete(params: { id: string; [k: string]: unknown }): ApiObjResponse;

    // Search
    generalSearch(params: { query: string; type?: string; limit?: number; [k: string]: unknown }): ApiResponse;
    webSearch(params: { query: string; numResults?: number; [k: string]: unknown }): ApiResponse;
    webFetch(params: { url: string; question: string; [k: string]: unknown }): ApiObjResponse;

    // Portfolio
    portfolioDefi(params: { wallet: string; [k: string]: unknown }): ApiResponse;

    // Points
    pointsLeaderboard(params?: { [k: string]: unknown }): ApiResponse;
  }
  export default NansenAPI;
}

declare module 'nansen-cli/src/trading.js' {
  export function getQuote(params: {
    chain: string;
    toChain?: string;
    from: string;
    to: string;
    amount: string;
    wallet?: string;
    toWallet?: string;
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

  export function getBridgeStatus(
    txHash: string,
    fromChain: string,
    toChain: string
  ): Promise<Record<string, unknown>>;
}
