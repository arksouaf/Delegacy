async function redis(command, ...args) {
  const url  = process.env.UPSTASH_REDIS_REST_URL;
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
    // SADD returns 1 if new, 0 if duplicate
    const added = await redis('SADD', 'waitlist', normalizedEmail);
    if (added === 0) return res.status(200).json({ ok: true, message: 'Signed up!' });

    await redis('HSET', 'waitlist_meta', normalizedEmail, Date.now());
    return res.status(200).json({ ok: true, message: 'Signed up!' });

  } catch (err) {
    console.error('[waitlist] error:', err.message);
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }
}
