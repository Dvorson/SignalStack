'use client';

interface ClusterWallet {
  address: string;
  label: string;
  composite_score: number;
}

interface ClusterSignal {
  token: string;
  token_address: string;
  chain: string;
  wallets: ClusterWallet[];
  trader_count: number;
  avg_score: number;
  signal_strength: number;
  conviction: 'low' | 'medium' | 'high';
  net_flow_7d_usd: number;
  net_flow_24h_usd: number;
  market_cap_usd: number;
  window_hours: number;
  token_sectors: string[];
  token_age_days: number;
}

function fmtUsd(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function truncAddr(a: string) { return `${a.slice(0, 4)}...${a.slice(-4)}`; }

const cfg = {
  high: { color: 'text-signal-high', bg: 'bg-signal-high/10', border: 'border-signal-high/30' },
  medium: { color: 'text-signal-medium', bg: 'bg-signal-medium/10', border: 'border-signal-medium/30' },
  low: { color: 'text-signal-low', bg: 'bg-signal-low/10', border: 'border-signal-low/30' },
};

function SignalCard({ signal }: { signal: ClusterSignal }) {
  const c = cfg[signal.conviction];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4 font-mono text-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-bold text-base">{signal.token}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${c.color} border ${c.border}`}>
            {signal.conviction.toUpperCase()} CONVICTION
          </span>
        </div>
        <span className="text-muted-foreground text-xs">{signal.chain}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div><div className="text-[10px] text-muted-foreground uppercase">Strength</div><div className={`text-lg font-bold ${c.color}`}>{signal.signal_strength.toFixed(2)}</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">SM Wallets</div><div className="text-lg font-bold text-foreground">{signal.trader_count || signal.wallets.length}</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">7d Flow</div><div className="text-lg font-bold text-data">{fmtUsd(signal.net_flow_7d_usd)}</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">Mkt Cap</div><div className="text-lg font-bold text-muted-foreground">{fmtUsd(signal.market_cap_usd)}</div></div>
      </div>
      {signal.wallets.length > 0 && (
      <div className="border-t border-border/30 pt-2">
        <div className="text-[10px] text-muted-foreground uppercase mb-1">Converging Wallets (avg: {signal.avg_score.toFixed(0)})</div>
        <div className="flex flex-wrap gap-1.5">
          {signal.wallets.map(w => (
            <span key={w.address} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {truncAddr(w.address)} <span className="text-data">{w.composite_score}</span>
            </span>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

export function ClusterSignalCards({ data }: { data: { signals: ClusterSignal[]; total_signals: number } }) {
  if (data.signals.length === 0) {
    return <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-sm text-muted-foreground">No cluster signals detected.</div>;
  }
  return (
    <div className="space-y-3">
      <span className="text-data font-bold text-xs uppercase tracking-wider font-mono">Cluster Signals ({data.total_signals})</span>
      {data.signals.map((s, i) => <SignalCard key={s.token_address || i} signal={s} />)}
    </div>
  );
}

export function ClusterSignalSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-sm animate-pulse">
      <div className="flex items-center gap-2 mb-3"><div className="h-5 w-16 bg-muted rounded" /><div className="h-4 w-24 bg-muted rounded" /></div>
      <div className="grid grid-cols-4 gap-3 mb-3">{[1,2,3,4].map(i => <div key={i}><div className="h-2 w-12 bg-muted rounded mb-1" /><div className="h-6 w-10 bg-muted rounded" /></div>)}</div>
    </div>
  );
}
