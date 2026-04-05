import { tool } from 'ai';
import { z } from 'zod';
import { getPerpScreener } from '@/lib/nansen/client';

export const perpScreener = tool({
  description:
    'Screen Hyperliquid perpetual futures contracts by volume and open interest.',
  inputSchema: z.object({
    days: z.number().default(7),
    limit: z.number().default(30),
  }),
  execute: async (inputs) => {
    const contracts = await getPerpScreener(inputs);
    return {
      contracts,
      total: contracts.length,
      timestamp: new Date().toISOString(),
    };
  },
});
