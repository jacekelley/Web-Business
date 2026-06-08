// ===== SCRAMBLE =====
const MOVES = ['U','D','L','R','F','B'];
const MODS = ['', "'", '2'];

function genScramble(len=20) {
  let moves=[], last=-1, secondLast=-1;
  for(let i=0;i<len;i++){
    let face;
    do { face=Math.floor(Math.random()*6); }
    while(face===last||(face%2===last%2&&Math.floor(face/2)===Math.floor(last/2)));
    secondLast=last; last=face;
    moves.push(MOVES[face]+MODS[Math.floor(Math.random()*3)]);
  }
  return moves;
}

// ===== CUBE STATE =====
class Cube {
  constructor(){ this.reset(); }
  reset(){ this.f=[...Array(6)].map((_,i)=>Array(9).fill(['U','D','L','R','F','B'][i])); }
  clone(){ const c=new Cube(); c.f=this.f.map(x=>[...x]); return c; }
  rotateCW(fi){ const f=this.f[fi]; this.f[fi]=[f[6],f[3],f[0],f[7],f[4],f[1],f[8],f[5],f[2]]; }
  rotateCCW(fi){ this.rotateCW(fi);this.rotateCW(fi);this.rotateCW(fi); }
  cycle(a,ai,b,bi,c,ci,d,di,cw=true){
    const g=(face,idx)=>idx.map(i=>this.f[face][i]);
    const s=(face,idx,v)=>idx.forEach((i,j)=>this.f[face][i]=v[j]);
    const [av,bv,cv,dv]=[g(a,ai),g(b,bi),g(c,ci),g(d,di)];
    if(cw){s(a,ai,dv);s(b,bi,av);s(c,ci,bv);s(d,di,cv);}
    else  {s(a,ai,bv);s(b,bi,cv);s(c,ci,dv);s(d,di,av);}
  }
  move(m){
    const cw=!m.includes("'"), double=m.includes('2'), base=m[0];
    for(let t=0;t<(double?2:1);t++) this._apply(base,cw);
  }
  _apply(b,cw){
    if(b==='U'){cw?this.rotateCW(0):this.rotateCCW(0);this.cycle(4,[0,1,2],3,[0,1,2],5,[8,7,6],2,[2,1,0],cw);}
    else if(b==='D'){cw?this.rotateCW(1):this.rotateCCW(1);this.cycle(2,[6,7,8],5,[2,1,0],3,[6,7,8],4,[6,7,8],cw);}
    else if(b==='L'){cw?this.rotateCW(2):this.rotateCCW(2);this.cycle(0,[0,3,6],4,[0,3,6],1,[0,3,6],5,[8,5,2],cw);}
    else if(b==='R'){cw?this.rotateCW(3):this.rotateCCW(3);this.cycle(5,[6,3,0],1,[2,5,8],4,[2,5,8],0,[2,5,8],cw);}
    else if(b==='F'){cw?this.rotateCW(4):this.rotateCCW(4);this.cycle(0,[6,7,8],3,[0,3,6],1,[2,1,0],2,[8,5,2],cw);}
    else if(b==='B'){cw?this.rotateCW(5):this.rotateCCW(5);this.cycle(2,[0,3,6],1,[6,7,8],3,[8,5,2],0,[2,1,0],cw);}
  }
  applyScramble(moves){ moves.forEach(m=>this.move(m)); }
}

// ===== PRO STATE =====
// Replace this with real auth/subscription check in production
let isPro = false;

function openProModal() {
  document.getElementById('modalOverlay').classList.add('open');
}

function closeProModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

document.getElementById('upgradeBtn').onclick = openProModal;
document.getElementById('modalClose').onclick = closeProModal;
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeProModal();
});

document.getElementById('checkoutBtn').onclick = () => {
  // Wire up your Stripe Checkout URL here, e.g.:
  // window.open('https://buy.stripe.com/your_link', '_blank');
  alert('Connect your Stripe Checkout link in script.js → checkoutBtn.onclick');
};

