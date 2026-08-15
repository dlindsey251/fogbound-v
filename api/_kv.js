export function getKvConfig() {
  return {
    base:
      process.env.KV_REST_API_URL
      || process.env.UPSTASH_REDIS_REST_URL
      || process.env.UPSTASH_REDIS_REST_URL_KV_REST_API_URL,
    token:
      process.env.KV_REST_API_TOKEN
      || process.env.UPSTASH_REDIS_REST_TOKEN
      || process.env.UPSTASH_REDIS_REST_URL_KV_REST_API_TOKEN,
  };
}

export async function kvCommand(command, ...args) {
  const { base, token } = getKvConfig();
  if (!base || !token) throw new Error('KV is not configured');
  const path = [command, ...args].map((part) => encodeURIComponent(part)).join('/');
  const r = await fetch(`${base}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`KV ${command} failed (${r.status})`);
  const data = await r.json();
  return data?.result ?? null;
}

export async function kvGet(key) {
  return kvCommand('get', key);
}

export async function kvSet(key, value) {
  return kvCommand('set', key, value);
}
