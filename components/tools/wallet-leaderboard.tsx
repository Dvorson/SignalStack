'use client';

interface WalletScore {
  address: string;
  label: string;
  pnl_90d_pct: number;
  win_rate: number;
  composite_score: number;
  bought_volume_usd: number;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function fmtUsd(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function scoreColor(s: number) {
  if (s >= 75) return 'text-profit';
  if (s >= 50) return 'text-signal-medium';
  return 'text-loss';
}

function pnlColor(p: number) {
  return p >= 0 ? 'text-profit' : 'text-loss';
}

export function WalletLeaderboard({ data }: { data: { wallets: WalletScore[]; chain: string; total_analyzed: number } }) {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-data font-bold text-xs uppercase tracking-wider">Smart Money Leaderboard</span>
        <span className="text-xs text-muted-foreground">{data.total_analyzed} wallets</span>
      </div>
      <div className="space-y-1.5">
        {data.wallets.map((w, i) => (
          <div key={w.address} className="flex items-center gap-3 p-2 rounded bg-surface-elevated hover:bg-surface-hover transition-colors">
            <span className="text-muted-foreground w-5 text-right text-xs">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-xs">{truncAddr(w.address)}</code>
                {w.label && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-data/10 text-data border border-data/20">{w.label}</span>
                )}
              </div>
              <div className="flex gap-3 mt-0.5 text-[11px]">
                <span className={pnlColor(w.pnl_90d_pct)}>{w.pnl_90d_pct >= 0 ? '+' : ''}{w.pnl_90d_pct.toFixed(1)}%</span>
                <span className="text-muted-foreground">{(w.win_rate * 100).toFixed(0)}% win</span>
                <span className="text-muted-foreground/60">{fmtUsd(w.bought_volume_usd)} vol</span>
              </div>
            </div>
            <div className={`text-lg font-bold ${scoreColor(w.composite_score)}`}>{w.composite_score.toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WalletLeaderboardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-sm animate-pulse">
      <div className="h-3 w-48 bg-muted rounded mb-3" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-2 rounded bg-surface-elevated mb-1.5">
          <div className="h-4 w-5 bg-muted rounded" />
          <div className="flex-1"><div className="h-3 w-32 bg-muted rounded mb-1" /><div className="h-2 w-48 bg-muted rounded" /></div>
          <div className="h-6 w-8 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
