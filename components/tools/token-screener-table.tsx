'use client';

import { fmtUsd, pnlColor } from './utils';

interface TokenEntry {
  token_symbol?: string;
  symbol?: string;
  name?: string;
  price_usd?: number;
  market_cap_usd?: number;
  volume_usd?: number;
  price_change_pct?: number;
  chain?: string;
}

export function TokenScreenerTable({ data }: { data: { tokens: TokenEntry[]; chain: string; timeframe: string; total: number } }) {
  const { tokens, chain, timeframe, total } = data;

  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-xs overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-data font-bold text-[10px] uppercase tracking-wider">Token Screener</span>
        <span className="text-muted-foreground text-[10px]">{chain} / {timeframe} / {total} tokens</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-[10px] text-muted-foreground uppercase">
            <th className="pb-2 pr-3">#</th>
            <th className="pb-2 pr-3">Token</th>
            <th className="pb-2 pr-3 text-right">Price</th>
            <th className="pb-2 pr-3 text-right">Mkt Cap</th>
            <th className="pb-2 pr-3 text-right">Volume</th>
            <th className="pb-2 text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {tokens.slice(0, 25).map((t, i) => (
            <tr key={i} className="border-t border-border/20 hover:bg-surface-elevated">
              <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
              <td className="py-1.5 pr-3 font-bold">{t.token_symbol || t.symbol || '?'}</td>
              <td className="py-1.5 pr-3 text-right text-data">${(t.price_usd || 0).toFixed(t.price_usd && t.price_usd < 0.01 ? 6 : 2)}</td>
              <td className="py-1.5 pr-3 text-right">{fmtUsd(t.market_cap_usd || 0)}</td>
              <td className="py-1.5 pr-3 text-right">{fmtUsd(t.volume_usd || 0)}</td>
              <td className={`py-1.5 text-right font-bold ${pnlColor(t.price_change_pct || 0)}`}>
                {(t.price_change_pct || 0) >= 0 ? '+' : ''}{(t.price_change_pct || 0).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TokenScreenerSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-xs animate-pulse">
      <div className="h-3 w-32 bg-muted rounded mb-3" />
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex gap-4 py-1.5 border-t border-border/20">
          <div className="h-3 w-8 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-3 w-12 bg-muted rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}
