import { tool } from 'ai';
import { z } from 'zod';
import { getClusterSignals, getSmartMoneyNetflow } from '@/lib/nansen/client';

export const detectClusters = tool({
  description: 'Scan ALL tokens on Solana for smart money cluster convergence. Returns every token where multiple smart money wallets are accumulating, sorted by signal strength. One API call covers the entire chain.',
  inputSchema: z.object({
    chain: z.string().default('solana').describe('Blockchain to scan'),
    minWallets: z.number().default(3).describe('Minimum smart money wallets for a cluster signal'),
  }),
  execute: async ({ chain, minWallets }) => {
    const signals = await getClusterSignals({ chain, minWallets });

    return {
      signals,
      chain,
      total_signals: signals.length,
      high_conviction: signals.filter(s => s.conviction === 'high').length,
      medium_conviction: signals.filter(s => s.conviction === 'medium').length,
      low_conviction: signals.filter(s => s.conviction === 'low').length,
      timestamp: new Date().toISOString(),
    };
  },
});
