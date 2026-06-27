// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const ORBS=[
  {id:'hunter',name:'Hunter',cls:'o-hunter',icon:'⚔️',col:'#A855F7',glow:'rgba(168,85,247,.55)'},
  {id:'shadow',name:'Shadow',cls:'o-shadow',icon:'🌑',col:'#3730A3',glow:'rgba(55,48,163,.45)'},
  {id:'magic', name:'Magic', cls:'o-magic', icon:'✨',col:'#22D3EE',glow:'rgba(6,182,212,.55)'},
  {id:'power', name:'Power', cls:'o-power', icon:'🔥',col:'#F87171',glow:'rgba(239,68,68,.55)'},
  {id:'gold',  name:'Gold',  cls:'o-gold',  icon:'⭐',col:'#FBBF24',glow:'rgba(245,158,11,.55)'},
];
const RANKS=[
  {n:'E',exp:0,cls:'re'},{n:'D',exp:400,cls:'rd'},{n:'C',exp:1500,cls:'rc'},
  {n:'B',exp:3500,cls:'rb'},{n:'A',exp:7000,cls:'ra'},{n:'S',exp:15000,cls:'rs'},
];

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let G={
  connect:4,gridSize:8,grid:[],currentPlayer:1,turn:0,
  isOver:false,isPaused:false,vsAI:false,
  scores:{p1:0,p2:0,draw:0},winCells:[],
  p1Orb:'hunter',p2Orb:'power',pendingConnect:4,
};
let P={
  exp:+localStorage.getItem('sc_exp')||0,
  ranking:JSON.parse(localStorage.getItem('sc_ranking')||'[]'),
};
let gameType='vs';
let audioCtx=null;

// ═══════════════════════════════════════════════════
// PLAYER / RANK UI
// ═══════════════════════════════════════════════════
function getRank(exp){
  for(let i=RANKS.length-1;i>=0;i--) if(exp>=RANKS[i].exp) return {rank:RANKS[i],idx:i};
  return {rank:RANKS[0],idx:0};
}
function updatePlayerUI(){
  const {rank,idx}=getRank(P.exp);
  const el=document.getElementById('pRankDisplay');
  el.textContent=rank.n; el.className='prc-rank '+rank.cls;
  let pct=100;
  if(idx<RANKS.length-1){
    const cur=P.exp-rank.exp, need=RANKS[idx+1].exp-rank.exp;
    pct=Math.min(100,(cur/need)*100);
  }
  document.getElementById('pExpFill').style.width=pct+'%';
  document.getElementById('pExpLabel').textContent=P.exp+' EXP';
}

// ═══════════════════════════════════════════════════
// ORB SELECT MODAL
// ═══════════════════════════════════════════════════
function buildOrbRow(containerId,selectedId,player,onSelect){
  const container=document.getElementById(containerId);
  container.innerHTML='';
  ORBS.forEach(o=>{
    const d=document.createElement('div');
    d.className='orb-opt '+o.cls+(selectedId===o.id?' selected':'');
    d.style.setProperty('--glow-c',o.col);
    d.title=o.name+' '+o.icon;
    d.onclick=()=>{
      container.querySelectorAll('.orb-opt').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      onSelect(o.id);
      playTone(400+ORBS.indexOf(o)*30,.08);
    };
    container.appendChild(d);
  });
}

function openOrbSelect(n){
  G.pendingConnect=n;
  document.getElementById('orbSelectTitle').textContent='CONNECT '+n;
  document.getElementById('p1OrbLabel').textContent=gameType==='ai'?'TU ORBE':'JUGADOR 1';
  document.getElementById('p2OrbLabel').textContent=gameType==='ai'?'ORBE IA (automático)':'JUGADOR 2';
  document.getElementById('p2OrbSection').style.opacity=gameType==='ai'?.4:1;
  document.getElementById('p2OrbSection').style.pointerEvents=gameType==='ai'?'none':'auto';

  buildOrbRow('p1Orbs',G.p1Orb,1,id=>{G.p1Orb=id;});
  buildOrbRow('p2Orbs',G.p2Orb,2,id=>{G.p2Orb=id;});
  openModal('orbSelectModal');
}

