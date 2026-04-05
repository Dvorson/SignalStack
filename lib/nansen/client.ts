import type { NetflowToken, WhoBoughtSoldEntry, WalletScore, ClusterSignal, TradeConfirmation } from './types';
import { mockNetflowTokens, mockWhoBoughtSold, mockWalletScores, mockClusterSignals, mockTradeQuote } from './mock-data';

const DEMO_MODE = process.env.DEMO_MODE !== 'false';

async function randomDelay() {
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
}

export async function getSmartMoneyNetflow(params: { chain?: string } = {}): Promise<NetflowToken[]> {
  if (DEMO_MODE) {
    await randomDelay();
    return mockNetflowTokens.filter(t => !params.chain || t.chain === params.chain);
  }
  const { default: NansenAPI } = await import('nansen-cli/src/api.js');
  const api = new NansenAPI(process.env.NANSEN_API_KEY);
  const result = await api.smartMoneyNetflow({ chains: [params.chain || 'solana'] });
  return result.data?.data || [];
}

export async function getWhoBoughtSold(params: { tokenAddress: string; chain?: string }): Promise<WhoBoughtSoldEntry[]> {
  if (DEMO_MODE) {
    await randomDelay();
    return mockWhoBoughtSold.get(params.tokenAddress) || [];
  }
  const { default: NansenAPI } = await import('nansen-cli/src/api.js');
  const api = new NansenAPI(process.env.NANSEN_API_KEY);
  const result = await api.tokenWhoBoughtSold({ tokenAddress: params.tokenAddress, chain: params.chain || 'solana' });
  return result.data?.data || [];
}

export async function getCachedWalletScore(address: string): Promise<WalletScore | null> {
  if (DEMO_MODE) {
    return mockWalletScores.get(address) || null;
  }
  return null;
}

export async function getClusterSignals(): Promise<ClusterSignal[]> {
  if (DEMO_MODE) {
    await randomDelay();
    return mockClusterSignals;
  }
  return [];
}

export async function getTradeQuote(params: { tokenAddress: string; amountUsd: number }): Promise<TradeConfirmation> {
  if (DEMO_MODE) {
    await randomDelay();
    return { ...mockTradeQuote, amount_usd: params.amountUsd, token_address: params.tokenAddress };
  }
  return { ...mockTradeQuote, amount_usd: params.amountUsd, status: 'quote_only' };
}
