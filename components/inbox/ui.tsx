import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { InboxConfidence, InboxOpportunityStatus } from '@/lib/inbox/types';

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('rounded-2xl border border-border/50 bg-surface', className)}>
      {children}
    </section>
  );
}

export function SectionLabel({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-mono">{eyebrow}</div>
      <h2 className="mt-1 text-sm font-mono font-semibold text-foreground">{title}</h2>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

const confidenceStyles: Record<InboxConfidence, string> = {
  high: 'border-profit/30 bg-profit/10 text-profit',
  medium: 'border-signal-medium/30 bg-signal-medium/10 text-signal-medium',
  low: 'border-border/50 bg-muted text-muted-foreground',
};

export function ConfidenceBadge({ confidence }: { confidence: InboxConfidence }) {
  return (
    <span className={clsx('rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em] font-mono', confidenceStyles[confidence])}>
      {confidence}
    </span>
  );
}

const statusStyles: Record<InboxOpportunityStatus, string> = {
  ready: 'text-profit',
  blocked: 'text-loss',
  degraded: 'text-signal-medium',
};

export function StatusDot({
  status,
  label,
}: {
  status: InboxOpportunityStatus;
  label?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-mono', statusStyles[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      <span>{label ?? status}</span>
    </div>
  );
}

export function ActionButton({
  children,
  tone = 'default',
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-xl border px-3 py-2 text-xs font-mono transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'accent' && 'border-data/30 bg-data/10 text-data hover:bg-data/20',
        tone === 'danger' && 'border-loss/30 bg-loss/10 text-loss hover:bg-loss/20',
        tone === 'default' && 'border-border/50 bg-background text-foreground hover:bg-surface-elevated',
      )}
    >
      {children}
    </button>
  );
}
