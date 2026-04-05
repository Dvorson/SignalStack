import { tool } from 'ai';
import { z } from 'zod';
import { getBridgeStatus } from '@/lib/nansen/client';

export const bridgeStatus = tool({
  description: 'Check the status of a cross-chain bridge transaction.',
  inputSchema: z.object({
    txHash: z.string(),
    fromChain: z.string(),
    toChain: z.string(),
  }),
  execute: async (inputs) => {
    const result = await getBridgeStatus(inputs);
    return {
      tx_hash: inputs.txHash,
      status: result,
      timestamp: new Date().toISOString(),
    };
  },
});
