import Redis from 'ioredis';

function makeRedis() {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL not configured');
  const client = new Redis(REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000, lazyConnect: true });
  client.on('error', () => {});
  return client;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!req.query.secret || req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const redis = makeRedis();
    await redis.connect();
    const emails = (await redis.smembers('waitlist')) ?? [];
    const meta   = (await redis.hgetall('waitlist_meta')) ?? {};
    redis.disconnect();

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
