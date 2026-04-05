'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function Sidebar() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const currentChatId = pathname?.startsWith('/chat/') ? pathname.split('/')[2] : null;

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      setChats(data.chats || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadChats();
    // Refresh chat list every 5 seconds while on a chat page
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [loadChats]);

  const createNewChat = async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      router.push(`/chat/${data.chat.id}`);
    } catch {}
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c.id !== id));
      if (currentChatId === id) {
        router.push('/');
      }
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-30 size-8 flex items-center justify-center rounded-lg bg-surface border border-border/50 hover:bg-surface-elevated transition-colors text-muted-foreground hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isOpen ? (
            <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
          ) : (
            <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
          )}
        </svg>
      </button>

      {/* Sidebar panel */}
      <div className={`fixed top-0 left-0 h-dvh z-20 transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="w-64 h-full bg-background border-r border-border/50 flex flex-col pt-14">
          {/* New Chat button */}
          <div className="px-3 pb-3">
            <button
              onClick={createNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-data/30 bg-data/5 text-data text-sm font-mono hover:bg-data/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto px-2">
            {chats.length === 0 && (
              <div className="text-xs text-muted-foreground/50 text-center py-8 font-mono">No conversations yet</div>
            )}
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer mb-0.5 text-sm font-mono transition-colors ${
                  currentChatId === chat.id
                    ? 'bg-data/10 text-data border border-data/20'
                    : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground border border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs">{chat.title}</div>
                  <div className="text-[10px] text-muted-foreground/50">{formatDate(chat.updated_at)}</div>
                </div>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-loss transition-opacity shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/30 text-[10px] text-muted-foreground/40 font-mono">
            SignalStack • {chats.length} conversations
          </div>
        </div>
      </div>
    </>
  );
}
