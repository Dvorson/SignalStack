import { tool } from 'ai';
import { z } from 'zod';
import { getTokenFlows, getTokenFlowIntelligence } from '@/lib/nansen/client';

export const tokenFlows = tool({
  description:
    "Analyze token flows by holder segment (exchanges, whales, smart money, retail). Shows who's accumulating vs distributing.",
  inputSchema: z.object({
    tokenAddress: z.string(),
    chain: z.string().default('solana'),
    timeframe: z.string().default('24h'),
  }),
  execute: async (inputs) => {
    const [flows, flow_intelligence_segments] = await Promise.all([
      getTokenFlows({ tokenAddress: inputs.tokenAddress, chain: inputs.chain }),
      getTokenFlowIntelligence({ tokenAddress: inputs.tokenAddress, chain: inputs.chain, timeframe: inputs.timeframe }),
    ]);
    return {
      token_address: inputs.tokenAddress,
      flows,
      flow_intelligence_segments,
      chain: inputs.chain,
      timestamp: new Date().toISOString(),
    };
  },
});
