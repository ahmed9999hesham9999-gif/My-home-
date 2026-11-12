// اتصال بقاعدة Upstash Redis عبر REST (بدون أي مكتبات). المتغيرات بتتضاف تلقائيًا لما تربط القاعدة بمشروع Vercel.
const crypto = require('crypto');
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const PASS = process.env.APP_PASSWORD || '';
const configured = () => !!(URL_ && TOKEN);
async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}
function authorized(req) {
  if (!PASS) return true;
  const a = Buffer.from(String(req.headers['x-pass'] || '')), b = Buffer.from(PASS);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = { redis, configured, authorized, PASS };
