'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { WalletLeaderboard, WalletLeaderboardSkeleton } from '@/components/tools/wallet-leaderboard';
import { ClusterSignalCards, ClusterSignalSkeleton } from '@/components/tools/cluster-signal-card';
import { TradeConfirmation, TradeSkeleton } from '@/components/tools/trade-confirmation';
import { WalletOverviewCard, WalletOverviewSkeleton } from '@/components/tools/wallet-overview-card';
import { TokenScreenerTable, TokenScreenerSkeleton } from '@/components/tools/token-screener-table';
import { GenericTable, GenericTableSkeleton } from '@/components/tools/generic-table';

const ALL_SUGGESTIONS = [
  { q: 'Who are the smartest wallets on Solana?', cat: 'Smart Money' },
  { q: 'What tokens are smart money converging on?', cat: 'Smart Money' },
  { q: 'Show me real-time smart money DEX trades', cat: 'Smart Money' },
  { q: 'What are smart money wallets holding right now?', cat: 'Smart Money' },
  { q: 'Show smart money perpetual trades on Hyperliquid', cat: 'Smart Money' },
  { q: 'Analyze wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', cat: 'Wallet' },
  { q: 'Show transactions for vitalik.eth on Ethereum', cat: 'Wallet' },
  { q: 'Find wallets related to this address', cat: 'Wallet' },
  { q: 'Compare two whale wallets side by side', cat: 'Wallet' },
  { q: 'Screen top tokens on Base by 24h volume', cat: 'Token' },
  { q: 'What is the Nansen Score for PEPE on Ethereum?', cat: 'Token' },
  { q: 'Are exchanges or whales accumulating ETH?', cat: 'Token' },
  { q: 'Who are the top holders of SOL?', cat: 'Token' },
  { q: 'Show recent DEX trades for BONK on Solana', cat: 'Token' },
  { q: 'Why is smart money buying PUMP?', cat: 'Token' },
  { q: 'Screen Hyperliquid perps by volume', cat: 'Perps' },
  { q: 'Who are the top perp traders by PnL?', cat: 'Perps' },
  { q: 'Search prediction markets for election', cat: 'Prediction' },
  { q: 'Show details on a Polymarket event', cat: 'Prediction' },
  { q: 'Get a quote to buy $20 of SOL', cat: 'Trading' },
  { q: 'Check status of my bridge transaction', cat: 'Trading' },
  { q: 'List my Nansen alerts', cat: 'Alerts' },
  { q: 'Set up an alert for smart money on Arbitrum', cat: 'Alerts' },
  { q: 'Search Nansen for Uniswap', cat: 'Search' },
  { q: 'What are the top tokens on Arbitrum?', cat: 'Multi-chain' },
  { q: 'Score smart money wallets on Ethereum', cat: 'Multi-chain' },
  { q: 'Show smart money flows on Polygon', cat: 'Multi-chain' },
];

const TOOL_LOADING: Record<string, string> = {
  scoreWallets: 'Scanning smart money wallets...',
  detectClusters: 'Detecting cluster signals...',
  explainSignal: 'Analyzing signal context...',
  executeTrade: 'Preparing trade quote...',
  smartMoneyDexTrades: 'Loading DEX trades...',
  smartMoneyPerps: 'Loading perp trades...',
  smartMoneyHoldings: 'Loading smart money holdings...',
  walletOverview: 'Profiling wallet...',
  walletTransactions: 'Loading transactions...',
  walletRelationships: 'Mapping related wallets...',
  walletCompare: 'Comparing wallets...',
  tokenScreener: 'Screening tokens...',
  tokenInfo: 'Loading token info...',
  tokenFlows: 'Analyzing token flows...',
  tokenHolders: 'Loading holder data...',
  tokenTrading: 'Loading trading activity...',
  perpScreener: 'Screening perps...',
  perpLeaderboard: 'Loading perp leaderboard...',
  predictionMarketScreener: 'Searching markets...',
  predictionMarketDetail: 'Loading market data...',
  bridgeStatus: 'Checking bridge status...',
  manageAlerts: 'Managing alerts...',
  searchNansen: 'Searching Nansen...',
};

function getRotatedSuggestions(count: number = 6) {
  const categories = [...new Set(ALL_SUGGESTIONS.map(s => s.cat))];
  const picked: typeof ALL_SUGGESTIONS = [];
  const used = new Set<number>();
  for (let i = categories.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [categories[i], categories[j]] = [categories[j], categories[i]];
  }
  for (const cat of categories) {
    if (picked.length >= count) break;
    const catItems = ALL_SUGGESTIONS.map((s, i) => ({ ...s, idx: i })).filter(s => s.cat === cat && !used.has(s.idx));
    if (catItems.length > 0) {
      const item = catItems[Math.floor(Math.random() * catItems.length)];
      picked.push(ALL_SUGGESTIONS[item.idx]);
      used.add(item.idx);
    }
  }
  while (picked.length < count) {
    const remaining = ALL_SUGGESTIONS.filter((_, i) => !used.has(i));
    if (remaining.length === 0) break;
    const idx = ALL_SUGGESTIONS.indexOf(remaining[Math.floor(Math.random() * remaining.length)]);
    picked.push(ALL_SUGGESTIONS[idx]);
    used.add(idx);
  }
  return picked;
}

