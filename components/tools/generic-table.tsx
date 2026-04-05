'use client';

import { truncAddr, fmtUsd } from './utils';

function formatValue(val: unknown): string {
  if (val == null) return '-';
  if (typeof val === 'number') {
    if (Math.abs(val) > 1000) return fmtUsd(val);
    return val.toFixed(2);
  }
  if (typeof val === 'string') {
    if (val.length > 20 && /^[0-9a-fA-Fx]/.test(val)) return truncAddr(val);
    return val;
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.map(v => formatValue(v)).join(', ');
  return JSON.stringify(val);
}

export function GenericTable({ data }: { data: Record<string, unknown> }) {
  // Find the array in the data — could be under various keys
  let rows: Record<string, unknown>[] = [];
  let title = '';

  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      rows = val as Record<string, unknown>[];
      title = key;
      break;
    }
  }

  if (rows.length === 0) {
    // No array found — render as key-value pairs
    return (
      <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-xs">
        {Object.entries(data).filter(([k]) => k !== 'timestamp').map(([key, val]) => (
          <div key={key} className="flex justify-between py-1 border-b border-border/20 last:border-0">
            <span className="text-muted-foreground">{key}</span>
            <span className="text-foreground">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Get column headers from first row
  const columns = Object.keys(rows[0]).filter(k => k !== 'timestamp');
  const displayCols = columns.slice(0, 6); // Max 6 columns

  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-xs overflow-x-auto">
      {title && (
        <div className="text-data font-bold text-[10px] uppercase tracking-wider mb-2">
          {title} ({rows.length})
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr>
            {displayCols.map(col => (
              <th key={col} className="text-left text-[10px] text-muted-foreground uppercase pb-2 pr-3">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-t border-border/20">
              {displayCols.map(col => (
                <td key={col} className="py-1.5 pr-3 text-foreground">
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && (
        <div className="text-muted-foreground text-[10px] mt-2">...and {rows.length - 20} more</div>
      )}
    </div>
  );
}

export function GenericTableSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-surface p-4 font-mono text-xs animate-pulse">
      <div className="h-3 w-32 bg-muted rounded mb-3" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-4 py-1.5">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
