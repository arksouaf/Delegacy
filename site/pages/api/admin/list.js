import { Redis } from '@upstash/redis';

function getRedis() {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL not set');
  const u = new URL(REDIS_URL);
  return new Redis({ url: `https://${u.hostname}`, token: decodeURIComponent(u.password) });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!req.query.secret || req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const redis = getRedis();
    const emails = (await redis.smembers('waitlist')) ?? [];
    const meta   = (await redis.hgetall('waitlist_meta')) ?? {};

    const waitlist = emails.map((email) => ({
      email,
      signedUpAt: meta[email] ? new Date(Number(meta[email])).toISOString() : null,
    })).sort((a, b) => (a.signedUpAt > b.signedUpAt ? -1 : 1));

    return res.status(200).json({ total: waitlist.length, waitlist });
  } catch (err) {
    console.error('[admin/list]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
