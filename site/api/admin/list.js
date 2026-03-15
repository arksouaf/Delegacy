function parseRedisUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return { baseUrl: `https://${u.hostname}`, token: decodeURIComponent(u.password) };
  } catch {
    return null;
  }
}

async function redisCmd(baseUrl, token, ...parts) {
  const path = parts.map(p => encodeURIComponent(String(p))).join('/');
  const res = await fetch(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.query.secret || req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const cfg = parseRedisUrl(process.env.REDIS_URL);
  if (!cfg) return res.status(500).json({ error: 'Redis not configured' });

  try {
    const { result: emails } = await redisCmd(cfg.baseUrl, cfg.token, 'smembers', 'waitlist');
    const { result: metaFlat } = await redisCmd(cfg.baseUrl, cfg.token, 'hgetall', 'waitlist_meta');

    // hgetall returns [field, value, field, value, ...]
    const meta = {};
    if (Array.isArray(metaFlat)) {
      for (let i = 0; i < metaFlat.length; i += 2) meta[metaFlat[i]] = metaFlat[i + 1];
    }

    const waitlist = (emails ?? []).map((email) => ({
      email,
      signedUpAt: meta[email] ? new Date(Number(meta[email])).toISOString() : null,
    })).sort((a, b) => (a.signedUpAt > b.signedUpAt ? -1 : 1));

    return res.status(200).json({ total: waitlist.length, waitlist });

  } catch (err) {
    console.error('[admin/list] error:', err);
    return res.status(500).json({ error: 'Failed to fetch waitlist.' });
  }
}