// Export button — pro-gated
document.getElementById('exportBtn').onclick = () => {
  if (!isPro) { openProModal(); return; }
  exportTimes();
};

function exportTimes() {
  if (!times.length) return;
  const rows = ['#,Time,Penalty,Raw(ms)'];
  times.forEach((t, i) => {
    rows.push(`${i+1},${fmt(t.raw, t.penalty)},${t.penalty || 'OK'},${t.raw}`);
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cubetimer_solves.csv';
  a.click();
}

// Pro chip tooltip on click for non-pro users
['ao-ao25-chip','ao-ao50-chip'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    if (!isPro) openProModal();
  });
});

// ===== STATE =====
let state='idle';
let startTime=0, elapsed=0, timerInterval=null;
let inspectInterval=null;
let spaceDown=false, holdTimeout=null;
let currentScramble=[];
let times=[];
let cube=new Cube();

const timerEl=document.getElementById('timerDisplay');
const hintEl=document.getElementById('timerHint');
const lastTimeEl=document.getElementById('lastTimeDisplay');
const inspectRingEl=document.getElementById('inspectRing');
const inspectArcEl=document.getElementById('inspectArc');
const scrambleMovesEl=document.getElementById('scrambleMoves');
const penBtns=document.querySelectorAll('.pen-btn');

function fmt(ms, penalty){
  if(penalty==='DNF') return 'DNF';
  if(penalty==='+2') ms+=2000;
  if(ms<60000){ const s=Math.floor(ms/1000),c=Math.floor((ms%1000)/10); return `${s}.${c.toString().padStart(2,'0')}`; }
  const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),c=Math.floor((ms%1000)/10);
  return `${m}:${s.toString().padStart(2,'0')}.${c.toString().padStart(2,'0')}`;
}

function generateScramble(){
  currentScramble=genScramble(20);
  scrambleMovesEl.innerHTML=currentScramble.map((m,i)=>`<span class="scramble-move" id="sm${i}">${m}</span>`).join(' ');
  cube=new Cube();
  cube.applyScramble(currentScramble);
}

// ===== TIMER =====
function startInspection(){
  state='inspecting';
  const inspectStart=Date.now();
  timerEl.className='timer-display inspecting';
  timerEl.textContent='15';
  hintEl.textContent='Release SPACE to start — Inspection: 15s';
  inspectRingEl.classList.add('visible');
  clearInterval(inspectInterval);
  inspectInterval=setInterval(()=>{
    const rem=Math.max(0,15-(Date.now()-inspectStart)/1000);
    const circ=722;
    inspectArcEl.style.strokeDashoffset=circ*(rem/15);
    inspectArcEl.style.stroke=rem<=3?'#ff5252':rem<=8?'#ff9800':'#ffd740';
    timerEl.textContent=Math.ceil(rem);
    if(rem<=0){ timerEl.textContent='DNF'; clearInterval(inspectInterval); }
  },50);
}

function startTimer(){
  clearInterval(inspectInterval);
  inspectRingEl.classList.remove('visible');
  inspectArcEl.style.strokeDashoffset=722;
  inspectArcEl.style.stroke='#ffd740';
  state='running';
  startTime=Date.now();
  timerEl.className='timer-display running';
  hintEl.textContent='Press any key to stop';
  penBtns.forEach(b=>b.classList.remove('show'));
  timerInterval=setInterval(()=>{ elapsed=Date.now()-startTime; timerEl.textContent=fmt(elapsed,null); },30);
}

function stopTimer(){
  clearInterval(timerInterval);
  elapsed=Date.now()-startTime;
  state='stopped';
  timerEl.className='timer-display';
  timerEl.textContent=fmt(elapsed,null);
  hintEl.textContent='Hold SPACE to inspect';
  times.push({raw:elapsed,penalty:null});
  penBtns.forEach(b=>b.classList.add('show'));
  document.getElementById('pen-ok').classList.add('active');
  document.getElementById('pen-plus2').classList.remove('active','active-red');
  document.getElementById('pen-dnf').classList.remove('active','active-red');
  lastTimeEl.innerHTML=`Last: <span>${fmt(elapsed,null)}</span>`;
  updateStats(); renderTimes(); generateScramble();
}

