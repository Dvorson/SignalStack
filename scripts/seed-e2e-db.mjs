import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const outputDir = path.join(process.cwd(), '.tmp', 'e2e');
const dbPath = path.join(outputDir, 'signalstack.db');

fs.mkdirSync(outputDir, { recursive: true });
fs.rmSync(dbPath, { force: true });
fs.rmSync(`${dbPath}-wal`, { force: true });
fs.rmSync(`${dbPath}-shm`, { force: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE chats (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New chat',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    parts TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_messages_chat_id ON messages(chat_id);

  CREATE TABLE inbox_snapshots (
    id TEXT PRIMARY KEY,
    chain TEXT NOT NULL,
    status TEXT NOT NULL,
    summary_json TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    opportunity_count INTEGER NOT NULL DEFAULT 0,
    blocked_count INTEGER NOT NULL DEFAULT 0,
    generated_by TEXT NOT NULL DEFAULT 'manual',
    generated_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE inbox_opportunities (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL REFERENCES inbox_snapshots(id) ON DELETE CASCADE,
    token_symbol TEXT NOT NULL,
    token_address TEXT NOT NULL,
    chain TEXT NOT NULL,
    rank INTEGER NOT NULL,
    status TEXT NOT NULL,
    score REAL NOT NULL,
    confidence TEXT NOT NULL,
    primary_thesis TEXT NOT NULL,
    primary_risk TEXT NOT NULL,
    why_now TEXT NOT NULL,
    why_trust TEXT NOT NULL,
    why_not TEXT NOT NULL,
    trader_count INTEGER NOT NULL DEFAULT 0,
    avg_wallet_score REAL,
    holders_still_holding INTEGER NOT NULL DEFAULT 0,
    net_flow_24h_usd REAL NOT NULL DEFAULT 0,
    net_flow_7d_usd REAL NOT NULL DEFAULT 0,
    market_cap_usd REAL NOT NULL DEFAULT 0,
    token_age_days REAL NOT NULL DEFAULT 0,
    key_metrics_json TEXT NOT NULL,
    guardrails_json TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_inbox_opportunities_snapshot_rank
    ON inbox_opportunities(snapshot_id, rank);

  CREATE TABLE inbox_decisions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL REFERENCES inbox_snapshots(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL REFERENCES inbox_opportunities(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    note TEXT,
    quote_status TEXT,
    quote_payload TEXT,
    raw_payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE inbox_outcomes (
    id TEXT PRIMARY KEY,
    token_symbol TEXT NOT NULL,
    token_address TEXT NOT NULL,
    chain TEXT NOT NULL,
    source_snapshot_id TEXT NOT NULL REFERENCES inbox_snapshots(id) ON DELETE CASCADE,
    source_opportunity_id TEXT NOT NULL REFERENCES inbox_opportunities(id) ON DELETE CASCADE,
    source_decision_id TEXT REFERENCES inbox_decisions(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    horizon_label TEXT,
    entry_reference TEXT,
    entry_price REAL,
    amount_usd REAL,
    pnl_pct REAL,
    pnl_usd REAL,
    baseline_label TEXT,
    baseline_outcome TEXT NOT NULL DEFAULT 'unknown',
    notes TEXT,
    opened_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_inbox_outcomes_token_updated
    ON inbox_outcomes(chain, token_address, updated_at DESC, created_at DESC);
`);

db.pragma('user_version = 3');

db.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run('chat-e2e', 'Inbox research');

const snapshotId = 'snapshot-e2e';
const generatedAt = new Date().toISOString();
const summary = {
  headline: '2 opportunities deserve a real look',
  subheadline: 'ALPHA leads the queue right now. Blocked and degraded setups stay visible so you can see what got filtered out.',
  counts: {
    total: 3,
    ready: 2,
    blocked: 1,
    degraded: 0,
  },
  topScore: 92,
  topSymbol: 'ALPHA',
};

db.prepare(`
  INSERT INTO inbox_snapshots (
    id, chain, status, summary_json, raw_payload, opportunity_count,
    blocked_count, generated_by, generated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  snapshotId,
  'solana',
  'ready',
  JSON.stringify(summary),
  JSON.stringify({ seeded: true }),
  3,
  1,
  'e2e-seed',
  generatedAt,
);

const insertOpportunity = db.prepare(`
  INSERT INTO inbox_opportunities (
    id, snapshot_id, token_symbol, token_address, chain, rank, status, score,
    confidence, primary_thesis, primary_risk, why_now, why_trust, why_not,
    trader_count, avg_wallet_score, holders_still_holding, net_flow_24h_usd,
    net_flow_7d_usd, market_cap_usd, token_age_days, key_metrics_json,
    guardrails_json, raw_payload
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const opportunities = [
  {
    id: 'opp-alpha',
    tokenSymbol: 'ALPHA',
    tokenAddress: 'alpha-token',
    rank: 1,
    status: 'ready',
    score: 92,
    confidence: 'high',
    primaryThesis: 'ALPHA has the strongest mix of recent flow, wallet breadth, and clean guardrails.',
    primaryRisk: 'Still a small-cap setup, so keep size disciplined.',
    whyNow: 'Fresh 24h inflow pushed it to the top of the queue.',
    whyTrust: 'Fast wallet scoring came back strong and most buyers are still net long.',
    whyNot: 'Momentum can reverse fast if net flow stalls.',
    traderCount: 7,
    avgWalletScore: 78,
    holdersStillHolding: 4,
    netFlow24hUsd: 450000,
    netFlow7dUsd: 2400000,
    marketCapUsd: 8200000,
    tokenAgeDays: 24,
    keyMetrics: [
      { label: '7d flow', value: '$2.4M', tone: 'positive' },
      { label: '24h flow', value: '$450K', tone: 'positive' },
    ],
    guardrails: [
      { key: 'net-flow', label: 'Net flow', passed: true, severity: 'info', detail: 'Strong positive flow' },
    ],
  },
  {
    id: 'opp-fail',
    tokenSymbol: 'FAIL',
    tokenAddress: 'fail-token',
    rank: 2,
    status: 'ready',
    score: 79,
    confidence: 'medium',
    primaryThesis: 'FAIL is still tradable, but the quote path is mocked to fail in E2E so we can test the unhappy path.',
    primaryRisk: 'Quote may fail even though the signal is ranked.',
    whyNow: 'It still meets the basic rank threshold.',
    whyTrust: 'Signal breadth exists, but it is weaker than ALPHA.',
    whyNot: 'This row is deliberately used for quote-failure coverage.',
    traderCount: 5,
    avgWalletScore: 61,
    holdersStillHolding: 2,
    netFlow24hUsd: 150000,
    netFlow7dUsd: 900000,
    marketCapUsd: 6100000,
    tokenAgeDays: 16,
    keyMetrics: [
      { label: '7d flow', value: '$900K', tone: 'positive' },
      { label: '24h flow', value: '$150K', tone: 'default' },
    ],
    guardrails: [
      { key: 'wallet-quality', label: 'Wallet quality', passed: true, severity: 'info', detail: 'Acceptable wallet quality' },
    ],
  },
  {
    id: 'opp-block',
    tokenSymbol: 'BLOCK',
    tokenAddress: 'block-token',
    rank: 3,
    status: 'blocked',
    score: 31,
    confidence: 'low',
    primaryThesis: 'BLOCK shows activity but fails the hard checks.',
    primaryRisk: 'Market cap and token age are too weak.',
    whyNow: 'The system saw the activity and kept it visible for context.',
    whyTrust: 'The row exists so you can see what got filtered out.',
    whyNot: 'Hard guardrails say no trade.',
    traderCount: 3,
    avgWalletScore: 28,
    holdersStillHolding: 0,
    netFlow24hUsd: -4000,
    netFlow7dUsd: -25000,
    marketCapUsd: 90000,
    tokenAgeDays: 1,
    keyMetrics: [
      { label: '7d flow', value: '-$25K', tone: 'warning' },
      { label: '24h flow', value: '-$4K', tone: 'warning' },
    ],
    guardrails: [
      { key: 'market-cap', label: 'Market cap', passed: false, severity: 'block', detail: 'Too small to trust' },
    ],
  },
];

for (const opportunity of opportunities) {
  insertOpportunity.run(
    opportunity.id,
    snapshotId,
    opportunity.tokenSymbol,
    opportunity.tokenAddress,
    'solana',
    opportunity.rank,
    opportunity.status,
    opportunity.score,
    opportunity.confidence,
    opportunity.primaryThesis,
    opportunity.primaryRisk,
    opportunity.whyNow,
    opportunity.whyTrust,
    opportunity.whyNot,
    opportunity.traderCount,
    opportunity.avgWalletScore,
    opportunity.holdersStillHolding,
    opportunity.netFlow24hUsd,
    opportunity.netFlow7dUsd,
    opportunity.marketCapUsd,
    opportunity.tokenAgeDays,
    JSON.stringify(opportunity.keyMetrics),
    JSON.stringify(opportunity.guardrails),
    JSON.stringify({ seeded: true, token: opportunity.tokenSymbol }),
  );
}

db.close();
