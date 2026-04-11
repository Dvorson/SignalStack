import { createChat, listChats } from '@/lib/db';
import { publishEvent } from '@/lib/realtime/events';
import { randomUUID } from 'crypto';

export async function GET() {
  const chats = listChats();
  return Response.json({ chats });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = (body as { id?: string }).id || randomUUID();
  const title = (body as { title?: string }).title || 'New chat';
  const chat = createChat(id, title);
  publishEvent('chats', { type: 'chat-created', chatId: chat.id, timestamp: new Date().toISOString() });
  return Response.json({ chat });
}
