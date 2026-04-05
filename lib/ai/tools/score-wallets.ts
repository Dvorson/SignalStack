import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyNetflow, getWhoBoughtSold, computeWalletScore } from '@/lib/nansen/client';
import type { WalletScore } from '@/lib/nansen/types';

export const scoreWallets = tool({
  description: 'Score and rank smart money wallets across ALL tokens on Solana. Fetches the complete smart money netflow (all tokens Nansen tracks), then drills into the top tokens by flow to identify and score individual wallets.',
  inputSchema: z.object({
    chain: z.string().default('solana').describe('Blockchain to analyze'),
    limit: z.number().default(20).describe('Max wallets to return in leaderboard'),
  }),
  execute: async ({ chain, limit }) => {
    // Get ALL tokens with smart money activity (one API call, ~187 tokens on Solana)
    const allTokens = await getSmartMoneyNetflow({ chain, limit: 200 });

    // Sort by absolute netflow to find the most actively traded
    const byFlow = [...allTokens].sort((a, b) =>
      Math.abs(b.net_flow_7d_usd) - Math.abs(a.net_flow_7d_usd)
    );

    // Drill into top 10 tokens by flow to get wallet addresses
    const walletMap = new Map<string, WalletScore>();
    const tokensWithWallets = Math.min(10, byFlow.length);

    for (const token of byFlow.slice(0, tokensWithWallets)) {
      const buyers = await getWhoBoughtSold({ tokenAddress: token.token_address, chain, limit: 30 });
      for (const buyer of buyers) {
        if (walletMap.has(buyer.address)) {
          // Seen on multiple tokens — aggregate volume
          const existing = walletMap.get(buyer.address)!;
          existing.bought_volume_usd += buyer.bought_volume_usd;
          existing.sold_volume_usd += buyer.sold_volume_usd;
        } else {
          // Volume-based scoring (fast, no profiler call)
          const score = await computeWalletScore(buyer.address, chain, buyer, { skipProfiler: true });
          score.label = buyer.address_label || score.label;
          walletMap.set(buyer.address, score);
        }
      }
    }

    // Deep enrich top 10 wallets by volume with profiler data
    const byVolume = Array.from(walletMap.values())
      .sort((a, b) => b.bought_volume_usd - a.bought_volume_usd);

    for (const wallet of byVolume.slice(0, 10)) {
      const enriched = await computeWalletScore(wallet.address, chain, undefined, { skipProfiler: false });
      if (enriched.pnl_90d_pct !== 0 || enriched.win_rate !== 0) {
        enriched.label = wallet.label;
        enriched.bought_volume_usd = wallet.bought_volume_usd;
        enriched.sold_volume_usd = wallet.sold_volume_usd;
        walletMap.set(wallet.address, enriched);
      }
    }

    const ranked = Array.from(walletMap.values())
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, limit);

    return {
      wallets: ranked,
      chain,
      total_analyzed: walletMap.size,
      tokens_scanned: allTokens.length,
      tokens_drilled: tokensWithWallets,
      timestamp: new Date().toISOString(),
    };
  },
});
