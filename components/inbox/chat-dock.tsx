'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InboxOpportunity } from '@/lib/inbox/types';
import { ActionButton, Panel, SectionLabel } from '@/components/inbox/ui';

function buildPrompts(opportunity: InboxOpportunity | null) {
  if (!opportunity) {
    return [
      'Find me the best Solana trades right now.',
      'What are smart money wallets buying on Solana?',
      'Show me the strongest smart money cluster signals today.',
    ];
  }

  return [
    `Why is smart money buying ${opportunity.tokenSymbol}?`,
    `Show recent DEX trades for ${opportunity.tokenSymbol} on Solana.`,
    `What are the top holders and risks for ${opportunity.tokenSymbol}?`,
  ];
}

export function ChatDock({ opportunity }: { opportunity: InboxOpportunity | null }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const prompts = buildPrompts(opportunity);

  const openChat = async (prompt: string) => {
    if (creating) return;
    setCreating(true);

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: opportunity ? `${opportunity.tokenSymbol} research` : 'Inbox research',
        }),
      });
      const data = await res.json();
      router.push(`/chat/${data.chat.id}?prompt=${encodeURIComponent(prompt)}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Panel className="p-4">
      <SectionLabel
        eyebrow="Research Chat"
        title={opportunity ? `Keep ${opportunity.tokenSymbol} close without leaving the inbox` : 'Open chat when you need depth'}
        detail="The dock stays secondary. Use it when the ranked view raises a real question."
      />

      <div className="mt-4 space-y-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => openChat(prompt)}
            className="w-full rounded-xl border border-border/40 bg-background px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated"
            disabled={creating}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton onClick={() => openChat(opportunity ? `Give me the strongest bull and bear case for ${opportunity.tokenSymbol}.` : 'Help me inspect the strongest signals in the inbox.')} disabled={creating}>
          {creating ? 'Opening chat...' : 'Open full chat'}
        </ActionButton>
      </div>
    </Panel>
  );
}
