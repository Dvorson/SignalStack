import { tool } from 'ai';
import { z } from 'zod';
import { getClusterSignals } from '@/lib/nansen/client';

export const detectClusters = tool({
  description: 'Detect cluster convergence signals where multiple smart money wallets are buying the same token. Returns tokens with the strongest consensus.',
  parameters: z.object({
    chain: z.string().default('solana').describe('Blockchain to scan'),
    minWallets: z.number().default(3).describe('Minimum wallets for a cluster'),
  }),
  execute: async ({ chain, minWallets }) => {
    const signals = await getClusterSignals();
    const filtered = signals
      .filter(s => s.chain === chain && s.wallets.length >= minWallets)
      .sort((a, b) => b.signal_strength - a.signal_strength);
    return { signals: filtered, chain, total_signals: filtered.length, timestamp: new Date().toISOString() };
  },
});
