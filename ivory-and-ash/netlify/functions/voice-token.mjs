// Mints a short-lived xAI token so the browser can open a Grok Voice session
// without ever seeing the API key. Set XAI_API_KEY in the host's environment variables.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Only this site's own pages may ask for a token.
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(req.url).host) return json(403, { error: 'forbidden' });
    } catch {
      return json(403, { error: 'forbidden' });
    }
  }

  const key = process.env.XAI_API_KEY;
  if (!key) return json(503, { error: 'not_configured' });

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (limited(ip)) return json(429, { error: 'too_many_requests' });

  try {
    const res = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expires_after: { seconds: 120 } }),
    });
    if (!res.ok) {
      console.error('xAI token request failed', res.status, await res.text());
      return json(502, { error: 'upstream_error' });
    }
    const data = await res.json();
    if (!data.value) return json(502, { error: 'upstream_error' });
    return json(200, { token: data.value, expiresAt: data.expires_at });
  } catch (err) {
    console.error('xAI token request failed', err);
    return json(502, { error: 'upstream_error' });
  }
};

export const config = { path: '/api/voice-token' };
