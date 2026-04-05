import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyNetflow, getWhoBoughtSold, computeWalletScore } from '@/lib/nansen/client';

export const explainSignal = tool({
  description: 'Gather detailed context about why smart money is moving into a token. Returns wallet profiles, volume data, and token metrics.',
  inputSchema: z.object({
    tokenSymbol: z.string().describe('Token symbol'),
    tokenAddress: z.string().describe('Token contract address'),
    chain: z.string().default('solana'),
  }),
  execute: async ({ tokenSymbol, tokenAddress, chain }) => {
    const tokens = await getSmartMoneyNetflow({ chain });
    const tokenData = tokens.find(t => t.token_address === tokenAddress || t.token_symbol === tokenSymbol);
    const buyers = await getWhoBoughtSold({ tokenAddress, chain, limit: 20 });

    const profiles = [];
    for (const buyer of buyers.slice(0, 10)) {
      // Deep profiler for explain — this is the detailed view
      const score = await computeWalletScore(buyer.address, chain, buyer);
      profiles.push({
        address: buyer.address,
        label: buyer.address_label || score.label || '',
        score: score.composite_score,
        pnl_pct: score.pnl_90d_pct,
        win_rate: score.win_rate,
        bought_usd: buyer.bought_volume_usd,
        sold_usd: buyer.sold_volume_usd,
        net_position: buyer.bought_volume_usd - buyer.sold_volume_usd,
        top_holdings: score.top_holdings,
      });
    }

    return {
      token: {
        symbol: tokenSymbol, address: tokenAddress, chain,
        net_flow_7d_usd: tokenData?.net_flow_7d_usd || 0,
        net_flow_24h_usd: tokenData?.net_flow_24h_usd || 0,
        trader_count: tokenData?.trader_count || 0,
        market_cap_usd: tokenData?.market_cap_usd || 0,
        sectors: tokenData?.token_sectors || [],
        age_days: tokenData?.token_age_days || 0,
      },
      wallet_profiles: profiles.sort((a, b) => b.score - a.score),
      summary: {
        total_buy_volume: profiles.reduce((s, w) => s + w.bought_usd, 0),
        total_sell_volume: profiles.reduce((s, w) => s + w.sold_usd, 0),
        avg_wallet_score: profiles.length > 0 ? profiles.reduce((s, w) => s + w.score, 0) / profiles.length : 0,
        wallets_still_holding: profiles.filter(w => w.net_position > 0).length,
      },
      timestamp: new Date().toISOString(),
    };
  },
});
