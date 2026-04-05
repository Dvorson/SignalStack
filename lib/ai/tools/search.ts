import { tool } from 'ai';
import { z } from 'zod';
import { searchNansen as searchNansenFn, searchEntities } from '@/lib/nansen/client';

export const searchNansen = tool({
  description:
    'Search across all Nansen data: tokens, wallets, entities. Use when you need to find a token address or identify an entity.',
  inputSchema: z.object({
    query: z.string(),
    type: z.enum(['token', 'address', 'entity', 'any']).default('any'),
    limit: z.number().default(20),
  }),
  execute: async (inputs) => {
    const results =
      inputs.type === 'entity'
        ? await searchEntities({ query: inputs.query })
        : await searchNansenFn({ query: inputs.query, type: inputs.type, limit: inputs.limit });

    return {
      query: inputs.query,
      results,
      total: Array.isArray(results) ? results.length : 0,
      timestamp: new Date().toISOString(),
    };
  },
});
