import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempDir = '';
let dbPath = '';

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'signalstack-db-'));
  dbPath = path.join(tempDir, 'signalstack.test.db');
  process.env.SIGNALSTACK_DB_PATH = dbPath;
});

afterEach(async () => {
  try {
    const dbModule = await import('@/lib/db');
    dbModule.resetDbConnectionForTests();
  } catch {
    // Ignore cleanup failures when the module was never loaded.
  }

  delete process.env.SIGNALSTACK_DB_PATH;
  vi.resetModules();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('sqlite migrations', () => {
  it('upgrades the chat-only schema without losing existing chats or messages', async () => {
    const rawDb = new Database(dbPath);
    rawDb.exec(`
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
    `);
    rawDb.pragma('user_version = 1');
    rawDb.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run('chat-1', 'Old chat');
    rawDb.prepare('INSERT INTO messages (id, chat_id, role, parts) VALUES (?, ?, ?, ?)').run(
      'msg-1',
      'chat-1',
      'user',
      JSON.stringify([{ type: 'text', text: 'hello' }]),
    );
    rawDb.close();

    const dbModule = await import('@/lib/db');

    expect(dbModule.getCurrentSchemaVersion()).toBe(3);
    expect(dbModule.listChats()).toHaveLength(1);
    expect(dbModule.listChats()[0]?.title).toBe('Old chat');
    expect(dbModule.getMessages('chat-1')).toHaveLength(1);

    dbModule.saveInboxSnapshot({
      id: 'snapshot-1',
      chain: 'solana',
      status: 'ready',
      summary: {
        headline: 'One opportunity',
        subheadline: 'Snapshot preserved after migration.',
        counts: { total: 1, ready: 1, blocked: 0, degraded: 0 },
        topScore: 90,
        topSymbol: 'ALPHA',
      },
      rawPayload: { seeded: true },
      opportunityCount: 1,
      blockedCount: 0,
      generatedAt: new Date().toISOString(),
      opportunities: [
        {
          id: 'opp-1',
          tokenSymbol: 'ALPHA',
          tokenAddress: 'alpha-token',
          chain: 'solana',
          rank: 1,
          status: 'ready',
          score: 90,
          confidence: 'high',
          primaryThesis: 'Test thesis',
          primaryRisk: 'Test risk',
          whyNow: 'Now',
          whyTrust: 'Trust',
          whyNot: 'Risk',
          traderCount: 5,
          avgWalletScore: 72,
          holdersStillHolding: 3,
          netFlow24hUsd: 100_000,
          netFlow7dUsd: 500_000,
          marketCapUsd: 5_000_000,
          tokenAgeDays: 20,
          keyMetrics: [],
          guardrails: [],
          rawPayload: { seeded: true },
        },
      ],
    });

    const latestSnapshot = dbModule.getLatestInboxSnapshot();
    expect(latestSnapshot?.id).toBe('snapshot-1');
    expect(latestSnapshot?.opportunities).toHaveLength(1);

    dbModule.createInboxOutcome({
      id: 'outcome-1',
      tokenSymbol: 'ALPHA',
      tokenAddress: 'alpha-token',
      chain: 'solana',
      sourceSnapshotId: 'snapshot-1',
      sourceOpportunityId: 'opp-1',
      status: 'open',
      horizonLabel: 'intraday',
      entryReference: 'Inbox quote',
      entryPrice: 0.42,
      amountUsd: 20,
      baselineLabel: 'No-trade baseline',
      baselineOutcome: 'unknown',
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const latestOutcome = dbModule.getLatestInboxOutcomeForToken('solana', 'alpha-token');
    expect(latestOutcome?.id).toBe('outcome-1');
    expect(dbModule.getLatestInboxOutcomesForSnapshot('snapshot-1')).toHaveLength(1);
  });
});
