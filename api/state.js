// Vercel serverless function: GET/PUT the saved habit tracker at /api/state
// Storage: one row in a Postgres table (Neon, added from Vercel's Storage tab).
// Every save carries a version number so two devices can't silently
// overwrite each other — a stale save gets a 409 with the newer copy.
import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const ROW_ID = 'main';
const DB_URL = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;
const MAX_BYTES = 2_000_000;
let ready = null;

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();
const passcodeOk = (given) => {
  const expected = process.env.APP_PASSCODE;
  if (!expected || !given) return false;
  return crypto.timingSafeEqual(hash(given), hash(expected));
};

async function db() {
  const sql = neon(DB_URL());
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS habit_state (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      version integer NOT NULL DEFAULT 1,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`.catch((e) => { ready = null; throw e; });
  }
  await ready;
  return sql;
}

const current = async (sql) => {
  const rows = await sql`SELECT data, version, updated_at FROM habit_state WHERE id = ${ROW_ID}`;
  return rows[0] ? { data: rows[0].data, version: rows[0].version, updatedAt: rows[0].updated_at } : { data: null, version: 0 };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const missing = [!DB_URL() && 'DATABASE_URL', !process.env.APP_PASSCODE && 'APP_PASSCODE'].filter(Boolean);
  if (missing.length) return res.status(500).json({ error: 'not_configured', missing });

  if (!passcodeOk(req.headers['x-passcode'])) {
    await new Promise(r => setTimeout(r, 600)); // slow down guessing
    return res.status(401).json({ error: 'bad_passcode' });
  }

  try {
    const sql = await db();

    if (req.method === 'GET') return res.status(200).json(await current(sql));

    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
      const data = body && body.data;
      const version = Number(body && body.version);
      if (!data || typeof data !== 'object' || !Array.isArray(data.habits) || !data.days || typeof data.days !== 'object' || !Number.isInteger(version) || version < 0) {
        return res.status(400).json({ error: 'bad_request' });
      }
      const json = JSON.stringify(data);
      if (json.length > MAX_BYTES) return res.status(413).json({ error: 'too_large' });

      const rows = version === 0
        ? await sql`INSERT INTO habit_state (id, data, version) VALUES (${ROW_ID}, ${json}::jsonb, 1)
                    ON CONFLICT (id) DO NOTHING RETURNING version`
        : await sql`UPDATE habit_state SET data = ${json}::jsonb, version = version + 1, updated_at = now()
                    WHERE id = ${ROW_ID} AND version = ${version} RETURNING version`;

      if (!rows.length) return res.status(409).json({ error: 'conflict', ...(await current(sql)) });
      return res.status(200).json({ version: rows[0].version });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db_error', message: e.message });
  }
}
