'use client';

import { truncAddr, fmtUsd, pnlColor } from './utils';

export function WalletOverviewCard({ data }: { data: Record<string, unknown> }) {
  const address = data.address as string || '';
  const chain = data.chain as string || '';
  const balance = data.balance as unknown[] || [];
  const pnl = data.pnl_summary as Record<string, number> || {};
  const labels = data.labels as unknown[] || [];
  const counterparties = data.counterparties as Array<Record<string, unknown>> || [];

  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-data font-bold text-xs uppercase tracking-wider">Wallet Profile</span>
          <code className="text-xs text-muted-foreground">{truncAddr(address)}</code>
        </div>
        <span className="text-xs text-muted-foreground">{chain}</span>
      </div>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {labels.slice(0, 5).map((label, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-data/10 text-data border border-data/20">
              {typeof label === 'object' ? JSON.stringify(label) : String(label)}
            </span>
          ))}
        </div>
      )}

      {/* PnL Summary */}
      {pnl && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">PnL</div>
            <div className={`text-lg font-bold ${pnlColor(pnl.realized_pnl_usd || 0)}`}>
              {fmtUsd(pnl.realized_pnl_usd || 0)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">ROI</div>
            <div className={`text-lg font-bold ${pnlColor(pnl.realized_pnl_percent || 0)}`}>
              {(pnl.realized_pnl_percent || 0).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Win Rate</div>
            <div className="text-lg font-bold text-foreground">
              {((pnl.win_rate || 0) * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Trades</div>
            <div className="text-lg font-bold text-foreground">{pnl.traded_times || 0}</div>
          </div>
        </div>
      )}

      {/* Top Holdings */}
      {balance.length > 0 && (
        <div>
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Top Holdings</div>
          <div className="space-y-1">
            {balance.slice(0, 5).map((item, i) => {
              const t = item as Record<string, unknown>;
              return (
                <div key={i} className="flex justify-between text-xs bg-surface-elevated rounded px-2 py-1">
                  <span>{String(t.token_symbol || t.symbol || '?')}</span>
                  <span className="text-muted-foreground">{fmtUsd(Number(t.value_usd || t.balance_usd || 0))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Counterparties */}
      {counterparties.length > 0 && (
        <div>
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Top Counterparties</div>
          <div className="flex flex-wrap gap-1.5">
            {counterparties.slice(0, 5).map((cp, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {truncAddr(String(cp.address || ''))} <span className="text-data">{fmtUsd(Number(cp.volume_usd || 0))}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WalletOverviewSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-sm animate-pulse space-y-3">
      <div className="h-3 w-40 bg-muted rounded" />
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i}><div className="h-2 w-12 bg-muted rounded mb-1"/><div className="h-6 w-16 bg-muted rounded"/></div>)}
      </div>
    </div>
  );
}
