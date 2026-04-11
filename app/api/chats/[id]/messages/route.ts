import { saveMessage, getChat, createChat } from '@/lib/db';
import { publishEvent } from '@/lib/realtime/events';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;
  const body = await request.json();
  const messages = (body as { messages: Array<{ id: string; role: string; parts: unknown[] }> }).messages;

  // Ensure chat exists
  if (!getChat(chatId)) {
    createChat(chatId);
  }

  for (const msg of messages) {
    saveMessage(msg.id, chatId, msg.role, msg.parts);
  }

  publishEvent('chats', {
    type: 'chat-messages-saved',
    chatId,
    saved: messages.length,
    timestamp: new Date().toISOString(),
  });

  return Response.json({ success: true, saved: messages.length });
}
