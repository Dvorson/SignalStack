import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyNetflow, getWhoBoughtSold, computeWalletScore } from '@/lib/nansen/client';
import type { WalletScore } from '@/lib/nansen/types';

export const scoreWallets = tool({
  description: 'Score and rank smart money wallets by trading performance across the Solana ecosystem. Scans 20+ tokens and 100+ wallets using Nansen smart money data. Returns a ranked leaderboard.',
  inputSchema: z.object({
    chain: z.string().default('solana').describe('Blockchain to analyze'),
    limit: z.number().default(15).describe('Max wallets to return in leaderboard'),
  }),
  execute: async ({ chain, limit }) => {
    // Phase 1: Wide scan — get tokens and wallets, score from volume (fast, no profiler calls)
    const tokens = await getSmartMoneyNetflow({ chain, limit: 20 });
    const walletMap = new Map<string, WalletScore>();

    for (const token of tokens) {
      const buyers = await getWhoBoughtSold({ tokenAddress: token.token_address, chain, limit: 20 });
      for (const buyer of buyers) {
        if (walletMap.has(buyer.address)) {
          // Wallet seen on multiple tokens — aggregate volume
          const existing = walletMap.get(buyer.address)!;
          existing.bought_volume_usd += buyer.bought_volume_usd;
          existing.sold_volume_usd += buyer.sold_volume_usd;
        } else {
          // Fast score from volume data only (no profiler API call)
          const score = await computeWalletScore(buyer.address, chain, buyer, { skipProfiler: true });
          score.label = buyer.address_label || score.label;
          walletMap.set(buyer.address, score);
        }
      }
    }

    // Phase 2: Deep enrich — profiler calls on top 10 wallets by volume
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
      tokens_scanned: tokens.length,
      timestamp: new Date().toISOString(),
    };
  },
});