function startGameFromSelect(){
  if(gameType==='ai'){
    const others=ORBS.filter(o=>o.id!==G.p1Orb);
    G.p2Orb=others[Math.floor(Math.random()*others.length)].id;
  }
  closeModal('orbSelectModal');
  startGame(G.pendingConnect);
}

// ═══════════════════════════════════════════════════
// GAME INIT
// ═══════════════════════════════════════════════════
function setType(t,btn){
  gameType=t;
  document.querySelectorAll('.tt-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function startGame(n){
  G.connect=n;
  G.gridSize=n+4;
  G.currentPlayer=1; G.turn=0; G.isOver=false; G.isPaused=false;
  G.winCells=[]; G.vsAI=(gameType==='ai');
  G.grid=Array.from({length:G.gridSize},()=>Array(G.gridSize).fill(0));

  show('gameScreen');
  document.getElementById('modeLabel').textContent='CONNECT '+n;
  document.getElementById('p2Lbl').textContent=G.vsAI?'SOMBRA IA':'JUGADOR 2';

  const p1c=ORBS.find(o=>o.id===G.p1Orb).col;
  const p2c=ORBS.find(o=>o.id===G.p2Orb).col;
  document.getElementById('s1').style.color=p1c;
  document.getElementById('s2').style.color=p2c;

  buildGrid(); updateUI();
}

function buildGrid(){
  const grid=document.getElementById('gameGrid');
  grid.innerHTML='';
  const sz=G.gridSize<=8?44:G.gridSize<=9?40:36;
  grid.style.gridTemplateColumns=`repeat(${G.gridSize},${sz}px)`;

  for(let r=0;r<G.gridSize;r++) for(let c=0;c<G.gridSize;c++){
    const cell=document.createElement('div');
    cell.className='cell';
    cell.style.width=cell.style.height=sz+'px';
    cell.dataset.r=r; cell.dataset.c=c;
    cell.addEventListener('click',()=>clickCell(r,c));
    cell.addEventListener('mouseenter',()=>{
      if(!G.isOver&&!G.isPaused){
        grid.querySelectorAll('.hint-col').forEach(x=>x.classList.remove('hint-col'));
        grid.querySelectorAll(`[data-c="${c}"]`).forEach(x=>!x.classList.contains('filled')&&x.classList.add('hint-col'));
      }
    });
    grid.appendChild(cell);
  }
  grid.addEventListener('mouseleave',()=>grid.querySelectorAll('.hint-col').forEach(x=>x.classList.remove('hint-col')));
}

// ═══════════════════════════════════════════════════
// CLICK / PLACE
// ═══════════════════════════════════════════════════
function clickCell(r,c){
  if(G.isOver||G.isPaused) return;
  if(G.grid[r][c]!==0) return;
  if(G.vsAI&&G.currentPlayer===2) return;
  placeOrb(r,c);
}

function placeOrb(r,c){
  G.grid[r][c]=G.currentPlayer; G.turn++;
  const orb=ORBS.find(o=>o.id===(G.currentPlayer===1?G.p1Orb:G.p2Orb));
  const idx=r*G.gridSize+c;
  const cell=document.getElementById('gameGrid').children[idx];
  cell.classList.add('filled','placed',orb.cls);
  setTimeout(()=>cell.classList.remove('placed'),300);
  playTone(280+G.currentPlayer*80,.09);

  const win=checkWin(r,c);
  if(win){endGame(win);return;}
  if(G.turn>=G.gridSize*G.gridSize){endGame(0);return;}

  G.currentPlayer=G.currentPlayer===1?2:1;
  updateUI();
  if(G.vsAI&&G.currentPlayer===2&&!G.isOver) setTimeout(aiMove,480);
}

// ═══════════════════════════════════════════════════
// WIN CHECK
// ═══════════════════════════════════════════════════
function checkWin(r,c){
  const p=G.grid[r][c];
  const dirs=[[[0,1],[0,-1]],[[1,0],[-1,0]],[[1,1],[-1,-1]],[[1,-1],[-1,1]]];
  for(const[d1,d2]of dirs){
    let cnt=1, cells=[[r,c]];
    for(const d of[d1,d2]){
      let nr=r+d[0],nc=c+d[1];
      while(nr>=0&&nr<G.gridSize&&nc>=0&&nc<G.gridSize&&G.grid[nr][nc]===p){
        cnt++; cells.push([nr,nc]); nr+=d[0]; nc+=d[1];
      }
    }
    if(cnt>=G.connect){G.winCells=cells;return p;}
  }
  return null;
}

// ═══════════════════════════════════════════════════
// AI
// ═══════════════════════════════════════════════════
function aiMove(){
  if(G.isOver) return;
  let m=findWin(2)||findWin(1)||findStrategic()||randMove();
  if(m) placeOrb(m.r,m.c);
}
function findWin(p){
  for(let r=0;r<G.gridSize;r++) for(let c=0;c<G.gridSize;c++){
    if(G.grid[r][c]!==0) continue;
    G.grid[r][c]=p;
    const w=checkWin(r,c);
    G.grid[r][c]=0;
    if(w===p) return{r,c};
  }
  return null;
}
function findStrategic(){
  const mid=Math.floor(G.gridSize/2);
  let moves=[];
  for(let r=0;r<G.gridSize;r++) for(let c=0;c<G.gridSize;c++){
    if(G.grid[r][c]!==0) continue;
    let sc=-(Math.abs(r-mid)+Math.abs(c-mid));
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<G.gridSize&&nc>=0&&nc<G.gridSize){
        if(G.grid[nr][nc]===2) sc+=3;
        if(G.grid[nr][nc]===1) sc+=1;
      }
    }
    moves.push({r,c,sc});
  }
  moves.sort((a,b)=>b.sc-a.sc);
  return moves[0]||null;
}
function randMove(){
  const e=[];
  for(let r=0;r<G.gridSize;r++) for(let c=0;c<G.gridSize;c++) if(G.grid[r][c]===0) e.push({r,c});
  return e.length?e[Math.floor(Math.random()*e.length)]:null;
}

