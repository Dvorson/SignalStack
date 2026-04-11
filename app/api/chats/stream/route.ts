import { createSseResponse } from '@/lib/realtime/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return createSseResponse('chats');
}
