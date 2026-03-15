import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, { tls: {}, maxRetriesPerRequest: 3 });

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
    // SADD returns 1 if added, 0 if already a member — built-in dedup
    const added = await redis.sadd('waitlist', normalizedEmail);

    if (added === 0) {
      // Already signed up — return success silently
      return res.status(200).json({ ok: true, message: 'Signed up!' });
    }

    // Store signup timestamp keyed by email
    await redis.hset('waitlist_meta', normalizedEmail, Date.now());

    return res.status(200).json({ ok: true, message: 'Signed up!' });

  } catch (err) {
    console.error('[waitlist] Redis error:', err);
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }
}
