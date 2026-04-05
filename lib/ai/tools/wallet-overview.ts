import { tool } from 'ai';
import { z } from 'zod';
import {
  getWalletBalance,
  getWalletPnlSummary,
  getWalletLabels,
  getWalletCounterparties,
} from '@/lib/nansen/client';

export const walletOverview = tool({
  description:
    "Comprehensive wallet profile: balance, PnL, labels, and top counterparties. Use for 'analyze this wallet' or 'what does this address hold'.",
  inputSchema: z.object({
    address: z.string(),
    chain: z.string().default('ethereum'),
    days: z.number().default(30),
  }),
  execute: async (inputs) => {
    const [balance, pnl_summary, labels, counterparties] = await Promise.all([
      getWalletBalance({ address: inputs.address, chain: inputs.chain }),
      getWalletPnlSummary({ address: inputs.address, chain: inputs.chain, days: inputs.days }),
      getWalletLabels({ address: inputs.address, chain: inputs.chain }),
      getWalletCounterparties({ address: inputs.address, chain: inputs.chain, days: inputs.days }),
    ]);
    return {
      address: inputs.address,
      chain: inputs.chain,
      balance,
      pnl_summary,
      labels,
      counterparties,
      timestamp: new Date().toISOString(),
    };
  },
});
