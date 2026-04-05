import { tool } from 'ai';
import { z } from 'zod';
import { getTokenHolders } from '@/lib/nansen/client';

export const tokenHolders = tool({
  description:
    'Token holder distribution: top holders, concentration, smart money share.',
  inputSchema: z.object({
    tokenAddress: z.string(),
    chain: z.string().default('solana'),
    limit: z.number().default(30),
  }),
  execute: async (inputs) => {
    const holders = await getTokenHolders(inputs);
    return {
      token_address: inputs.tokenAddress,
      holders,
      chain: inputs.chain,
      total: holders.length,
      timestamp: new Date().toISOString(),
    };
  },
});
