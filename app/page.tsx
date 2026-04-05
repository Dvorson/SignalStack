'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { WalletLeaderboard, WalletLeaderboardSkeleton } from '@/components/tools/wallet-leaderboard';
import { ClusterSignalCards, ClusterSignalSkeleton } from '@/components/tools/cluster-signal-card';
import { TradeConfirmation, TradeSkeleton } from '@/components/tools/trade-confirmation';

const SUGGESTED_QUESTIONS = [
  'Who are the smartest wallets on Solana?',
  'What tokens are smart money converging on?',
  'Why is smart money buying PUMP?',
  'Buy $20 of PUMP',
];

const TOOL_LOADING: Record<string, string> = {
  scoreWallets: 'Scanning smart money wallets...',
  detectClusters: 'Detecting cluster signals...',
  explainSignal: 'Analyzing signal context...',
  executeTrade: 'Preparing trade quote...',
};

export default function Home() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const handleSuggestion = (q: string) => {
    sendMessage({ text: q });
  };

  const showGreeting = messages.length === 0;

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-data font-bold font-mono text-sm tracking-wider">SIGNALSTACK</span>
          <span className="text-[10px] text-muted-foreground font-mono">powered by Nansen</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {showGreeting && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <h1 className="text-2xl font-bold font-mono text-data mb-2">SignalStack</h1>
              <p className="text-muted-foreground text-sm mb-8 max-w-md">
                AI-powered smart money intelligence. Ask about wallets, signals, and trades on Solana.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestion(q)}
                    className="text-left text-sm px-3 py-2.5 rounded-lg border border-border/50 bg-surface hover:bg-surface-elevated transition-colors text-muted-foreground hover:text-foreground font-mono"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 ${message.role === 'user' ? 'flex justify-end' : ''}`}
            >
              {message.role === 'user' ? (
                <div className="bg-surface-elevated border border-border/50 px-4 py-2.5 rounded-2xl max-w-[80%] text-sm">
                  {message.parts?.map((part, i) => (
                    part.type === 'text' ? <span key={i}>{part.text}</span> : null
                  ))}
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="size-7 flex items-center justify-center rounded-full bg-surface border border-data/20 shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-data">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {message.parts?.map((part, i) => {
                      if (part.type === 'text' && part.text) {
                        return (
                          <div key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
                            {part.text}
                          </div>
                        );
                      }
                      // In AI SDK v6, tool parts have type `tool-${name}`
                      if (part.type.startsWith('tool-')) {
                        const toolName = part.type.replace('tool-', '');
                        const { toolCallId, state } = part as { toolCallId: string; state: string; output?: unknown };
                        const output = (part as Record<string, unknown>).output;

                        if (state === 'output-available' && output) {
                          return (
                            <div key={toolCallId}>
                              {toolName === 'scoreWallets' ? (
                                <WalletLeaderboard data={output as any} />
                              ) : toolName === 'detectClusters' ? (
                                <ClusterSignalCards data={output as any} />
                              ) : toolName === 'executeTrade' ? (
                                <TradeConfirmation data={output as any} />
                              ) : (
                                <pre className="text-xs text-muted-foreground overflow-auto p-3 bg-surface rounded-lg border border-border/50 font-mono">
                                  {JSON.stringify(output, null, 2)}
                                </pre>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={toolCallId}>
                            {toolName === 'scoreWallets' ? (
                              <WalletLeaderboardSkeleton />
                            ) : toolName === 'detectClusters' ? (
                              <ClusterSignalSkeleton />
                            ) : toolName === 'executeTrade' ? (
                              <TradeSkeleton />
                            ) : (
                              <div className="flex items-center gap-2 p-3 bg-surface rounded-lg border border-border/50 animate-pulse font-mono text-xs text-muted-foreground">
                                <div className="size-2 rounded-full bg-data animate-ping" />
                                {TOOL_LOADING[toolName] || 'Processing...'}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
            <div className="mb-6 flex gap-3">
              <div className="size-7 flex items-center justify-center rounded-full bg-surface border border-data/20 shrink-0 animate-pulse">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-data">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="text-sm text-muted-foreground animate-pulse font-mono">Analyzing...</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about smart money on Solana..."
            className="flex-1 bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-data/50 transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-data/10 border border-data/30 text-data rounded-xl text-sm font-mono font-bold hover:bg-data/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
}
