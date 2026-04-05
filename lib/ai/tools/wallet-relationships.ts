import { tool } from 'ai';
import { z } from 'zod';
import { getWalletRelated } from '@/lib/nansen/client';

export const walletRelationships = tool({
  description:
    'Find wallets related to an address. Reveals wallet clusters, fund structures, and sybil connections.',
  inputSchema: z.object({
    address: z.string(),
    chain: z.string().default('ethereum'),
  }),
  execute: async (inputs) => {
    const related_wallets = await getWalletRelated(inputs);
    return {
      address: inputs.address,
      chain: inputs.chain,
      related_wallets,
      timestamp: new Date().toISOString(),
    };
  },
});