function applyPenalty(p){
  if(!times.length) return;
  const e=times[times.length-1];
  e.penalty=p==='ok'?null:p;
  timerEl.textContent=fmt(e.raw,e.penalty);
  lastTimeEl.innerHTML=`Last: <span>${fmt(e.raw,e.penalty)}</span>`;
  document.getElementById('pen-ok').classList.toggle('active',p==='ok');
  document.getElementById('pen-plus2').classList.toggle('active',p==='+2');
  document.getElementById('pen-dnf').classList.toggle('active-red',p==='DNF');
  document.getElementById('pen-dnf').classList.toggle('active',false);
  updateStats(); renderTimes();
}

// ===== STATS =====
function getMs(e){ if(e.penalty==='DNF') return Infinity; return e.raw+(e.penalty==='+2'?2000:0); }

function calcAo(n,arr){
  if(arr.length<n) return null;
  const sl=arr.slice(-n).map(getMs);
  if(sl.filter(v=>v===Infinity).length>1) return Infinity;
  const s=[...sl].sort((a,b)=>a-b).slice(1,n-1);
  return s.reduce((a,b)=>a+b,0)/s.length;
}

function updateStats(){
  const valid=times.filter(t=>t.penalty!=='DNF').map(getMs);
  const best=valid.length?Math.min(...valid):null;
  const worst=valid.length?Math.max(...valid):null;
  const mean=valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;
  const std=valid.length>1?Math.sqrt(valid.map(v=>(v-mean)**2).reduce((a,b)=>a+b)/valid.length):null;
  const ao5=calcAo(5,times), ao12=calcAo(12,times), ao25=calcAo(25,times), ao50=calcAo(50,times);
  const f=v=>v===null?'—':v===Infinity?'DNF':fmt(v,null);

  document.getElementById('s-best').textContent=f(best);
  document.getElementById('s-worst').textContent=f(worst);
  document.getElementById('s-mean').textContent=f(mean);
  document.getElementById('s-std').textContent=std!==null?fmt(std,null):'—';

  // Ao25/Ao50 only show values for pro users
  document.getElementById('ao-ao5').textContent=f(ao5);
  document.getElementById('ao-ao12').textContent=f(ao12);
  document.getElementById('ao-ao25').textContent=isPro ? f(ao25) : '✦';
  document.getElementById('ao-ao50').textContent=isPro ? f(ao50) : '✦';

  document.getElementById('hdr-count').textContent=times.length;
  document.getElementById('hdr-best').textContent=f(best);
  document.getElementById('hdr-mean').textContent=f(mean);
  document.getElementById('hdr-ao5').textContent=f(ao5);
  document.getElementById('hdr-ao12').textContent=f(ao12);
  drawGraph();
}

function renderTimes(){
  const list=document.getElementById('timesList');
  const validMs=times.filter(t=>t.penalty!=='DNF').map(getMs);
  const bestMs=validMs.length?Math.min(...validMs):null;
  const worstMs=validMs.length&&validMs.length>1?Math.max(...validMs):null;
  list.innerHTML=times.slice().reverse().map((t,ri)=>{
    const i=times.length-1-ri;
    const ms=getMs(t);
    const isBest=bestMs!==null&&t.penalty!=='DNF'&&ms===bestMs&&validMs.length>1;
    const isWorst=worstMs!==null&&t.penalty!=='DNF'&&ms===worstMs&&validMs.length>1;
    return `<div class="time-entry ${isBest?'best':''} ${isWorst?'worst':''}">
      <span class="entry-num">${i+1}</span>
      <span class="entry-time ${isBest?'best':''} ${isWorst?'worst':''}">${fmt(t.raw,t.penalty)}</span>
      <button class="entry-del" onclick="deleteTime(${i})">✕</button>
    </div>`;
  }).join('');
}

