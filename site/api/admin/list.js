import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, { tls: {}, maxRetriesPerRequest: 3 });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.query.secret || req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const emails = await redis.smembers('waitlist');
    const metaRaw = await redis.hgetall('waitlist_meta') ?? {};

    const waitlist = (emails ?? []).map((email) => ({
      email,
      signedUpAt: metaRaw[email] ? new Date(Number(metaRaw[email])).toISOString() : null,
    })).sort((a, b) => (a.signedUpAt > b.signedUpAt ? -1 : 1));

    return res.status(200).json({ total: waitlist.length, waitlist });

  } catch (err) {
    console.error('[admin/list] error:', err);
    return res.status(500).json({ error: 'Failed to fetch waitlist.' });
  }
}
