const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const REFRESH_MS = 60 * 1000;
const DEFAULT_STALE_MINUTES = 10;
let refreshTimer = null;
let lastStatusPayload = null;

function toast(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=> t.style.display='none', 1800);
}

function setText(selector, value, fallback=''){
  $$(selector).forEach(x=>x.textContent = value ?? fallback);
}

function setTone(selector, tone){
  $$(selector).forEach(x=>{
    x.classList.remove('ok','warn','bad','blue');
    x.classList.add(tone);
  });
}

function parseStatusTime(value){
  if(!value) return null;
  if(value instanceof Date) return value;
  const raw = String(value).trim();
  const candidates = [
    raw,
    raw.replace(' ', 'T'),
    raw.endsWith('Z') ? raw : raw.replace(' ', 'T') + 'Z'
  ];
  for(const candidate of candidates){
    const d = new Date(candidate);
    if(!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function formatTime(value){
  const d = parseStatusTime(value);
  if(!d) return value || '未知';
  return d.toLocaleString('zh-CN', { hour12:false });
}

function minutesSince(value){
  const d = parseStatusTime(value);
  if(!d) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

function normalizeStatus(data){
  const staleAfter = Number(data.stale_after_minutes || DEFAULT_STALE_MINUTES);
  const updated = data.generated_at || data.updated_at || data.source_updated_at;
  const sourceUpdated = data.source_updated_at || data.updated_at || data.generated_at;
  const age = Number.isFinite(Number(data.age_minutes)) ? Number(data.age_minutes) : minutesSince(updated);
  const failedCount = Number(data.failed_workflow_count || 0);
  const runningCount = Number(data.running_workflow_count || 0);
  const workflowState = String(data.workflow_state || data.status_label || '').toLowerCase();
  const syncStatus = String(data.sync_status || data.dashboard_state || '').toLowerCase();

  const failed = data.status_level === 'red'
    || data.ok === false
    || failedCount > 0
    || workflowState.includes('fail')
    || syncStatus.includes('fail')
    || syncStatus.includes('error');

  const running = !failed && (
    data.status_level === 'yellow'
    || runningCount > 0
    || workflowState.includes('running')
    || workflowState.includes('queued')
    || syncStatus.includes('running')
  );

  const stale = !failed && (
    data.is_stale === true
    || data.freshness_label === 'stale'
    || (age !== null && age > staleAfter)
  );

  let tone = 'ok';
  let headline = '正常：老板总控台数据新鲜，未发现失败流水线。';
  let detail = '页面每 60 秒自动读取一次 data/status.json。';

  if(failed){
    tone = 'bad';
    headline = '失败告警：GitHub Actions 或同步流水线存在失败。';
    detail = data.status_reason || data.blocker_summary || '请优先查看 Actions 失败日志，再处理页面/同步问题。';
  }else if(stale){
    tone = 'warn';
    headline = '过期提醒：老板总控台状态已 stale。';
    detail = `最近更新时间已超过 ${staleAfter} 分钟，先检查 GitHub Actions 自动同步是否正常。`;
  }else if(running){
    tone = 'warn';
    headline = '运行提醒：GitHub Actions 正在 running / queued。';
    detail = '等待流水线结束后，页面会在下一次 60 秒刷新里读取新状态。';
  }

  return { ...data, staleAfter, updated, sourceUpdated, age, failedCount, runningCount, tone, headline, detail };
}

function ensureStatusBanner(){
  let banner = $('#statusBanner');
  if(banner) return banner;
  const nav = $('.nav');
  if(!nav) return null;
  banner = document.createElement('section');
  banner.id = 'statusBanner';
  banner.className = 'status-banner warn';
  banner.innerHTML = `
    <div class="status-dot"></div>
    <div class="status-main">
      <b id="statusHeadline">正在读取 GitHub 状态...</b>
      <p id="statusDetail">页面会每 60 秒自动刷新一次。</p>
    </div>
    <div class="status-meta">
      <span>最后更新时间：<b id="lastUpdatedInline">读取中</b></span>
      <span>刷新频率：60 秒</span>
    </div>
  `;
  nav.insertAdjacentElement('afterend', banner);
  return banner;
}

function applyStatusClasses(status){
  const runtimeTone = status.tone === 'bad' ? 'bad' : status.tone === 'warn' ? 'warn' : 'ok';
  setTone('.js-overall', status.tone === 'bad' ? 'bad' : status.tone === 'warn' ? 'warn' : 'ok');
  setTone('.js-runtime', runtimeTone);
  setTone('.js-maintenance', status.tone === 'bad' ? 'bad' : 'ok');
  setTone('.js-sync', status.tone);
  setTone('.js-workflow', status.tone === 'bad' ? 'bad' : status.runningCount > 0 ? 'warn' : 'ok');
  setTone('.js-freshness', status.age !== null && status.age > status.staleAfter ? 'warn' : 'ok');
}

function renderList(selector, items){
  const nodes = $$(selector);
  if(!nodes.length) return;
  const arr = Array.isArray(items) ? items : [];
  nodes.forEach(node=>{
    node.innerHTML = arr.length ? arr.map(x=>`<li>${String(x)}</li>`).join('') : '<li>暂无新增动作。</li>';
  });
}

function updateStatusUI(data){
  const status = normalizeStatus(data);
  lastStatusPayload = status;

  setText('.js-overall', status.overall || (status.tone === 'bad' ? '异常' : status.tone === 'warn' ? '注意' : '可用'));
  setText('.js-runtime', status.runtime || (status.tone === 'bad' ? 'FAIL' : status.tone === 'warn' ? 'RUNNING' : 'PASS'));
  setText('.js-trade', status.trade || '未开放');
  setText('.js-safety', status.safety || '安全');
  setText('.js-maintenance', status.maintenance || (status.tone === 'bad' ? 'CHECK' : 'ACTIVE'));
  setText('.js-sync', status.sync_status || status.dashboard_state || (status.tone === 'bad' ? 'FAILED' : status.tone === 'warn' ? 'RUNNING/STALE' : 'SYNCED'));
  setText('.js-workflow', status.workflow_state || (status.failedCount ? 'FAILED' : status.runningCount ? 'RUNNING' : 'PASS'));
  setText('.js-freshness', status.age === null ? '未知' : `${status.age} 分钟`);
  setText('.js-failed-count', status.failedCount);
  setText('.js-running-count', status.runningCount);
  setText('.js-next-action', status.next_action || '检查最新状态');
  setText('.js-release', status.release_version || status.project || 'V6.1 patch');

  const u = $('#updatedAt');
  if(u) u.textContent = formatTime(status.updated);
  const inline = $('#lastUpdatedInline');
  if(inline) inline.textContent = formatTime(status.updated);

  const banner = ensureStatusBanner();
  if(banner){
    banner.classList.remove('ok','warn','bad');
    banner.classList.add(status.tone);
    const h = $('#statusHeadline');
    const d = $('#statusDetail');
    if(h) h.textContent = status.headline;
    if(d) d.textContent = status.detail;
  }

  applyStatusClasses(status);
  renderList('.js-next-focus', status.next_focus);
  renderList('.js-warnings', status.warnings);
}

async function loadStatus(showToast=false){
  try{
    const res = await fetch('data/status.json?ts=' + Date.now(), { cache:'no-store' });
    if(!res.ok) throw new Error('status.json HTTP ' + res.status);
    const data = await res.json();
    updateStatusUI(data);
    if(showToast) toast('状态已刷新');
  }catch(e){
    console.log(e);
    updateStatusUI({
      overall:'异常', runtime:'FAIL', trade:'未开放', safety:'安全', maintenance:'CHECK',
      updated_at:new Date().toISOString(), status_level:'red', sync_status:'status_json_load_failed',
      status_reason:'data/status.json 读取失败：' + e.message,
      failed_workflow_count:1, running_workflow_count:0, stale_after_minutes:DEFAULT_STALE_MINUTES,
      next_action:'检查 Pages 部署和 data/status.json 是否存在。'
    });
  }
}

function setupAutoRefresh(){
  if(refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(()=>loadStatus(false), REFRESH_MS);
}

function setupFAQ(){
  const input = $('#faqSearch');
  if(!input) return;
  input.addEventListener('input', ()=>{
    const key = input.value.trim().toLowerCase();
    $$('.faq').forEach(card=>{
      const txt = card.textContent.toLowerCase();
      card.classList.toggle('hidden', key && !txt.includes(key));
    });
  });
}

function setupTodos(){
  $$('.todo input').forEach((box, i)=>{
    const key = 'qsgs_todo_' + i;
    box.checked = localStorage.getItem(key) === '1';
    box.addEventListener('change', ()=>{
      localStorage.setItem(key, box.checked ? '1' : '0');
      toast(box.checked ? '已确认' : '已取消');
    });
  });
}

function setupButtons(){
  const confirmBtn = $('#confirmBtn');
  if(confirmBtn){
    confirmBtn.addEventListener('click', ()=>{
      localStorage.setItem('qsgs_boss_confirmed', new Date().toISOString());
      const confirmText = $('#confirmText');
      if(confirmText) confirmText.textContent = '强哥已确认：' + new Date().toLocaleString();
      toast('已保存到本浏览器');
    });
    const v = localStorage.getItem('qsgs_boss_confirmed');
    const confirmText = $('#confirmText');
    if(v && confirmText) confirmText.textContent = '强哥已确认：' + new Date(v).toLocaleString();
  }
  const refreshBtn = $('#refreshBtn');
  if(refreshBtn){
    refreshBtn.addEventListener('click', ()=>loadStatus(true));
  }
  const copyBtn = $('#copyBtn');
  if(copyBtn){
    copyBtn.addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(location.href);
        toast('网址已复制');
      }catch(e){
        toast('复制失败，请手动复制地址栏');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  ensureStatusBanner();
  loadStatus(false);
  setupAutoRefresh();
  setupFAQ();
  setupTodos();
  setupButtons();
});
