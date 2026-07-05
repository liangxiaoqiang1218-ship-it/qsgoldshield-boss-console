const readFeed = async (path) => {
  const res = await fetch(path + '?ts=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error(path + ' ' + res.status);
  return res.json();
};

const putRows = (id, rows) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = rows.join('');
};

const putText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
};

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));

async function feedBoss(){
  if (!document.getElementById('bossCards')) return;
  try {
    const data = await readFeed('data/boss.json');
    putText('bossSummary', data.summary || '');
    putRows('bossCards', (data.cards || []).map(x => `<a class="card" href="${esc(x.href || '#')}"><h3>${esc(x.name)}</h3><div class="big ok">${esc(x.status)}</div><div class="mini">${esc(x.note || '')}</div></a>`));
  } catch (e) { console.log(e); }
}

async function feedEvidence(){
  if (!document.getElementById('evidenceRows')) return;
  try {
    const data = await readFeed('data/evidence.json');
    putRows('evidenceRows', (data.items || []).map(x => `<tr><td>${esc(x.title)}</td><td class="ok">${esc(x.status)}</td><td>${esc(x.path)}</td></tr>`));
  } catch (e) { console.log(e); }
}

async function feedDecision(){
  if (!document.getElementById('decisionRows')) return;
  try {
    const data = await readFeed('data/decision.json');
    putRows('decisionRows', (data.items || []).map(x => `<tr><td>${esc(x.title)}</td><td>${esc(x.recommendation)}</td><td>${esc(x.fallback)}</td></tr>`));
  } catch (e) { console.log(e); }
}

function feedOps(){
  if (!document.getElementById('opsRows')) return;
  putRows('opsRows', [
    '<tr><td>失败</td><td class="bad">红色</td><td>先看流水线日志。</td></tr>',
    '<tr><td>运行中</td><td class="warn">黄色</td><td>等下一次刷新。</td></tr>',
    '<tr><td>过期</td><td class="warn">黄色</td><td>检查同步计划。</td></tr>',
    '<tr><td>正常</td><td class="ok">绿色</td><td>继续大版本。</td></tr>'
  ]);
}

async function feedCodex(){
  if (!document.getElementById('codexRows')) return;
  try {
    const data = await readFeed('data/codex.json');
    putRows('codexRows', (data.items || []).map(x => `<tr><td>${esc(x.task)}</td><td class="${esc(x.tone || 'ok')}">${esc(x.status)}</td><td>${esc(x.next)}</td></tr>`));
  } catch (e) { console.log(e); }
}

document.addEventListener('DOMContentLoaded', () => {
  feedBoss();
  feedEvidence();
  feedDecision();
  feedOps();
  feedCodex();
});
