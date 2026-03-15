async function redis(command, ...args) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('UPSTASH env vars not set');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command, ...args]),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}: ${await res.text()}`);
  const { result } = await res.json();
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.query.secret || req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const emails  = await redis('SMEMBERS', 'waitlist') ?? [];
    const metaFlat = await redis('HGETALL', 'waitlist_meta') ?? [];

    // HGETALL returns [field, value, field, value, ...]
    const meta = {};
    for (let i = 0; i < metaFlat.length; i += 2) meta[metaFlat[i]] = metaFlat[i + 1];

    const waitlist = emails.map((email) => ({
      email,
      signedUpAt: meta[email] ? new Date(Number(meta[email])).toISOString() : null,
    })).sort((a, b) => (a.signedUpAt > b.signedUpAt ? -1 : 1));

    return res.status(200).json({ total: waitlist.length, waitlist });

  } catch (err) {
    console.error('[admin/list] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
