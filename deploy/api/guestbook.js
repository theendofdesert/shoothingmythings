// 방명록 API — 글을 GitHub 저장소의 별도 브랜치(guestbook)에 data/guestbook.json 으로 저장합니다.
// 필요한 Vercel 환경변수: GITHUB_TOKEN, GITHUB_REPO (예: myname/invitation)
// 선택: GUESTBOOK_BRANCH (기본 guestbook)

const API = 'https://api.github.com';
const FILE = 'data/guestbook.json';

function gh(path, opts = {}) {
  return fetch(API + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'invitation-guestbook',
      ...(opts.headers || {}),
    },
  });
}

const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const unb64 = s => Buffer.from(s, 'base64').toString('utf8');

async function ensureBranch(repo, branch) {
  const r = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
  if (r.ok) return;
  const info = await (await gh(`/repos/${repo}`)).json();
  const base = await (await gh(`/repos/${repo}/git/ref/heads/${info.default_branch}`)).json();
  await gh(`/repos/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }),
  });
}

async function readEntries(repo, branch) {
  const r = await gh(`/repos/${repo}/contents/${FILE}?ref=${branch}`);
  if (r.status === 404) return { entries: [], sha: undefined };
  if (!r.ok) throw new Error('read ' + r.status);
  const j = await r.json();
  return { entries: JSON.parse(unb64(j.content.replace(/\n/g, ''))), sha: j.sha };
}

function todayKST() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
}

module.exports = async (req, res) => {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GUESTBOOK_BRANCH || 'guestbook';
  if (!repo || !process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'not configured' });

  try {
    await ensureBranch(repo, branch);

    if (req.method === 'GET') {
      const { entries } = await readEntries(repo, branch);
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = String(body.name || '').trim().slice(0, 20);
      const msg = String(body.msg || '').trim().slice(0, 200);
      if (!name || !msg || body.website) return res.status(400).json({ error: 'invalid' });

      const entry = { name, msg, date: todayKST(), t: Date.now() };
      for (let attempt = 0; attempt < 3; attempt++) {
        const { entries, sha } = await readEntries(repo, branch);
        const next = [entry, ...entries].slice(0, 1000);
        const w = await gh(`/repos/${repo}/contents/${FILE}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: `guestbook: ${name}`,
            content: b64(JSON.stringify(next, null, 2)),
            branch,
            sha,
          }),
        });
        if (w.ok) return res.status(200).json({ entries: next });
        if (w.status !== 409 && w.status !== 422) throw new Error('write ' + w.status);
      }
      return res.status(409).json({ error: 'busy' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    return res.status(500).json({ error: 'server' });
  }
};
