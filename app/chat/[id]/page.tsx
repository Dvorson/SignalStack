'use client';

import { useParams } from 'next/navigation';
import { ChatView } from '@/components/chat/chat-view';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;

  return <ChatView chatId={chatId} />;
}
