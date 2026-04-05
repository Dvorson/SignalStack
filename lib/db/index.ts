import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'signalstack.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
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
  parts: string; // JSON string
  created_at: string;
}

export function createChat(id: string, title: string = 'New chat'): Chat {
  const d = getDb();
  d.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run(id, title);
  return d.prepare('SELECT * FROM chats WHERE id = ?').get(id) as Chat;
}

export function listChats(): Chat[] {
  const d = getDb();
  return d.prepare('SELECT * FROM chats ORDER BY updated_at DESC').all() as Chat[];
}

export function getChat(id: string): Chat | null {
  const d = getDb();
  return (d.prepare('SELECT * FROM chats WHERE id = ?').get(id) as Chat) || null;
}

export function deleteChat(id: string): void {
  const d = getDb();
  d.prepare('DELETE FROM chats WHERE id = ?').run(id);
}

export function updateChatTitle(id: string, title: string): void {
  const d = getDb();
  d.prepare('UPDATE chats SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, id);
}

export function touchChat(id: string): void {
  const d = getDb();
  d.prepare('UPDATE chats SET updated_at = datetime(\'now\') WHERE id = ?').run(id);
}

export function saveMessage(id: string, chatId: string, role: string, parts: unknown[]): void {
  const d = getDb();
  d.prepare('INSERT OR REPLACE INTO messages (id, chat_id, role, parts) VALUES (?, ?, ?, ?)').run(
    id, chatId, role, JSON.stringify(parts)
  );
  touchChat(chatId);
}

export function getMessages(chatId: string): DBMessage[] {
  const d = getDb();
  return d.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId) as DBMessage[];
}

export function getMessageCount(chatId: string): number {
  const d = getDb();
  const result = d.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(chatId) as { count: number };
  return result.count;
}