function deleteTime(i){ times.splice(i,1); updateStats(); renderTimes(); }

// ===== CLEAR =====
document.getElementById('clearBtn').onclick=()=>{
  if(confirm('Clear all times?')){
    times=[];
    timerEl.textContent='0.00';
    timerEl.className='timer-display';
    lastTimeEl.innerHTML='';
    penBtns.forEach(b=>{ b.classList.remove('show','active','active-red'); });
    state='idle';
    clearInterval(timerInterval); clearInterval(inspectInterval);
    inspectRingEl.classList.remove('visible');
    inspectArcEl.style.strokeDashoffset=722;
    hintEl.textContent='Hold SPACE to inspect';
    updateStats(); renderTimes();
  }
};

// ===== GRAPH =====
function drawGraph(){
  const canvas=document.getElementById('graph');
  const W=canvas.clientWidth||200, H=80;
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  const recent=times.slice(-15).filter(t=>t.penalty!=='DNF').map(getMs);
  if(recent.length<2) return;
  const mn=Math.min(...recent), mx=Math.max(...recent), range=mx-mn||1;
  const pts=recent.map((v,i)=>({x:8+i*(W-16)/(recent.length-1),y:H-8-(v-mn)/range*(H-16)}));
  ctx.strokeStyle='#2a2a3d'; ctx.lineWidth=.5;
  for(let y=0;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'rgba(108,99,255,.3)'); grad.addColorStop(1,'rgba(108,99,255,0)');
  ctx.beginPath(); ctx.moveTo(pts[0].x,H);
  pts.forEach(p=>ctx.lineTo(p.x,p.y)); ctx.lineTo(pts[pts.length-1].x,H);
  ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle='#6c63ff'; ctx.lineWidth=2; ctx.lineJoin='round';
  pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
  pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fillStyle='#6c63ff';ctx.fill();});
}

// ===== INPUT =====
document.addEventListener('keydown',e=>{
  if(e.repeat) return;
  // Don't intercept space if the modal is open
  if(document.getElementById('modalOverlay').classList.contains('open')){
    if(e.code==='Escape') closeProModal();
    return;
  }
  if(state==='running'){ e.preventDefault(); stopTimer(); return; }
  if(e.code==='Space'){
    e.preventDefault();
    if(state==='idle'||state==='stopped'){
      spaceDown=true;
      clearTimeout(holdTimeout);
      startInspection();
      holdTimeout=setTimeout(()=>{
        if(spaceDown&&state==='inspecting'){
          timerEl.className='timer-display ready';
          timerEl.textContent='0.00';
          hintEl.textContent='Release SPACE to start';
          state='ready';
        }
      },300);
    }
  }
});

document.addEventListener('keyup',e=>{
  if(e.code==='Space'){
    e.preventDefault();
    spaceDown=false;
    clearTimeout(holdTimeout);
    if(state==='inspecting'||state==='ready') startTimer();
  }
});

// Touch
let touchHold=null;
document.getElementById('timerArea').addEventListener('touchstart',e=>{
  if(state==='running'){stopTimer();return;}
  if(state==='idle'||state==='stopped'){
    startInspection();
    touchHold=setTimeout(()=>{
      timerEl.className='timer-display ready';
      timerEl.textContent='0.00'; state='ready';
    },300);
  }
},{passive:true});
document.getElementById('timerArea').addEventListener('touchend',()=>{
  clearTimeout(touchHold);
  if(state==='inspecting'||state==='ready') startTimer();
},{passive:true});

document.getElementById('pen-ok').onclick=()=>applyPenalty('ok');
document.getElementById('pen-plus2').onclick=()=>applyPenalty('+2');
document.getElementById('pen-dnf').onclick=()=>applyPenalty('DNF');
document.getElementById('newScrambleBtn').onclick=e=>{e.stopPropagation();if(state!=='running')generateScramble();};

// ===== INIT =====
generateScramble();
updateStats();