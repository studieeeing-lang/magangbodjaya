import { eq, sql } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { documents } from '../../db/schema.js';

export default async (req: Request) => {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const db = database();
    if (req.method === 'GET') {
      const rows = await db.select().from(documents);
      return Response.json({ ok: true, data: Object.fromEntries(rows.map(row => [row.path, row.data])) }, { headers });
    }
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET, POST' } });
    const raw = await req.text();
    if (raw.length > 100000) return Response.json({ ok: false }, { status: 413, headers });
    let body;
    try { body = JSON.parse(raw); } catch { return Response.json({ ok: false }, { status: 400, headers }); }
    const { path, data, merge } = body || {};
    if (typeof path !== 'string' || !/^(companies|progress)\/[a-zA-Z0-9_-]{1,100}$/.test(path) ||
        (data !== null && (typeof data !== 'object' || Array.isArray(data)))) {
      return Response.json({ ok: false }, { status: 400, headers });
    }
    if (data === null) {
      await db.delete(documents).where(eq(documents.path, path));
    } else {
      await db.insert(documents).values({ path, data }).onConflictDoUpdate({
        target: documents.path,
        set: { data: merge ? sql`${documents.data} || ${JSON.stringify(data)}::jsonb` : data },
      });
    }
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false, error: 'Penyimpanan bersama tidak tersedia. Coba lagi.' }, { status: 503, headers });
  }
};