// ═══════════════════════════════════════════════════
// END GAME
// ═══════════════════════════════════════════════════
function endGame(winner){
  G.isOver=true;
  if(winner){
    const grid=document.getElementById('gameGrid');
    G.winCells.forEach(([r,c])=>grid.children[r*G.gridSize+c].classList.add('winning'));
  }
  if(winner===1) G.scores.p1++;
  else if(winner===2) G.scores.p2++;
  else G.scores.draw++;

  let exp=0;
  if(winner===1){exp=50+(G.connect-4)*25;if(G.vsAI)exp*=2;}
  else if(winner===0) exp=15;
  P.exp+=exp;
  localStorage.setItem('sc_exp',P.exp);
  if(winner===1) saveRank();

  setTimeout(()=>{
    const titles={1:G.vsAI?'¡VICTORIA!':'¡JUGADOR 1!',2:G.vsAI?'DERROTA':'¡JUGADOR 2!',0:'EMPATE'};
    const subs={1:G.vsAI?'Derrotaste a la Sombra':'Jugador 1 gana la ronda',2:G.vsAI?'La Sombra prevalece...':'Jugador 2 gana la ronda',0:'Nadie gana esta vez'};
    const tcls={1:'win',2:G.vsAI?'lose':'win',0:'draw'};
    const t=document.getElementById('goTitle');
    t.textContent=titles[winner??0];
    t.className='modal-title '+(tcls[winner??0]);
    document.getElementById('goSub').textContent=subs[winner??0];
    const wo=document.getElementById('goOrb');
    if(winner){
      const orb=ORBS.find(o=>o.id===(winner===1?G.p1Orb:G.p2Orb));
      wo.className='winner-orb '+orb.cls; wo.style.display='block';
      playTone(550,.15); setTimeout(()=>playTone(750,.15),160);
    } else wo.style.display='none';
    document.getElementById('goTurns').textContent=G.turn;
    document.getElementById('goExp').textContent=`+${exp}`;
    updateUI(); updatePlayerUI();
    openModal('gameOverModal');
    if(exp>0) showExpPop(exp);
  },700);
}

