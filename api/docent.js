// 현장 도슨트 예약 API — 네트워킹 신청과 같은 Apps Script(같은 스프레드시트)의 '도슨트 예약' 탭으로 전달합니다.
// Vercel 환경변수는 기존 PARTY_SCRIPT_URL, PARTY_SECRET 을 그대로 씁니다. (따로 쓰려면 DOCENT_SCRIPT_URL, DOCENT_SECRET)

const scriptUrl = () => String(process.env.DOCENT_SCRIPT_URL || process.env.PARTY_SCRIPT_URL || '').trim();
const secret = () => String(process.env.DOCENT_SECRET || process.env.PARTY_SECRET || '').trim().replace(/^['"]|['"]$/g, '');
const clean = (v, n) => String(v || '').replace(/[\r\t]/g, ' ').trim().slice(0, n);
const WEEKDAY = ['19:30'];
const WEEKEND = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

async function callScript(payload) {
  let r = await fetch(scriptUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, secret: secret() }), redirect: 'manual' });
  for (let i = 0; i < 4 && r.status >= 300 && r.status < 400; i++) {
    const loc = r.headers.get('location'); if (!loc) break;
    r = await fetch(new URL(loc, scriptUrl()).toString(), { method: 'GET', redirect: 'manual' });
  }
  const text = await r.text();
  try { return JSON.parse(text); } catch (e) { throw new Error(text.includes('accounts.google.com') ? 'script-login' : 'script-' + r.status); }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  if (!scriptUrl() || !secret()) return res.status(500).json({ error: 'not-configured' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const date = clean(b.date, 10), time = clean(b.time, 5);
    const m = /^2026-11-(\d{2})$/.exec(date); const day = m ? Number(m[1]) : 0;
    if (!day || day > 30) return res.status(400).json({ error: 'date' });
    const dow = new Date(Date.UTC(2026, 10, day)).getUTCDay();
    if ((dow === 0 || dow === 6 ? WEEKEND : WEEKDAY).indexOf(time) < 0) return res.status(400).json({ error: 'time' });
    const row = { date, time, name: clean(b.name, 20), phone: clean(b.phone, 13), request: clean(b.request, 300), etc: clean(b.etc, 300) };
    if (!b.agree || !row.name || row.phone.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'invalid' });
    const d = await callScript({ action: 'docent', row });
    if (d.error === 'auth') return res.status(500).json({ error: 'secret-mismatch' });
    if (d.ok) return res.status(200).json({ ok: true });
    return res.status(400).json({ error: d.error || 'script' });
  } catch (e) {
    console.error('docent', e.message);
    return res.status(500).json({ error: e.message || 'server' });
  }
};
