import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyHoldings } from '@/lib/nansen/client';

export const smartMoneyHoldings = tool({
  description:
    'Get current aggregate token holdings of all smart money wallets on a chain.',
  inputSchema: z.object({
    chain: z.string().default('solana'),
    limit: z.number().default(50),
  }),
  execute: async (inputs) => {
    const holdings = await getSmartMoneyHoldings(inputs);
    return {
      holdings,
      chain: inputs.chain,
      total: holdings.length,
      timestamp: new Date().toISOString(),
    };
  },
});
