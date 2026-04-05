import { tool } from 'ai';
import { z } from 'zod';
import { getTokenDexTrades } from '@/lib/nansen/client';

export const tokenTrading = tool({
  description:
    'Recent DEX trading activity for a specific token. Shows individual trades with timestamps and volumes.',
  inputSchema: z.object({
    tokenAddress: z.string(),
    chain: z.string().default('solana'),
    days: z.number().default(7),
    limit: z.number().default(30),
  }),
  execute: async (inputs) => {
    const trades = await getTokenDexTrades(inputs);
    return {
      token_address: inputs.tokenAddress,
      trades,
      chain: inputs.chain,
      timestamp: new Date().toISOString(),
    };
  },
});
