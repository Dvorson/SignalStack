import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyNetflow, getWhoBoughtSold, getCachedWalletScore } from '@/lib/nansen/client';
import type { WalletScore } from '@/lib/nansen/types';

export const scoreWallets = tool({
  description: 'Score and rank smart money wallets by trading performance. Returns a leaderboard with PnL, win rate, and composite scores.',
  inputSchema: z.object({
    chain: z.string().default('solana').describe('Blockchain to analyze'),
    limit: z.number().default(10).describe('Max wallets to return'),
  }),
  execute: async ({ chain, limit }) => {
    const tokens = await getSmartMoneyNetflow({ chain });
    const topTokens = tokens.slice(0, 5);
    const walletMap = new Map<string, WalletScore>();

    for (const token of topTokens) {
      const buyers = await getWhoBoughtSold({ tokenAddress: token.token_address, chain });
      for (const buyer of buyers) {
        if (!walletMap.has(buyer.address)) {
          const cached = await getCachedWalletScore(buyer.address);
          if (cached) {
            walletMap.set(buyer.address, cached);
          } else {
            const volumeRatio = buyer.sold_volume_usd > 0
              ? (buyer.sold_volume_usd - buyer.bought_volume_usd) / buyer.bought_volume_usd
              : 0;
            walletMap.set(buyer.address, {
              address: buyer.address, chain, label: buyer.address_label || 'Unknown',
              pnl_90d_pct: volumeRatio * 100, win_rate: volumeRatio > 0 ? 0.6 : 0.4,
              avg_hold_hours: 48, consistency: 0.5,
              composite_score: Math.max(0, Math.min(100, 50 + volumeRatio * 50)),
              top_holdings: [token.token_symbol],
              bought_volume_usd: buyer.bought_volume_usd, sold_volume_usd: buyer.sold_volume_usd,
            });
          }
        }
      }
    }

    const ranked = Array.from(walletMap.values())
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, limit);

    return { wallets: ranked, chain, total_analyzed: walletMap.size, timestamp: new Date().toISOString() };
  },
});
