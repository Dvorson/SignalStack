declare module 'nansen-cli/src/api.js' {
  class NansenAPI {
    constructor(apiKey?: string, baseUrl?: string, options?: Record<string, unknown>);
    smartMoneyNetflow(params: { chains: string[] }): Promise<{ data?: { data?: unknown[] } }>;
    tokenWhoBoughtSold(params: { tokenAddress: string; chain?: string }): Promise<{ data?: { data?: unknown[] } }>;
    addressPnlSummary(params: { address: string; chain?: string }): Promise<{ data?: Record<string, unknown> }>;
    tokenInformation(params: { tokenAddress: string; chain?: string }): Promise<{ data?: Record<string, unknown> }>;
  }
  export default NansenAPI;
}