function renderToolOutput(toolName: string, output: unknown) {
  const data = output as Record<string, unknown>;
  switch (toolName) {
    case 'scoreWallets': return <WalletLeaderboard data={data as any} />;
    case 'detectClusters': return <ClusterSignalCards data={data as any} />;
    case 'executeTrade': return <TradeConfirmation data={data as any} />;
    case 'walletOverview': return <WalletOverviewCard data={data} />;
    case 'tokenScreener': return <TokenScreenerTable data={data as any} />;
    default: return <GenericTable data={data} />;
  }
}

function renderToolSkeleton(toolName: string) {
  switch (toolName) {
    case 'scoreWallets': return <WalletLeaderboardSkeleton />;
    case 'detectClusters': return <ClusterSignalSkeleton />;
    case 'executeTrade': return <TradeSkeleton />;
    case 'walletOverview': return <WalletOverviewSkeleton />;
    case 'tokenScreener': return <TokenScreenerSkeleton />;
    default: return <GenericTableSkeleton />;
  }
}

interface ChatViewProps {
  chatId: string;
  onTitleUpdate?: (title: string) => void;
}

export function ChatView({ chatId, onTitleUpdate }: ChatViewProps) {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState(() => getRotatedSuggestions(6));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'streaming' || status === 'submitted';
  const lastSavedRef = useRef(0);
  const titleSetRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist messages to DB after each exchange completes
  useEffect(() => {
    if (status !== 'ready' || messages.length === 0) return;
    if (messages.length <= lastSavedRef.current) return;
    lastSavedRef.current = messages.length;

    const unsaved = messages.slice(-2); // last user + assistant pair
    if (unsaved.length === 0) return;

    fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: unsaved.map(m => ({ id: m.id, role: m.role, parts: m.parts })) }),
    }).catch(() => {});

    // Auto-title from first user message
    if (!titleSetRef.current && messages.length >= 1) {
      titleSetRef.current = true;
      const firstUser = messages.find(m => m.role === 'user');
      if (firstUser) {
        const text = firstUser.parts?.find(p => p.type === 'text')?.text || '';
        const title = text.slice(0, 60) || 'New chat';
        fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }).catch(() => {});
        onTitleUpdate?.(title);
      }
    }
  }, [status, messages, chatId, onTitleUpdate]);

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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {showGreeting && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <h1 className="text-2xl font-bold font-mono text-data mb-2">SignalStack</h1>
              <p className="text-muted-foreground text-sm mb-2 max-w-md">
                AI-powered onchain analytics across 18 chains.
              </p>
              <p className="text-muted-foreground/60 text-xs mb-8 max-w-md">
                22 tools: smart money, wallets, tokens, perps, prediction markets, trading, alerts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s.q}
                    onClick={() => handleSuggestion(s.q)}
                    className="text-left text-sm px-3 py-2.5 rounded-lg border border-border/50 bg-surface hover:bg-surface-elevated transition-colors text-muted-foreground hover:text-foreground font-mono group"
                  >
                    <span className="text-[9px] text-data/50 uppercase tracking-wider block mb-0.5">{s.cat}</span>
                    {s.q}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSuggestions(getRotatedSuggestions(6))}
                className="mt-3 text-xs text-muted-foreground/50 hover:text-data transition-colors font-mono flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                more suggestions
              </button>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`mb-6 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
              {message.role === 'user' ? (
                <div className="bg-surface-elevated border border-border/50 px-4 py-2.5 rounded-2xl max-w-[80%] text-sm">
                  {message.parts?.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="size-7 flex items-center justify-center rounded-full bg-surface border border-data/20 shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-data">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {message.parts?.map((part, i) => {
                      if (part.type === 'text' && part.text) {
                        return <div key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</div>;
                      }
                      if (part.type.startsWith('tool-')) {
                        const toolName = part.type.replace('tool-', '');
                        const { toolCallId, state } = part as { toolCallId: string; state: string };
                        const output = (part as Record<string, unknown>).output;
                        if (state === 'output-available' && output) {
                          return <div key={toolCallId}>{renderToolOutput(toolName, output)}</div>;
                        }
                        return <div key={toolCallId}>{renderToolSkeleton(toolName)}</div>;
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
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="text-sm text-muted-foreground animate-pulse font-mono">Analyzing...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about smart money, tokens, wallets, perps, predictions..."
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
