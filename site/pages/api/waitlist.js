import Redis from 'ioredis';

function isValidEmail(email) {
  return typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    email.length <= 254;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body ?? {};
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const redisUrl = process.env.KV_URL || process.env.REDIS_URL;
  if (!redisUrl) return res.status(500).json({ error: 'No Redis URL configured.' });

  const normalizedEmail = email.trim().toLowerCase();

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    lazyConnect: true,
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
  });
  redis.on('error', () => {});

  try {
    await redis.connect();
    const added = await redis.sadd('waitlist', normalizedEmail);
    if (added > 0) {
      await redis.hset('waitlist_meta', normalizedEmail, String(Date.now()));
    }
    return res.status(200).json({ ok: true, message: 'Signed up!' });
  } catch (err) {
    console.error('[waitlist]', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    redis.disconnect();
  }
}
