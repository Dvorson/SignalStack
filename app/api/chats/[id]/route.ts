import { getChat, getMessages, deleteChat, updateChatTitle } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chat = getChat(id);
  if (!chat) {
    return Response.json({ error: 'Chat not found' }, { status: 404 });
  }
  const messages = getMessages(id);
  return Response.json({
    chat,
    messages: messages.map(m => ({
      ...m,
      parts: JSON.parse(m.parts),
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  if ((body as { title?: string }).title) {
    updateChatTitle(id, (body as { title: string }).title);
  }
  return Response.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteChat(id);
  return Response.json({ success: true });
}
