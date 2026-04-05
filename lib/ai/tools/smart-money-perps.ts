import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyPerpTrades } from '@/lib/nansen/client';

export const smartMoneyPerps = tool({
  description:
    'Get perpetual futures trades by smart money on Hyperliquid. Shows longs, shorts, leverage.',
  inputSchema: z.object({
    limit: z.number().default(30),
  }),
  execute: async (inputs) => {
    const trades = await getSmartMoneyPerpTrades(inputs);
    return { trades, timestamp: new Date().toISOString() };
  },
});
