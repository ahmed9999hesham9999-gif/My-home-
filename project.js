const { redis, configured, authorized } = require('./_db');
const KEY = 'apartment:project';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) return res.status(500).json({ error: 'database not configured' });
  if (!authorized(req)) return res.status(401).json({ error: 'auth' });
  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', KEY]);
      if (!raw) return res.status(200).json(null);
      const d = JSON.parse(raw);
      if (req.query.since && Number(req.query.since) === d.ts) return res.status(200).json({ same: true });
      return res.status(200).json(d);
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!b || typeof b.json !== 'string' || b.json.length > 900000) return res.status(400).json({ error: 'bad or too large' });
      const d = { json: b.json, by: String(b.by || '').slice(0, 40), ts: Date.now() };
      const str = JSON.stringify(d);
      await redis(['SET', KEY, str]);
      // نسخة احتياطية كل ساعة (أول حفظ في الساعة)، بتتمسح بعد يومين
      await redis(['SET', 'apartment:bk:' + Math.floor(Date.now() / 3600000), str, 'NX', 'EX', '172800']).catch(() => {});
      return res.status(200).json({ ts: d.ts });
    }
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
