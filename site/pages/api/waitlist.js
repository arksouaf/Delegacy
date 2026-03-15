import { Redis } from '@upstash/redis';

function getRedis() {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL not set');
  const u = new URL(REDIS_URL);
  return new Redis({ url: `https://${u.hostname}`, token: decodeURIComponent(u.password) });
}

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

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const redis = getRedis();
    // SADD returns 1 if new member, 0 if duplicate
    const added = await redis.sadd('waitlist', normalizedEmail);
    if (added === 0) return res.status(200).json({ ok: true, message: 'Signed up!' });
    await redis.hset('waitlist_meta', { [normalizedEmail]: Date.now() });
    return res.status(200).json({ ok: true, message: 'Signed up!' });
  } catch (err) {
    console.error('[waitlist]', err.message);
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }
}
