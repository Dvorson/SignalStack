import { tool } from 'ai';
import { z } from 'zod';
import { getTokenInfo, getTokenIndicators } from '@/lib/nansen/client';

export const tokenInfo = tool({
  description:
    'Get detailed token info including Nansen Score, risk indicators, market cap, volume.',
  inputSchema: z.object({
    tokenAddress: z.string(),
    chain: z.string().default('solana'),
  }),
  execute: async (inputs) => {
    const [token_info, indicators] = await Promise.all([
      getTokenInfo({ tokenAddress: inputs.tokenAddress, chain: inputs.chain }),
      getTokenIndicators({ tokenAddress: inputs.tokenAddress, chain: inputs.chain }),
    ]);
    return {
      token_info,
      indicators,
      chain: inputs.chain,
      timestamp: new Date().toISOString(),
    };
  },
});
