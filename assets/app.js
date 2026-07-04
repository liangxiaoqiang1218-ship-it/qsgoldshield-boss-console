
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function toast(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=> t.style.display='none', 1800);
}

async function loadStatus(){
  try{
    const res = await fetch('data/status.json?ts=' + Date.now());
    const data = await res.json();
    $$('.js-overall').forEach(x=>x.textContent=data.overall || '可用');
    $$('.js-runtime').forEach(x=>x.textContent=data.runtime || 'PASS');
    $$('.js-trade').forEach(x=>x.textContent=data.trade || '未开放');
    $$('.js-safety').forEach(x=>x.textContent=data.safety || '安全');
    $$('.js-maintenance').forEach(x=>x.textContent=data.maintenance || 'ACTIVE');
    const u = $('#updatedAt');
    if(u) u.textContent = data.updated_at || '';
  }catch(e){
    console.log(e);
  }
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
      $('#confirmText').textContent = '强哥已确认：' + new Date().toLocaleString();
      toast('已保存到本浏览器');
    });
    const v = localStorage.getItem('qsgs_boss_confirmed');
    if(v) $('#confirmText').textContent = '强哥已确认：' + new Date(v).toLocaleString();
  }
  const refreshBtn = $('#refreshBtn');
  if(refreshBtn){
    refreshBtn.addEventListener('click', ()=>{ loadStatus(); toast('状态已刷新'); });
  }
  const copyBtn = $('#copyBtn');
  if(copyBtn){
    copyBtn.addEventListener('click', async ()=>{
      await navigator.clipboard.writeText(location.href);
      toast('网址已复制');
    });
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadStatus();
  setupFAQ();
  setupTodos();
  setupButtons();
});
