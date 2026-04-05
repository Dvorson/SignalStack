import { tool } from 'ai';
import { z } from 'zod';
import { getSmartMoneyDexTrades } from '@/lib/nansen/client';

export const smartMoneyDexTrades = tool({
  description:
    'Get real-time DEX trades by smart money wallets. Shows what smart traders are buying/selling right now.',
  inputSchema: z.object({
    chain: z.string().default('solana'),
    limit: z.number().default(30),
  }),
  execute: async (inputs) => {
    const trades = await getSmartMoneyDexTrades(inputs);
    return { trades, chain: inputs.chain, timestamp: new Date().toISOString() };
  },
});