function showExpPop(exp){
  const el=document.createElement('div');
  el.className='exp-pop'; el.textContent=`+${exp} EXP`;
  document.body.appendChild(el);
  el.addEventListener('animationend',()=>el.remove());
}

// ═══════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════
function updateUI(){
  document.getElementById('turnBadge').textContent='Turno '+(G.turn+1);
  document.getElementById('s1').textContent=G.scores.p1;
  document.getElementById('s2').textContent=G.scores.p2;
  document.getElementById('sDraw').textContent=G.scores.draw;

  const orb=ORBS.find(o=>o.id===(G.currentPlayer===1?G.p1Orb:G.p2Orb));
  document.getElementById('cpOrb').className='cp-orb '+orb.cls;
  const cpn=document.getElementById('cpName');
  cpn.textContent=G.currentPlayer===1?'JUGADOR 1':(G.vsAI?'SOMBRA IA':'JUGADOR 2');
  cpn.style.color=orb.col;
}

function restartRound(){
  G.currentPlayer=1; G.turn=0; G.isOver=false; G.winCells=[];
  G.grid=Array.from({length:G.gridSize},()=>Array(G.gridSize).fill(0));
  buildGrid(); updateUI();
}

// ═══════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════
function saveRank(){
  const entry={score:1000-G.turn*10+(G.connect-4)*100,turns:G.turn,mode:`Connect ${G.connect}`,vsAI:G.vsAI,date:new Date().toLocaleDateString('es-ES')};
  P.ranking.push(entry);
  P.ranking.sort((a,b)=>b.score-a.score);
  P.ranking=P.ranking.slice(0,10);
  localStorage.setItem('sc_ranking',JSON.stringify(P.ranking));
}
function showRanking(){
  const list=document.getElementById('rankList');
  if(!P.ranking.length){list.innerHTML='<div class="rank-empty">Gana partidas para entrar al ranking!</div>';}
  else list.innerHTML=P.ranking.map((e,i)=>`
    <div class="rank-item">
      <div class="rank-pos ${i===0?'g':i===1?'s':i===2?'b':''}">#${i+1}</div>
      <div class="rank-info"><div class="rank-name">${e.mode} ${e.vsAI?'(vs IA)':''}</div><div class="rank-date">${e.date} · ${e.turns} turnos</div></div>
      <div class="rank-score">${e.score}</div>
    </div>`).join('');
  openModal('rankingModal');
}

// ═══════════════════════════════════════════════════
// MODALS / SCREENS
// ═══════════════════════════════════════════════════
function openModal(id){document.getElementById(id).classList.add('active');}
function closeModal(id){document.getElementById(id).classList.remove('active');}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}
function pauseGame(){G.isPaused=true;openModal('pauseModal');}
function resumeGame(){G.isPaused=false;closeModal('pauseModal');}
function goMenu(){
  G.scores={p1:0,p2:0,draw:0};
  ['gameOverModal','pauseModal'].forEach(m=>closeModal(m));
  show('menuScreen'); updatePlayerUI();
}
function showInfo(){openModal('infoModal');}

// ═══════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════
function playTone(freq,dur){
  try{
    if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value=freq; o.type='sine';
    g.gain.setValueAtTime(0.07,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);
    o.start(); o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
updatePlayerUI();
