// Parses rediss://default:TOKEN@hostname:port → { baseUrl, token }
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

  const cfg = parseRedisUrl(process.env.REDIS_URL);
  if (!cfg) {
    console.error('[waitlist] REDIS_URL not set or invalid');
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }

  try {
    // SADD returns 1 if new, 0 if duplicate
    const { result: added } = await redisCmd(cfg.baseUrl, cfg.token, 'sadd', 'waitlist', normalizedEmail);

    if (added === 0) {
      return res.status(200).json({ ok: true, message: 'Signed up!' });
    }

    // Store signup timestamp
    await redisCmd(cfg.baseUrl, cfg.token, 'hset', 'waitlist_meta', normalizedEmail, Date.now());

    return res.status(200).json({ ok: true, message: 'Signed up!' });

  } catch (err) {
    console.error('[waitlist] Redis error:', err);
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }
}
