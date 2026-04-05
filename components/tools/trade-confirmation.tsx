'use client';

interface TradeResult {
  token: string;
  amount_usd: number;
  execution_price: number;
  slippage_pct: number;
  tx_hash: string;
  status: 'success' | 'failed' | 'quote_only';
  chain: string;
  message?: string;
  error?: string;
}

const statusCfg = {
  success: { color: 'text-profit', bg: 'bg-profit/10', border: 'border-profit/30', label: 'EXECUTED' },
  quote_only: { color: 'text-signal-medium', bg: 'bg-signal-medium/10', border: 'border-signal-medium/30', label: 'QUOTE' },
  failed: { color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/30', label: 'FAILED' },
};

export function TradeConfirmation({ data }: { data: TradeResult }) {
  if (data.error) {
    return (
      <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 font-mono text-sm">
        <div className="text-loss font-bold mb-1">Trade Rejected</div>
        <div className="text-muted-foreground">{data.error}</div>
      </div>
    );
  }

  const c = statusCfg[data.status];

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4 font-mono text-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-bold">{data.token}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${c.color} border ${c.border}`}>{c.label}</span>
        </div>
        <span className="text-muted-foreground text-xs">{data.chain}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><div className="text-[10px] text-muted-foreground uppercase">Amount</div><div className="text-lg font-bold text-foreground">${data.amount_usd.toFixed(2)}</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">Price</div><div className="text-lg font-bold text-data">${data.execution_price.toFixed(6)}</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">Slippage</div><div className={`text-lg font-bold ${data.slippage_pct > 1 ? 'text-loss' : 'text-muted-foreground'}`}>{data.slippage_pct.toFixed(2)}%</div></div>
      </div>
      {data.tx_hash && data.status === 'success' && (
        <div className="mt-3 border-t border-border/30 pt-2">
          <a href={`https://solscan.io/tx/${data.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-data text-xs hover:underline">
            Solscan: {data.tx_hash.slice(0, 8)}...{data.tx_hash.slice(-8)}
          </a>
        </div>
      )}
      {data.message && <div className="mt-2 text-xs text-muted-foreground">{data.message}</div>}
    </div>
  );
}

export function TradeSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-sm animate-pulse">
      <div className="flex items-center gap-2 mb-3"><div className="h-5 w-16 bg-muted rounded" /><div className="h-4 w-16 bg-muted rounded" /></div>
      <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i}><div className="h-2 w-12 bg-muted rounded mb-1" /><div className="h-6 w-16 bg-muted rounded" /></div>)}</div>
    </div>
  );
}
