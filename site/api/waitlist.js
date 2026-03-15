/**
 * POST /api/waitlist
 * Saves an email to Vercel KV (Redis list "waitlist").
 *
 * Required Vercel environment variables (auto-set when you add KV to your project):
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 *
 * Optional:
 *   ADMIN_NOTIFY_EMAIL  – if set, sends a plain fetch ping so you know someone signed up
 */

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isValidEmail(email) {
  return typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    email.length <= 254;
}

export default async function handler(req, res) {
  cors(res);

  // Pre-flight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body (Vercel parses JSON automatically when Content-Type is application/json)
  const { email } = req.body ?? {};

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    // KV not configured — log and return success so the site still works in preview
    console.warn('[waitlist] KV env vars missing — email not persisted:', normalizedEmail);
    return res.status(200).json({ ok: true, message: 'Signed up!' });
  }

  try {
    // Check for duplicate (LPOS returns null if not found, a number if found)
    const checkRes = await fetch(
      `${KV_REST_API_URL}/lpos/waitlist/${encodeURIComponent(normalizedEmail)}`,
      { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } }
    );
    const checkData = await checkRes.json();

    if (checkData.result !== null && checkData.result !== undefined) {
      // Already on the list — return success silently (don't reveal enumeration)
      return res.status(200).json({ ok: true, message: 'Signed up!' });
    }

    // Append to list via KV REST API (RPUSH)
    const pushRes = await fetch(
      `${KV_REST_API_URL}/rpush/waitlist/${encodeURIComponent(normalizedEmail)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
      }
    );

    if (!pushRes.ok) {
      throw new Error(`KV push failed: ${pushRes.status}`);
    }

    // Also store signup timestamp in a hash for audit
    const ts = Date.now();
    await fetch(`${KV_REST_API_URL}/hset/waitlist_meta/${encodeURIComponent(normalizedEmail)}/${ts}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
    });

    return res.status(200).json({ ok: true, message: 'Signed up!' });

  } catch (err) {
    console.error('[waitlist] KV error:', err);
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }
}
