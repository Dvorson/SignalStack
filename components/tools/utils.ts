export function truncAddr(addr: string) {
  if (!addr || addr.length <= 10) return addr || '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function fmtUsd(n: number) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtPct(n: number) {
  if (n == null || isNaN(n)) return '0%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function scoreColor(s: number) {
  if (s >= 75) return 'text-profit';
  if (s >= 50) return 'text-signal-medium';
  return 'text-loss';
}

export function pnlColor(p: number) {
  return p >= 0 ? 'text-profit' : 'text-loss';
}
