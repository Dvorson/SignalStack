import { tool } from 'ai';
import { z } from 'zod';
import { getPredictionMarketDetail } from '@/lib/nansen/client';

export const predictionMarketDetail = tool({
  description:
    'Detailed prediction market data: OHLCV candles, orderbook depth, top holders, and PnL.',
  inputSchema: z.object({
    marketId: z.string(),
    include: z.array(z.string()).default(['ohlcv', 'orderbook', 'topHolders']),
  }),
  execute: async (inputs) => {
    return await getPredictionMarketDetail(inputs);
  },
});
