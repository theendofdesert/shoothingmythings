// 네트워킹 파티 신청 API — 구글 스프레드시트(Apps Script)로 전달합니다.
// 필요한 Vercel 환경변수: PARTY_SCRIPT_URL (Apps Script 웹앱 주소), PARTY_SECRET (Apps Script 와 같은 비밀값)
// 점검: 브라우저에서 /api/party?check=1 을 열면 연결 상태를 보여줍니다.

const MAX = 35;
const END = Date.parse('2026-11-05T23:59:59+09:00');

const scriptUrl = () => String(process.env.PARTY_SCRIPT_URL || '').trim();
const secret = () => String(process.env.PARTY_SECRET || '').trim().replace(/^['"]|['"]$/g, '');

async function rawCall(payload) {
  const r = await fetch(scriptUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, secret: secret() }),
    redirect: 'follow',
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: r.status, finalUrl: r.url, contentType: r.headers.get('content-type'), text, json };
}

async function callScript(payload) {
  const r = await rawCall(payload);
  if (!r.json) {
    const err = new Error(r.text.includes('accounts.google.com') || r.text.includes('ServiceLogin') ? 'script-login' : `script-${r.status}`);
    throw err;
  }
  if (r.json.error === 'auth') throw new Error('secret-mismatch');
  return r.json;
}

async function check() {
  const url = scriptUrl();
  const out = {
    hasUrl: !!url,
    hasSecret: !!secret(),
    urlLooksRight: /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url),
    urlEnd: url ? url.slice(-12) : '',
  };
  if (!url) return out;
  try {
    const r = await rawCall({ action: 'count' });
    out.scriptStatus = r.status;
    out.contentType = r.contentType;
    out.gotJson = !!r.json;
    if (r.json) {
      out.secretOk = r.json.error !== 'auth';
      if (typeof r.json.count === 'number') out.count = r.json.count;
      if (r.json.error) out.scriptError = r.json.error;
    } else {
      out.needsLogin = r.text.includes('accounts.google.com') || r.text.includes('ServiceLogin');
      out.preview = r.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    }
  } catch (e) {
    out.fetchError = e.message;
  }
  return out;
}

const clean = (v, n) => String(v || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.query && req.query.check) return res.status(200).json(await check());
  if (!scriptUrl() || !secret()) return res.status(500).json({ error: 'not-configured' });
  try {
    if (req.method === 'GET') {
      const d = await callScript({ action: 'count' });
      return res.status(200).json({ count: d.count || 0 });
    }
    if (req.method === 'POST') {
      if (Date.now() > END) return res.status(400).json({ error: 'closed' });
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const row = {
        name: clean(b.name, 20), phone: clean(b.phone, 13), birth: clean(b.birth, 8), job: clean(b.job, 30),
        area: clean(b.area, 40), bank: clean(b.bank, 20), acct: clean(b.acct, 20).replace(/\D/g, ''), holder: clean(b.holder, 20), payer: clean(b.payer, 20),
      };
      const missing = Object.keys(row).filter(k => !row[k]);
      if (!b.agree || missing.length) return res.status(400).json({ error: 'invalid', missing });
      const d = await callScript({ action: 'apply', max: MAX, row });
      if (d.ok) return res.status(200).json({ ok: true, count: d.count });
      return res.status(400).json({ error: d.error || 'script', count: d.count });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    console.error('party', e.message);
    return res.status(500).json({ error: e.message || 'server' });
  }
};
