// 방명록 API — 글을 GitHub 저장소의 별도 브랜치(guestbook)에 data/guestbook.json 으로 저장합니다.
// 필요한 Vercel 환경변수: GITHUB_TOKEN, GITHUB_REPO (예: myname/invitation)
// 선택: GUESTBOOK_BRANCH (기본 guestbook)
// 점검: 브라우저에서 /api/guestbook?check=1 을 열면 연결 상태를 보여줍니다.

const API = 'https://api.github.com';
const FILE = 'data/guestbook.json';

function gh(path, opts = {}) {
  return fetch(API + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${String(process.env.GITHUB_TOKEN || '').trim()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'invitation-guestbook',
      ...(opts.headers || {}),
    },
  });
}

const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const unb64 = s => Buffer.from(s, 'base64').toString('utf8');
const repoName = () => String(process.env.GITHUB_REPO || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');

async function fail(step, r) {
  let m = '';
  try { m = (await r.json()).message || ''; } catch (e) {}
  const err = new Error(`${step} ${r.status} ${m}`.trim());
  err.step = step; err.status = r.status;
  throw err;
}

async function ensureBranch(repo, branch) {
  const r = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
  if (r.ok) return;
  if (r.status !== 404) await fail('branch-check', r);
  const ir = await gh(`/repos/${repo}`);
  if (!ir.ok) await fail('repo', ir);
  const info = await ir.json();
  const br = await gh(`/repos/${repo}/git/ref/heads/${info.default_branch}`);
  if (!br.ok) await fail('base-branch', br);
  const base = await br.json();
  const cr = await gh(`/repos/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }),
  });
  if (!cr.ok && cr.status !== 422) await fail('branch-create', cr);
}

async function readEntries(repo, branch) {
  const r = await gh(`/repos/${repo}/contents/${FILE}?ref=${branch}`);
  if (r.status === 404) return { entries: [], sha: undefined };
  if (!r.ok) await fail('read', r);
  const j = await r.json();
  return { entries: JSON.parse(unb64(j.content.replace(/\n/g, ''))), sha: j.sha };
}

function todayKST() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
}

async function check(repo, branch) {
  const out = { repo, branch, token: !!process.env.GITHUB_TOKEN };
  const ir = await gh(`/repos/${repo}`);
  out.repoStatus = ir.status;
  if (ir.ok) {
    const info = await ir.json();
    out.canWrite = !!(info.permissions && info.permissions.push);
    out.defaultBranch = info.default_branch;
  } else {
    try { out.repoMessage = (await ir.json()).message; } catch (e) {}
  }
  const b = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
  out.branchExists = b.ok;
  try { await ensureBranch(repo, branch); out.branchReady = true; } catch (e) { out.branchReady = false; out.branchError = e.message; }
  return out;
}

module.exports = async (req, res) => {
  const repo = repoName();
  const branch = process.env.GUESTBOOK_BRANCH || 'guestbook';
  if (!repo || !process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'not configured' });

  try {
    if (req.method === 'GET' && req.query && req.query.check) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(await check(repo, branch));
    }

    if (req.method === 'GET') {
      const r = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
      const { entries } = r.ok ? await readEntries(repo, branch) : { entries: [] };
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      await ensureBranch(repo, branch);
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
            ...(sha ? { sha } : {}),
          }),
        });
        if (w.ok) return res.status(200).json({ entries: next });
        if (w.status !== 409 && w.status !== 422) await fail('write', w);
      }
      return res.status(409).json({ error: 'busy' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (e) {
    console.error('guestbook', e.message);
    return res.status(500).json({ error: 'server', detail: e.message });
  }
};
