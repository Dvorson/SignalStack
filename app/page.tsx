'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { WalletLeaderboard, WalletLeaderboardSkeleton } from '@/components/tools/wallet-leaderboard';
import { ClusterSignalCards, ClusterSignalSkeleton } from '@/components/tools/cluster-signal-card';
import { TradeConfirmation, TradeSkeleton } from '@/components/tools/trade-confirmation';
import { WalletOverviewCard, WalletOverviewSkeleton } from '@/components/tools/wallet-overview-card';
import { TokenScreenerTable, TokenScreenerSkeleton } from '@/components/tools/token-screener-table';
import { GenericTable, GenericTableSkeleton } from '@/components/tools/generic-table';

const SUGGESTED_QUESTIONS = [
  'Who are the smartest wallets on Solana?',
  'What tokens are smart money converging on?',
  'Screen top tokens on Ethereum by volume',
  'Show the perp leaderboard on Hyperliquid',
  'Search prediction markets for crypto',
  'What are smart money wallets holding?',
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

// Tools that get specialized components
const SPECIALIZED_TOOLS = new Set([
  'scoreWallets', 'detectClusters', 'executeTrade',
  'walletOverview', 'tokenScreener',
]);

function renderToolOutput(toolName: string, output: unknown) {
  const data = output as Record<string, unknown>;
  switch (toolName) {
    case 'scoreWallets':
      return <WalletLeaderboard data={data as any} />;
    case 'detectClusters':
      return <ClusterSignalCards data={data as any} />;
    case 'executeTrade':
      return <TradeConfirmation data={data as any} />;
    case 'walletOverview':
      return <WalletOverviewCard data={data} />;
    case 'tokenScreener':
      return <TokenScreenerTable data={data as any} />;
    default:
      return <GenericTable data={data} />;
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
              <p className="text-muted-foreground text-sm mb-2 max-w-md">
                AI-powered onchain analytics across 18 chains. Smart money tracking, wallet profiling, token analysis, perps, prediction markets, and trading.
              </p>
              <p className="text-muted-foreground/60 text-xs mb-8 max-w-md">
                Powered by Nansen CLI with 22 tools covering the full platform.
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
                      if (part.type.startsWith('tool-')) {
                        const toolName = part.type.replace('tool-', '');
                        const { toolCallId, state } = part as { toolCallId: string; state: string; output?: unknown };
                        const output = (part as Record<string, unknown>).output;

                        if (state === 'output-available' && output) {
                          return <div key={toolCallId}>{renderToolOutput(toolName, output)}</div>;
                        }

                        return (
                          <div key={toolCallId}>
                            {renderToolSkeleton(toolName)}
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
