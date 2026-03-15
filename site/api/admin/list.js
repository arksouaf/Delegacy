/**
 * GET /api/admin/list
 * Returns the full waitlist as JSON.
 *
 * Protected by ADMIN_SECRET env var.
 * Usage: GET /api/admin/list?secret=YOUR_ADMIN_SECRET
 *
 * Required env vars (same KV vars as waitlist.js):
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 *   ADMIN_SECRET   – set this to a strong random string in Vercel project settings
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check — constant-time comparison is not needed here since
  // this is a simple admin tool, not user-facing auth
  const secret = req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'KV not configured' });
  }

  try {
    // LRANGE waitlist 0 -1 returns all entries
    const listRes = await fetch(`${KV_REST_API_URL}/lrange/waitlist/0/-1`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });

    if (!listRes.ok) {
      throw new Error(`KV fetch failed: ${listRes.status}`);
    }

    const { result: emails } = await listRes.json();

    // Fetch timestamps from the hash
    const metaRes = await fetch(`${KV_REST_API_URL}/hgetall/waitlist_meta`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });
    const metaData = await metaRes.json();
    const meta = metaData.result ?? [];

    // KV hgetall returns [key, value, key, value, ...]
    const timestamps = {};
    for (let i = 0; i < meta.length; i += 2) {
      timestamps[decodeURIComponent(meta[i])] = parseInt(meta[i + 1], 10);
    }

    const enriched = (emails ?? []).map((email) => {
      const decoded = decodeURIComponent(email);
      const ts = timestamps[decoded];
      return {
        email: decoded,
        signedUpAt: ts ? new Date(ts).toISOString() : null,
      };
    });

    return res.status(200).json({
      total: enriched.length,
      waitlist: enriched,
    });

  } catch (err) {
    console.error('[admin/list] error:', err);
    return res.status(500).json({ error: 'Failed to fetch waitlist.' });
  }
}
