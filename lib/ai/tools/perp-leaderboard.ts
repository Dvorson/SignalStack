import { tool } from 'ai';
import { z } from 'zod';
import { getPerpLeaderboard } from '@/lib/nansen/client';

export const perpLeaderboard = tool({
  description:
    'Top perpetual futures traders ranked by PnL on Hyperliquid.',
  inputSchema: z.object({
    days: z.number().default(7),
    limit: z.number().default(20),
  }),
  execute: async (inputs) => {
    const traders = await getPerpLeaderboard(inputs);
    return {
      traders,
      total: traders.length,
      timestamp: new Date().toISOString(),
    };
  },
});
