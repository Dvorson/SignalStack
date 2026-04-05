import { tool } from 'ai';
import { z } from 'zod';
import {
  getWalletPnlSummary,
  getWalletBalance,
  getWalletCounterparties,
} from '@/lib/nansen/client';

export const walletCompare = tool({
  description:
    'Compare two wallets side by side: balances, PnL, and shared counterparties.',
  inputSchema: z.object({
    addressA: z.string(),
    addressB: z.string(),
    chain: z.string().default('ethereum'),
    days: z.number().default(30),
  }),
  execute: async (inputs) => {
    const [balanceA, pnlA, counterpartiesA, balanceB, pnlB, counterpartiesB] =
      await Promise.all([
        getWalletBalance({ address: inputs.addressA, chain: inputs.chain }),
        getWalletPnlSummary({ address: inputs.addressA, chain: inputs.chain, days: inputs.days }),
        getWalletCounterparties({ address: inputs.addressA, chain: inputs.chain, days: inputs.days }),
        getWalletBalance({ address: inputs.addressB, chain: inputs.chain }),
        getWalletPnlSummary({ address: inputs.addressB, chain: inputs.chain, days: inputs.days }),
        getWalletCounterparties({ address: inputs.addressB, chain: inputs.chain, days: inputs.days }),
      ]);

    const counterpartySetA = new Set(
      (counterpartiesA as Array<{ address: string }>).map((c) => c.address),
    );
    const shared_counterparties = (counterpartiesB as Array<{ address: string }>).filter((c) =>
      counterpartySetA.has(c.address),
    );

    return {
      addressA: inputs.addressA,
      addressB: inputs.addressB,
      chain: inputs.chain,
      walletA: { balance: balanceA, pnl: pnlA },
      walletB: { balance: balanceB, pnl: pnlB },
      shared_counterparties,
      timestamp: new Date().toISOString(),
    };
  },
});
