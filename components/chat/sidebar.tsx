'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const RULE_CHIPS = [
  'Solana only',
  'Manual refresh',
  'Max $20 quote',
];

export function Sidebar() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const currentChatId = pathname?.startsWith('/chat/') ? pathname.split('/')[2] : null;
  const inboxActive = pathname === '/';

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' });
      const data = await res.json();
      setChats(data.chats || []);
    } catch {
      // Sidebar should fail quietly, the inbox still works without this list.
    }
  }, []);

  useEffect(() => {
    loadChats();

    const source = new EventSource('/api/chats/stream');
    source.onmessage = () => {
      loadChats();
    };

    return () => {
      source.close();
    };
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
    } catch {
      // Ignore, the button can be retried.
    }
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      setChats((prev) => prev.filter((chat) => chat.id !== id));
      if (currentChatId === id) {
        router.push('/');
      }
    } catch {
      // Ignore, the item stays visible if deletion fails.
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}Z`);
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
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="fixed top-3 left-3 z-30 flex size-8 items-center justify-center rounded-lg border border-border/50 bg-surface text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18" />
          <path d="M3 6h18" />
          <path d="M3 18h18" />
        </svg>
      </button>

      {isOpen ? (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-10 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed top-0 left-0 z-20 h-dvh w-72 shrink-0 border-r border-border/50 bg-background transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0`}
      >
        <div className="flex h-full flex-col pt-14 lg:pt-4">
          <div className="px-3 pb-3 space-y-2">
            <button
              onClick={() => router.push('/')}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                inboxActive
                  ? 'border-data/30 bg-data/10 text-data'
                  : 'border-border/50 bg-surface text-foreground hover:bg-surface-elevated'
              }`}
            >
              <div className="flex items-center justify-between text-sm font-mono">
                <span>Trade Inbox</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Ranked opportunities, explicit guardrails, quote-ready detail.
              </div>
            </button>

            <button
              onClick={createNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-surface text-foreground text-sm font-mono hover:bg-surface-elevated transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New Chat
            </button>
          </div>

          <div className="px-3 pb-3">
            <div className="rounded-xl border border-border/50 bg-surface p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Rules</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RULE_CHIPS.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-border/50 px-2 py-1 text-[10px] font-mono text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="px-3 pb-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              <span>Research Chat</span>
              <span>{chats.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {chats.length === 0 && (
              <div className="text-xs text-muted-foreground/50 text-center py-8 font-mono">No conversations yet</div>
            )}
            {chats.map((chat) => (
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
                  onClick={(event) => deleteChat(chat.id, event)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-loss transition-opacity shrink-0"
                  aria-label={`Delete ${chat.title}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-border/30 text-[10px] text-muted-foreground/40 font-mono">
            SignalStack • {chats.length} chats • inbox first
          </div>
        </div>
      </aside>
    </>
  );
}
