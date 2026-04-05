import { tool } from 'ai';
import { z } from 'zod';
import { getTradeQuote } from '@/lib/nansen/client';

export const executeTrade = tool({
  description: 'Get a DEX swap quote on Solana or EVM chains. Shows quote details for user confirmation before execution. Max $50 per trade. Specify what token to buy and what to sell (defaults to USDC).',
  inputSchema: z.object({
    buyToken: z.string().describe('Token symbol or address to BUY (e.g., SOL, ETH, BONK)'),
    sellToken: z.string().default('USDC').describe('Token symbol or address to SELL (e.g., USDC, SOL). Defaults to USDC.'),
    amountUsd: z.number().describe('Amount in USD to spend'),
    chain: z.string().default('solana').describe('Chain to trade on'),
  }),
  execute: async ({ buyToken, sellToken, amountUsd, chain }) => {
    if (amountUsd > 50) {
      return { error: 'Maximum trade size is $50 for safety. Please use a smaller amount.', requested_amount: amountUsd };
    }

    if (buyToken.toUpperCase() === sellToken.toUpperCase()) {
      return { error: `Cannot swap ${buyToken} for ${sellToken} — they are the same token.` };
    }

    const quote = await getTradeQuote({
      from: sellToken,
      to: buyToken,
      amountUsd,
      chain,
    });

    return {
      ...quote,
      token: buyToken,
      sell_token: sellToken,
      message: quote.status === 'quote_only'
        ? `Quote ready: Swap ~$${amountUsd} ${sellToken} → ${buyToken} on ${chain}. Review the details above.`
        : quote.status === 'failed'
          ? `Trade quote failed. ${quote.error || 'The trading API may not support this pair or chain.'}`
          : `Trade submitted. TX: ${quote.tx_hash}`,
    };
  },
});
