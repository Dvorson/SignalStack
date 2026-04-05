import { tool } from 'ai';
import { z } from 'zod';
import { getWalletTransactions } from '@/lib/nansen/client';

export const walletTransactions = tool({
  description: 'Transaction history for a wallet address.',
  inputSchema: z.object({
    address: z.string(),
    chain: z.string().default('ethereum'),
    days: z.number().default(30),
    limit: z.number().default(30),
  }),
  execute: async (inputs) => {
    const transactions = await getWalletTransactions(inputs);
    return {
      address: inputs.address,
      chain: inputs.chain,
      transactions,
      timestamp: new Date().toISOString(),
    };
  },
});
