function hubSetText(id, value){
  var el = document.getElementById(id);
  if(el){ el.textContent = value == null ? '' : String(value); }
}
function hubToast(text){
  var toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = text;
  toast.style.display = 'block';
  setTimeout(function(){ toast.style.display = 'none'; }, 1800);
}
function hubSetLight(id, level){
  var el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('ok','warn','bad','blue');
  var tone = level === 'green' ? 'ok' : level === 'red' ? 'bad' : 'warn';
  el.classList.add(tone);
  el.textContent = level === 'green' ? '绿灯' : level === 'red' ? '红灯' : '黄灯';
}
async function hubRead(path){
  var res = await fetch(path + '?ts=' + Date.now(), {cache:'no-store'});
  if(!res.ok) throw new Error(path);
  return await res.json();
}
async function hubLoad(){
  var sample = await hubRead('data/sample.json');
  var risk = await hubRead('data/risk.json');
  var tasks = await hubRead('data/tasks.json');
  var brief = await hubRead('data/brief.json');
  var metrics = sample.metrics || {};
  hubSetLight('hubLight', risk.level || 'yellow');
  hubSetLight('todayStatus', risk.level || 'yellow');
  hubSetText('hubConclusion', brief.conclusion);
  hubSetText('hubReason', brief.reason);
  hubSetText('ownerDecision', brief.owner_decision_needed ? '是' : '否');
  hubSetText('topRisk', risk.top_risk);
  hubSetText('nextStep', brief.next_step);
  hubSetText('sampleFreshness', sample.freshness);
  hubSetText('localSamples', metrics.local_samples);
  hubSetText('validSamples', metrics.valid_samples);
  hubSetText('candidateSamples', metrics.candidate_samples);
  hubSetText('pollutedSamples', metrics.polluted_samples);
  hubSetText('pfValue', metrics.profit_factor);
  hubSetText('winRate', metrics.win_rate);
  hubSetText('maxDrawdown', metrics.max_drawdown);
  hubSetText('netPnl', metrics.net_pnl);
  hubSetText('sampleConclusion', sample.conclusion);
  hubSetText('riskLevel', risk.label);
  var riskList = document.getElementById('riskList');
  if(riskList){ riskList.textContent = (risk.items || []).map(function(x){ return x.title + '：' + x.detail + '。建议：' + x.suggestion; }).join(' / '); }
  var taskRows = document.getElementById('taskRows');
  if(taskRows){ taskRows.textContent = (tasks.items || []).map(function(x){ return x.title + '｜' + x.status + '｜' + x.next; }).join('；'); }
  hubSetText('briefSummary', brief.summary);
  var briefItems = document.getElementById('briefItems');
  if(briefItems){ briefItems.textContent = (brief.items || []).join('；'); }
  var actionRows = document.getElementById('actionRows');
  if(actionRows){ actionRows.textContent = new Date().toLocaleString('zh-CN',{hour12:false}) + '｜读取 Hub 数据｜完成'; }
}
function hubBind(){
  var buttons = document.querySelectorAll('[data-hub-action]');
  buttons.forEach(function(btn){
    btn.addEventListener('click', function(){
      hubToast('已记录：' + btn.textContent);
      if(btn.getAttribute('data-hub-action') === 'refresh'){ hubLoad(); }
    });
  });
}
document.addEventListener('DOMContentLoaded', function(){
  hubBind();
  hubLoad().catch(function(){ hubToast('Hub 数据读取失败'); });
});
