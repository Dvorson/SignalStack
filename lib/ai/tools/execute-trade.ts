import { tool } from 'ai';
import { z } from 'zod';
import { getTradeQuote } from '@/lib/nansen/client';

export const executeTrade = tool({
  description: 'Get a swap quote on Solana. Shows quote for user confirmation. Max $50.',
  parameters: z.object({
    tokenSymbol: z.string().describe('Token to buy'),
    tokenAddress: z.string().describe('Token contract address'),
    amountUsd: z.number().describe('Amount in USD'),
    chain: z.string().default('solana'),
  }),
  execute: async ({ tokenSymbol, tokenAddress, amountUsd, chain }) => {
    if (amountUsd > 50) {
      return { error: 'Maximum trade size is $50. Please use a smaller amount.', requested_amount: amountUsd };
    }
    const quote = await getTradeQuote({ tokenAddress, amountUsd });
    return {
      ...quote, token: tokenSymbol,
      message: quote.status === 'quote_only'
        ? `Quote: Buy ${tokenSymbol} for $${amountUsd} on ${chain}. Slippage: ${quote.slippage_pct}%.`
        : `Executed: Bought ${tokenSymbol} for $${amountUsd}. TX: ${quote.tx_hash}`,
    };
  },
});
