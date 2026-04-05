import { tool } from 'ai';
import { z } from 'zod';
import { getPredictionMarketScreener } from '@/lib/nansen/client';

export const predictionMarketScreener = tool({
  description:
    'Search prediction markets and events on Polymarket. Find markets by topic.',
  inputSchema: z.object({
    query: z.string().optional(),
    mode: z.enum(['market', 'event', 'categories']).default('market'),
  }),
  execute: async (inputs) => {
    const markets = await getPredictionMarketScreener(inputs);
    return {
      markets,
      total: markets.length,
      mode: inputs.mode,
      timestamp: new Date().toISOString(),
    };
  },
});
