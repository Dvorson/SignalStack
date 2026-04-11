import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;
let currentDbPath: string | null = null;

type Migration = {
  version: number;
  name: string;
  up: (database: Database.Database) => void;
};

const migrations: Migration[] = [
  {
    version: 1,
    name: 'chat persistence',
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL DEFAULT 'New chat',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          parts TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      `);
    },
  },
  {
    version: 2,
    name: 'trade inbox snapshots and decisions',
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS inbox_snapshots (
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

        CREATE TABLE IF NOT EXISTS inbox_opportunities (
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

        CREATE INDEX IF NOT EXISTS idx_inbox_opportunities_snapshot_rank
          ON inbox_opportunities(snapshot_id, rank);
        CREATE INDEX IF NOT EXISTS idx_inbox_opportunities_symbol
          ON inbox_opportunities(token_symbol);

        CREATE TABLE IF NOT EXISTS inbox_decisions (
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

        CREATE INDEX IF NOT EXISTS idx_inbox_decisions_snapshot_created
          ON inbox_decisions(snapshot_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_inbox_decisions_opportunity
          ON inbox_decisions(opportunity_id);
      `);
    },
  },
  {
    version: 3,
    name: 'trade outcome tracking',
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS inbox_outcomes (
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

        CREATE INDEX IF NOT EXISTS idx_inbox_outcomes_token_updated
          ON inbox_outcomes(chain, token_address, updated_at DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_inbox_outcomes_source_opportunity
          ON inbox_outcomes(source_opportunity_id);
      `);
    },
  },
];

function runMigrations(database: Database.Database) {
  const currentVersion = database.pragma('user_version', { simple: true }) as number;
  const pending = migrations.filter((migration) => migration.version > currentVersion);

  for (const migration of pending) {
    const applyMigration = database.transaction(() => {
      migration.up(database);
      database.pragma(`user_version = ${migration.version}`);
    });

    applyMigration();
  }
}

function getDb(): Database.Database {
  const dbPath = process.env.SIGNALSTACK_DB_PATH || path.join(process.cwd(), 'signalstack.db');

  if (!db || currentDbPath !== dbPath) {
    db?.close();
    db = new Database(dbPath);
    currentDbPath = dbPath;
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }

  return db;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DBMessage {
  id: string;
  chat_id: string;
  role: string;
  parts: string;
  created_at: string;
}

export interface InboxOpportunityRecord {
  id: string;
  snapshot_id: string;
  token_symbol: string;
  token_address: string;
  chain: string;
  rank: number;
  status: 'ready' | 'blocked' | 'degraded';
  score: number;
  confidence: 'low' | 'medium' | 'high';
  primary_thesis: string;
  primary_risk: string;
  why_now: string;
  why_trust: string;
  why_not: string;
  trader_count: number;
  avg_wallet_score: number | null;
  holders_still_holding: number;
  net_flow_24h_usd: number;
  net_flow_7d_usd: number;
  market_cap_usd: number;
  token_age_days: number;
  key_metrics_json: string;
  guardrails_json: string;
  raw_payload: string;
  created_at: string;
}

export interface InboxSnapshotRecord {
  id: string;
  chain: string;
  status: 'ready' | 'empty' | 'partial' | 'error';
  summary_json: string;
  raw_payload: string;
  opportunity_count: number;
  blocked_count: number;
  generated_by: string;
  generated_at: string;
  created_at: string;
}

export interface InboxDecisionRecord {
  id: string;
  snapshot_id: string;
  opportunity_id: string;
  action: 'skip' | 'reject' | 'mute' | 'quote';
  note: string | null;
  quote_status: string | null;
  quote_payload: string | null;
  raw_payload: string;
  created_at: string;
}

export interface InboxOutcomeRecord {
  id: string;
  token_symbol: string;
  token_address: string;
  chain: string;
  source_snapshot_id: string;
  source_opportunity_id: string;
  source_decision_id: string | null;
  status: 'watching' | 'open' | 'closed';
  horizon_label: string | null;
  entry_reference: string | null;
  entry_price: number | null;
  amount_usd: number | null;
  pnl_pct: number | null;
  pnl_usd: number | null;
  baseline_label: string | null;
  baseline_outcome: 'unknown' | 'beat' | 'matched' | 'lagged';
  notes: string | null;
  opened_at: string;
  updated_at: string;
  created_at: string;
}

export type PersistedInboxOpportunity = Omit<
  InboxOpportunityRecord,
  'snapshot_id' | 'key_metrics_json' | 'guardrails_json' | 'raw_payload' | 'created_at'
> & {
  keyMetrics: unknown;
  guardrails: unknown;
  rawPayload: unknown;
};

export type PersistedInboxSnapshot = Omit<
  InboxSnapshotRecord,
  'summary_json' | 'raw_payload' | 'created_at'
> & {
  summary: unknown;
  rawPayload: unknown;
  opportunities: PersistedInboxOpportunity[];
};

export type PersistedInboxDecision = Omit<
  InboxDecisionRecord,
  'quote_payload' | 'raw_payload'
> & {
  quotePayload: unknown | null;
  rawPayload: unknown;
};

export type PersistedInboxOutcome = InboxOutcomeRecord;

export function createChat(id: string, title: string = 'New chat'): Chat {
  const database = getDb();
  database.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run(id, title);
  return database.prepare('SELECT * FROM chats WHERE id = ?').get(id) as Chat;
}

export function listChats(): Chat[] {
  return getDb().prepare('SELECT * FROM chats ORDER BY updated_at DESC').all() as Chat[];
}

export function getChat(id: string): Chat | null {
  return (getDb().prepare('SELECT * FROM chats WHERE id = ?').get(id) as Chat) || null;
}

export function deleteChat(id: string): void {
  getDb().prepare('DELETE FROM chats WHERE id = ?').run(id);
}

export function updateChatTitle(id: string, title: string): void {
  getDb().prepare('UPDATE chats SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, id);
}

export function touchChat(id: string): void {
  getDb().prepare('UPDATE chats SET updated_at = datetime(\'now\') WHERE id = ?').run(id);
}

export function saveMessage(id: string, chatId: string, role: string, parts: unknown[]): void {
  const database = getDb();
  database
    .prepare('INSERT OR REPLACE INTO messages (id, chat_id, role, parts) VALUES (?, ?, ?, ?)')
    .run(id, chatId, role, JSON.stringify(parts));
  touchChat(chatId);
}

export function getMessages(chatId: string): DBMessage[] {
  return getDb()
    .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC')
    .all(chatId) as DBMessage[];
}

export function getMessageCount(chatId: string): number {
  const result = getDb()
    .prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?')
    .get(chatId) as { count: number };
  return result.count;
}

export function saveInboxSnapshot(snapshot: {
  id: string;
  chain: string;
  status: 'ready' | 'empty' | 'partial' | 'error';
  summary: unknown;
  rawPayload: unknown;
  opportunityCount: number;
  blockedCount: number;
  generatedBy?: string;
  generatedAt: string;
  opportunities: Array<{
    id: string;
    tokenSymbol: string;
    tokenAddress: string;
    chain: string;
    rank: number;
    status: 'ready' | 'blocked' | 'degraded';
    score: number;
    confidence: 'low' | 'medium' | 'high';
    primaryThesis: string;
    primaryRisk: string;
    whyNow: string;
    whyTrust: string;
    whyNot: string;
    traderCount: number;
    avgWalletScore: number | null;
    holdersStillHolding: number;
    netFlow24hUsd: number;
    netFlow7dUsd: number;
    marketCapUsd: number;
    tokenAgeDays: number;
    keyMetrics: unknown;
    guardrails: unknown;
    rawPayload: unknown;
  }>;
}): void {
  const database = getDb();
  const persist = database.transaction(() => {
    database
      .prepare(`
        INSERT INTO inbox_snapshots (
          id, chain, status, summary_json, raw_payload, opportunity_count,
          blocked_count, generated_by, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        snapshot.id,
        snapshot.chain,
        snapshot.status,
        JSON.stringify(snapshot.summary),
        JSON.stringify(snapshot.rawPayload),
        snapshot.opportunityCount,
        snapshot.blockedCount,
        snapshot.generatedBy || 'manual',
        snapshot.generatedAt,
      );

    const insertOpportunity = database.prepare(`
      INSERT INTO inbox_opportunities (
        id, snapshot_id, token_symbol, token_address, chain, rank, status, score,
        confidence, primary_thesis, primary_risk, why_now, why_trust, why_not,
        trader_count, avg_wallet_score, holders_still_holding, net_flow_24h_usd,
        net_flow_7d_usd, market_cap_usd, token_age_days, key_metrics_json,
        guardrails_json, raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const opportunity of snapshot.opportunities) {
      insertOpportunity.run(
        opportunity.id,
        snapshot.id,
        opportunity.tokenSymbol,
        opportunity.tokenAddress,
        opportunity.chain,
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
        JSON.stringify(opportunity.rawPayload),
      );
    }
  });

  persist();
}

function parseOpportunity(record: InboxOpportunityRecord): PersistedInboxOpportunity {
  return {
    id: record.id,
    token_symbol: record.token_symbol,
    token_address: record.token_address,
    chain: record.chain,
    rank: record.rank,
    status: record.status,
    score: record.score,
    confidence: record.confidence,
    primary_thesis: record.primary_thesis,
    primary_risk: record.primary_risk,
    why_now: record.why_now,
    why_trust: record.why_trust,
    why_not: record.why_not,
    trader_count: record.trader_count,
    avg_wallet_score: record.avg_wallet_score,
    holders_still_holding: record.holders_still_holding,
    net_flow_24h_usd: record.net_flow_24h_usd,
    net_flow_7d_usd: record.net_flow_7d_usd,
    market_cap_usd: record.market_cap_usd,
    token_age_days: record.token_age_days,
    keyMetrics: JSON.parse(record.key_metrics_json),
    guardrails: JSON.parse(record.guardrails_json),
    rawPayload: JSON.parse(record.raw_payload),
  };
}

function parseDecision(record: InboxDecisionRecord): PersistedInboxDecision {
  return {
    id: record.id,
    snapshot_id: record.snapshot_id,
    opportunity_id: record.opportunity_id,
    action: record.action,
    note: record.note,
    quote_status: record.quote_status,
    quotePayload: record.quote_payload ? JSON.parse(record.quote_payload) : null,
    rawPayload: JSON.parse(record.raw_payload),
    created_at: record.created_at,
  };
}

function parseOutcome(record: InboxOutcomeRecord): PersistedInboxOutcome {
  return record;
}

export function getLatestInboxSnapshot(): PersistedInboxSnapshot | null {
  const database = getDb();
  const snapshot = database
    .prepare('SELECT * FROM inbox_snapshots ORDER BY generated_at DESC, created_at DESC LIMIT 1')
    .get() as InboxSnapshotRecord | undefined;

  if (!snapshot) return null;

  const opportunities = database
    .prepare('SELECT * FROM inbox_opportunities WHERE snapshot_id = ? ORDER BY rank ASC')
    .all(snapshot.id) as InboxOpportunityRecord[];

  return {
    id: snapshot.id,
    chain: snapshot.chain,
    status: snapshot.status,
    summary: JSON.parse(snapshot.summary_json),
    rawPayload: JSON.parse(snapshot.raw_payload),
    opportunity_count: snapshot.opportunity_count,
    blocked_count: snapshot.blocked_count,
    generated_by: snapshot.generated_by,
    generated_at: snapshot.generated_at,
    opportunities: opportunities.map(parseOpportunity),
  };
}

export function getInboxOpportunity(snapshotId: string, opportunityId: string): PersistedInboxOpportunity | null {
  const record = getDb()
    .prepare('SELECT * FROM inbox_opportunities WHERE snapshot_id = ? AND id = ?')
    .get(snapshotId, opportunityId) as InboxOpportunityRecord | undefined;

  return record ? parseOpportunity(record) : null;
}

export function getInboxDecision(decisionId: string): PersistedInboxDecision | null {
  const record = getDb()
    .prepare('SELECT * FROM inbox_decisions WHERE id = ?')
    .get(decisionId) as InboxDecisionRecord | undefined;

  return record ? parseDecision(record) : null;
}

export function createInboxDecision(decision: {
  id: string;
  snapshotId: string;
  opportunityId: string;
  action: 'skip' | 'reject' | 'mute' | 'quote';
  note?: string | null;
  quoteStatus?: string | null;
  quotePayload?: unknown | null;
  rawPayload: unknown;
}): void {
  getDb()
    .prepare(`
      INSERT INTO inbox_decisions (
        id, snapshot_id, opportunity_id, action, note, quote_status,
        quote_payload, raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      decision.id,
      decision.snapshotId,
      decision.opportunityId,
      decision.action,
      decision.note ?? null,
      decision.quoteStatus ?? null,
      decision.quotePayload ? JSON.stringify(decision.quotePayload) : null,
      JSON.stringify(decision.rawPayload),
    );
}

export function createInboxOutcome(outcome: {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  sourceSnapshotId: string;
  sourceOpportunityId: string;
  sourceDecisionId?: string | null;
  status: 'watching' | 'open' | 'closed';
  horizonLabel?: string | null;
  entryReference?: string | null;
  entryPrice?: number | null;
  amountUsd?: number | null;
  pnlPct?: number | null;
  pnlUsd?: number | null;
  baselineLabel?: string | null;
  baselineOutcome?: 'unknown' | 'beat' | 'matched' | 'lagged';
  notes?: string | null;
  openedAt: string;
  updatedAt: string;
}): void {
  getDb()
    .prepare(`
      INSERT INTO inbox_outcomes (
        id, token_symbol, token_address, chain, source_snapshot_id, source_opportunity_id,
        source_decision_id, status, horizon_label, entry_reference, entry_price, amount_usd,
        pnl_pct, pnl_usd, baseline_label, baseline_outcome, notes, opened_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      outcome.id,
      outcome.tokenSymbol,
      outcome.tokenAddress,
      outcome.chain,
      outcome.sourceSnapshotId,
      outcome.sourceOpportunityId,
      outcome.sourceDecisionId ?? null,
      outcome.status,
      outcome.horizonLabel ?? null,
      outcome.entryReference ?? null,
      outcome.entryPrice ?? null,
      outcome.amountUsd ?? null,
      outcome.pnlPct ?? null,
      outcome.pnlUsd ?? null,
      outcome.baselineLabel ?? null,
      outcome.baselineOutcome ?? 'unknown',
      outcome.notes ?? null,
      outcome.openedAt,
      outcome.updatedAt,
    );
}

export function updateInboxOutcome(outcome: {
  id: string;
  status: 'watching' | 'open' | 'closed';
  horizonLabel?: string | null;
  entryReference?: string | null;
  entryPrice?: number | null;
  amountUsd?: number | null;
  pnlPct?: number | null;
  pnlUsd?: number | null;
  baselineLabel?: string | null;
  baselineOutcome?: 'unknown' | 'beat' | 'matched' | 'lagged';
  notes?: string | null;
  updatedAt: string;
}): void {
  getDb()
    .prepare(`
      UPDATE inbox_outcomes
      SET status = ?, horizon_label = ?, entry_reference = ?, entry_price = ?, amount_usd = ?,
          pnl_pct = ?, pnl_usd = ?, baseline_label = ?, baseline_outcome = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(
      outcome.status,
      outcome.horizonLabel ?? null,
      outcome.entryReference ?? null,
      outcome.entryPrice ?? null,
      outcome.amountUsd ?? null,
      outcome.pnlPct ?? null,
      outcome.pnlUsd ?? null,
      outcome.baselineLabel ?? null,
      outcome.baselineOutcome ?? 'unknown',
      outcome.notes ?? null,
      outcome.updatedAt,
      outcome.id,
    );
}

export function getInboxOutcome(outcomeId: string): PersistedInboxOutcome | null {
  const record = getDb()
    .prepare('SELECT * FROM inbox_outcomes WHERE id = ?')
    .get(outcomeId) as InboxOutcomeRecord | undefined;

  return record ? parseOutcome(record) : null;
}

export function getLatestInboxOutcomeForToken(chain: string, tokenAddress: string): PersistedInboxOutcome | null {
  const record = getDb()
    .prepare(`
      SELECT * FROM inbox_outcomes
      WHERE chain = ? AND token_address = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `)
    .get(chain, tokenAddress) as InboxOutcomeRecord | undefined;

  return record ? parseOutcome(record) : null;
}

export function getLatestInboxOutcomesForSnapshot(snapshotId: string): PersistedInboxOutcome[] {
  const opportunities = getDb()
    .prepare('SELECT DISTINCT chain, token_address FROM inbox_opportunities WHERE snapshot_id = ?')
    .all(snapshotId) as Array<{ chain: string; token_address: string }>;

  const latest: PersistedInboxOutcome[] = [];
  for (const opportunity of opportunities) {
    const outcome = getLatestInboxOutcomeForToken(opportunity.chain, opportunity.token_address);
    if (outcome) {
      latest.push(outcome);
    }
  }

  return latest.sort((left, right) => {
    if (left.updated_at === right.updated_at) {
      return right.created_at.localeCompare(left.created_at);
    }
    return right.updated_at.localeCompare(left.updated_at);
  });
}

export function getRecentInboxDecisions(limit: number = 6): PersistedInboxDecision[] {
  const records = getDb()
    .prepare('SELECT * FROM inbox_decisions ORDER BY created_at DESC LIMIT ?')
    .all(limit) as InboxDecisionRecord[];

  return records.map(parseDecision);
}

export function getRecentInboxDecisionsForSnapshot(snapshotId: string, limit: number = 6): PersistedInboxDecision[] {
  const records = getDb()
    .prepare('SELECT * FROM inbox_decisions WHERE snapshot_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(snapshotId, limit) as InboxDecisionRecord[];

  return records.map(parseDecision);
}

export function getCurrentSchemaVersion(): number {
  return getDb().pragma('user_version', { simple: true }) as number;
}

export function resetDbConnectionForTests() {
  db?.close();
  db = null;
  currentDbPath = null;
}
