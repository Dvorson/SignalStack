import { tool } from 'ai';
import { z } from 'zod';
import { getTokenScreener } from '@/lib/nansen/client';

export const tokenScreener = tool({
  description:
    'Discover and filter tokens by volume, market cap, and price change. Screen across any chain.',
  inputSchema: z.object({
    chain: z.string().default('solana'),
    timeframe: z.string().default('24h'),
    limit: z.number().default(50),
  }),
  execute: async (inputs) => {
    const tokens = await getTokenScreener(inputs);
    return {
      tokens,
      chain: inputs.chain,
      timeframe: inputs.timeframe,
      total: tokens.length,
      timestamp: new Date().toISOString(),
    };
  },
});
