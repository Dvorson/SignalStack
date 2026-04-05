import { tool } from 'ai';
import { z } from 'zod';
import {
  listAlerts,
  createAlert,
  updateAlert,
  toggleAlert,
  deleteAlert,
} from '@/lib/nansen/client';

export const manageAlerts = tool({
  description:
    'Manage Nansen alerts. List existing alerts, create new ones, update, enable/disable, or delete. For create/update/toggle/delete: confirm with the user first.',
  inputSchema: z.object({
    action: z.enum(['list', 'create', 'update', 'toggle', 'delete']),
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    chains: z.array(z.string()).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
  }),
  execute: async (inputs) => {
    let result: unknown;

    switch (inputs.action) {
      case 'list':
        result = await listAlerts();
        break;
      case 'create':
        result = await createAlert({
          name: inputs.name!,
          type: inputs.type!,
          chains: inputs.chains,
          description: inputs.description,
        });
        break;
      case 'update':
        result = await updateAlert({
          id: inputs.id!,
          name: inputs.name,
          type: inputs.type,
          chains: inputs.chains,
          description: inputs.description,
        });
        break;
      case 'toggle':
        result = await toggleAlert({ id: inputs.id!, enabled: inputs.enabled! });
        break;
      case 'delete':
        result = await deleteAlert({ id: inputs.id! });
        break;
    }

    return { action: inputs.action, result, timestamp: new Date().toISOString() };
  },
});
