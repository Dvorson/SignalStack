import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyNetflow, getWhoBoughtSold, computeWalletScore } from '@/lib/nansen/client';
import type { WalletScore } from '@/lib/nansen/types';

export const scoreWallets = tool({
  description: 'Score and rank smart money wallets by trading performance. Returns a leaderboard with PnL, win rate, and composite scores.',
  inputSchema: z.object({
    chain: z.string().default('solana').describe('Blockchain to analyze'),
    limit: z.number().default(10).describe('Max wallets to return'),
  }),
  execute: async ({ chain, limit }) => {
    // Get top 3 tokens by smart money flow to conserve API credits
    const tokens = await getSmartMoneyNetflow({ chain });
    const topTokens = tokens.slice(0, 3);
    const walletMap = new Map<string, WalletScore>();

    for (const token of topTokens) {
      const buyers = await getWhoBoughtSold({ tokenAddress: token.token_address, chain });
      // Limit to top 5 buyers per token to conserve credits
      for (const buyer of buyers.slice(0, 5)) {
        if (!walletMap.has(buyer.address)) {
          // Score from volume data directly (avoids expensive profiler calls)
          const score = await computeWalletScore(buyer.address, chain, buyer);
          score.label = buyer.address_label || score.label;
          walletMap.set(buyer.address, score);
        }
      }
    }

    const ranked = Array.from(walletMap.values())
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, limit);

    return { wallets: ranked, chain, total_analyzed: walletMap.size, timestamp: new Date().toISOString() };
  },
});
