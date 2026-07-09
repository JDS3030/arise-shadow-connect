// ═══════════════════════════════════════════════════
// ARISE — Shadow Connect · capa de navegador (DOM + eventos)
// La lógica pura y el estado global viven en game-logic.js
// (fuente única, compartida con los tests de Vitest).
// ═══════════════════════════════════════════════════
import {
  ORBS, RANKS, ABILITIES, G, P,
  getRank, checkWin, findWin, findStrategic, randMove, saveRank,
  blackHole, stealCell, teleportCell, blockCell, aiAbilityMove,
} from './game-logic.js';

// ── Estado solo-navegador ─────────────────────────────
let gameType = 'ai'; // opción por defecto: jugar contra la Sombra IA
let audioCtx = null;
let pendingAbility = null;   // {player, orbId, ab} mientras se elige objetivo
let teleportFrom = null;     // 1er paso del Teletransporte
let extraPlacements = 0;     // fichas extra pendientes (Doble Jugada)
let currentHint = '';        // texto guía durante el modo objetivo
let aiShade = null;          // 'dark' | 'light' | null — tono de la IA si comparte orbe con el jugador

// Clase de tono para el jugador 2 cuando la IA comparte orbe (color distinguible).
function shadeClass(player){ return (player === 2 && aiShade) ? ' o-shade-' + aiShade : ''; }

// ── Cargar progreso persistido (localStorage) ─────────
P.exp = +localStorage.getItem('sc_exp') || 0;
P.ranking = JSON.parse(localStorage.getItem('sc_ranking') || '[]');

// ═══════════════════════════════════════════════════
// PLAYER / RANK UI
// ═══════════════════════════════════════════════════
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
    const ab=ABILITIES[o.id];
    const d=document.createElement('div');
    d.className='orb-opt '+o.cls+(selectedId===o.id?' selected':'');
    d.style.setProperty('--glow-c',o.col);
    d.title=`${o.name} ${o.icon} — ${ab?ab.name+': '+ab.desc:''}`;
    d.onclick=()=>{
      container.querySelectorAll('.orb-opt').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      onSelect(o.id);
      showOrbAbility(containerId,o.id);
      updateShadeSelector();
      playTone(400+ORBS.indexOf(o)*30,.08);
    };
    container.appendChild(d);
  });
  showOrbAbility(containerId,selectedId);
}

// Muestra el selector de tono solo cuando, en modo IA, el jugador elige para
// la IA el mismo orbe que el suyo (para que las fichas sean distinguibles).
function updateShadeSelector(){
  const box=document.getElementById('aiShade');
  if(!box) return;
  const applies = gameType==='ai' && G.p1Orb===G.p2Orb;
  if(!applies){ box.style.display='none'; aiShade=null; return; }
  box.style.display='block';
  if(!aiShade) aiShade='dark'; // por defecto, la IA se ve más oscura
  box.querySelectorAll('.shade-btn').forEach(b=>b.classList.toggle('active', b.dataset.shade===aiShade));
}

// Muestra bajo cada fila de orbes la habilidad del orbe seleccionado.
function showOrbAbility(containerId,orbId){
  const tip=document.getElementById(containerId+'Ability');
  if(!tip) return;
  const ab=ABILITIES[orbId];
  tip.innerHTML=ab?`<span class="oa-ico">${ab.icon}</span> <b>${ab.name}</b> · ${ab.desc}`:'';
}

function openOrbSelect(n){
  G.pendingConnect=n;
  document.getElementById('orbSelectTitle').textContent='CONNECT '+n;
  document.getElementById('p1OrbLabel').textContent=gameType==='ai'?'TU ORBE':'JUGADOR 1';
  document.getElementById('p2OrbLabel').textContent=gameType==='ai'?'ORBE DE LA SOMBRA IA':'JUGADOR 2';
  // El orbe de la IA ahora también lo elige el jugador (color + habilidad).
  document.getElementById('p2OrbSection').style.opacity=1;
  document.getElementById('p2OrbSection').style.pointerEvents='auto';

  buildOrbRow('p1Orbs',G.p1Orb,1,id=>{G.p1Orb=id;});
  buildOrbRow('p2Orbs',G.p2Orb,2,id=>{G.p2Orb=id;});
  updateShadeSelector();
  openModal('orbSelectModal');
}

function startGameFromSelect(){
  // El orbe de la IA (G.p2Orb) es el que el jugador seleccionó en el modal.
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
  G.abilityUsed={1:false,2:false};
  resetAbilityState();

  show('gameScreen');
  document.getElementById('modeLabel').textContent='CONNECT '+n;
  document.getElementById('p2Lbl').textContent=G.vsAI?'SOMBRA IA':'JUGADOR 2';

  // El tono de la IA solo aplica en modo IA cuando ambos comparten orbe.
  if(!(G.vsAI && G.p1Orb===G.p2Orb)) aiShade=null;

  const p1c=ORBS.find(o=>o.id===G.p1Orb).col;
  const p2c=ORBS.find(o=>o.id===G.p2Orb).col;
  document.getElementById('s1').style.color=p1c;
  const s2El=document.getElementById('s2');
  s2El.style.color=p2c;
  s2El.classList.remove('o-shade-dark','o-shade-light');
  if(aiShade) s2El.classList.add('o-shade-'+aiShade);

  buildGrid(); updateUI(); renderAbilityBar();
  maybeAutoTutorial();
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
      if(!G.isOver&&!G.isPaused&&!pendingAbility){
        grid.querySelectorAll('.hint-col').forEach(x=>x.classList.remove('hint-col'));
        grid.querySelectorAll(`[data-c="${c}"]`).forEach(x=>!x.classList.contains('filled')&&!x.classList.contains('wall')&&x.classList.add('hint-col'));
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
  if(pendingAbility){ handleAbilityTarget(r,c); return; }
  if(G.grid[r][c]!==0) return;
  if(G.vsAI&&G.currentPlayer===2) return;
  if(extraPlacements>0){
    extraPlacements--;
    placeOrb(r,c,true);            // sigue siendo el mismo turno (Doble Jugada)
  }else{
    placeOrb(r,c,false);
  }
}

// keepTurn=true → no cambia de jugador (ficha extra de Doble Jugada)
function placeOrb(r,c,keepTurn=false){
  G.grid[r][c]=G.currentPlayer; G.turn++;
  const orb=ORBS.find(o=>o.id===(G.currentPlayer===1?G.p1Orb:G.p2Orb));
  const cell=cellEl(r,c);
  cell.className='cell'; cell.style.width=cell.style.height=cellSize()+'px';
  cell.classList.add('filled','placed',orb.cls);
  if(G.currentPlayer===2&&aiShade) cell.classList.add('o-shade-'+aiShade);
  setTimeout(()=>cell.classList.remove('placed'),300);
  playTone(280+G.currentPlayer*80,.09);

  const win=checkWin(r,c);
  if(win){endGame(win);return;}
  if(G.turn>=G.gridSize*G.gridSize){endGame(0);return;}

  if(keepTurn){ updateUI(); renderAbilityBar(); return; }

  G.currentPlayer=G.currentPlayer===1?2:1;
  updateUI(); renderAbilityBar();
  if(G.vsAI&&G.currentPlayer===2&&!G.isOver) setTimeout(aiTurn,480);
}

// ═══════════════════════════════════════════════════
// HABILIDADES · UI + orquestación (lógica pura en game-logic.js)
// ═══════════════════════════════════════════════════
function resetAbilityState(){
  pendingAbility=null; teleportFrom=null; extraPlacements=0; currentHint='';
}

function cellSize(){ return G.gridSize<=8?44:G.gridSize<=9?40:36; }
function cellEl(r,c){ return document.getElementById('gameGrid').children[r*G.gridSize+c]; }

// Pinta una celda según el valor lógico de G.grid (0 vacía · 1/2 orbe · 3 muro).
function renderCellDOM(r,c){
  const el=cellEl(r,c); const v=G.grid[r][c];
  el.className='cell'; el.style.width=el.style.height=cellSize()+'px';
  if(v===1||v===2){
    const orbId=v===1?G.p1Orb:G.p2Orb;
    el.classList.add('filled',ORBS.find(o=>o.id===orbId).cls);
    if(v===2&&aiShade) el.classList.add('o-shade-'+aiShade);
  }else if(v===3){
    el.classList.add('wall');
  }
}
function rerenderBoard(){
  for(let r=0;r<G.gridSize;r++) for(let c=0;c<G.gridSize;c++) renderCellDOM(r,c);
}

function abilityUsed(player){ return G.abilityUsed[player]; }

function renderAbilityBar(){
  const bar=document.getElementById('abilityBar');
  if(!bar) return;
  bar.innerHTML='';
  if(G.isOver) return;

  // Modo objetivo: guía + cancelar
  if(pendingAbility){
    const hint=document.createElement('div');
    hint.className='ability-hint'; hint.textContent=currentHint;
    const cancel=document.createElement('button');
    cancel.className='ability-cancel'; cancel.textContent='✕ Cancelar';
    cancel.onclick=cancelAbility;
    bar.appendChild(hint); bar.appendChild(cancel);
    return;
  }

  const player=G.currentPlayer;
  const isHumanTurn=!(G.vsAI&&player===2);
  const orbId=player===1?G.p1Orb:G.p2Orb;
  const ab=ABILITIES[orbId];
  if(!ab) return;
  const used=abilityUsed(player);
  const orbCls=ORBS.find(o=>o.id===orbId).cls;

  const btn=document.createElement('button');
  btn.className='ability-btn '+orbCls+shadeClass(player)+(used?' used':'');
  btn.innerHTML=`<span class="ab-ico">${ab.icon}</span>`+
    `<span class="ab-txt"><b>${ab.name}</b><small>${used?'Usada':(isHumanTurn?ab.desc:'Turno IA')}</small></span>`;
  btn.disabled=used||!isHumanTurn||extraPlacements>0;
  btn.onclick=activateAbility;
  bar.appendChild(btn);

  if(extraPlacements>0){
    const h=document.createElement('div');
    h.className='ability-hint';
    h.textContent='⚔️ Doble Jugada — coloca '+(extraPlacements+1)+' fichas';
    bar.appendChild(h);
  }
}

function activateAbility(){
  const player=G.currentPlayer;
  if(abilityUsed(player)||(G.vsAI&&player===2)) return;
  const orbId=player===1?G.p1Orb:G.p2Orb;
  const ab=ABILITIES[orbId];
  playTone(520,.12);

  if(ab.id==='double'){                 // sin objetivo: da una ficha extra
    G.abilityUsed[player]=true;
    extraPlacements=1;
    renderAbilityBar();
    return;
  }
  pendingAbility={player,orbId,ab};
  enterTargeting(ab,player);
  renderAbilityBar();
}

function enterTargeting(ab,player){
  const enemy=player===1?2:1;
  if(ab.id==='blackhole'){ highlightCells(()=>true); currentHint='🕳️ Elige el centro del Hoyo Negro (área 3×3)'; }
  else if(ab.id==='wall'){ highlightCells((r,c)=>G.grid[r][c]===0); currentHint='⭐ Elige una celda vacía para bloquear'; }
  else if(ab.id==='steal'){ highlightCells((r,c)=>G.grid[r][c]===enemy); currentHint='🌑 Elige una ficha enemiga para robar'; }
  else if(ab.id==='teleport'){ teleportFrom=null; highlightCells((r,c)=>G.grid[r][c]===player); currentHint='✨ Elige TU ficha a mover'; }
}

function handleAbilityTarget(r,c){
  const {ab,player}=pendingAbility;
  const enemy=player===1?2:1;
  const v=G.grid[r][c];
  if(ab.id==='blackhole'){
    blackHole(r,c); playTone(110,.35); afterAbility(null);
  }else if(ab.id==='wall'){
    if(v!==0) return; blockCell(r,c); playTone(320,.12); afterAbility(null);
  }else if(ab.id==='steal'){
    if(v!==enemy) return; stealCell(r,c,player); playTone(360,.14); afterAbility({r,c});
  }else if(ab.id==='teleport'){
    if(teleportFrom===null){
      if(v!==player) return;
      teleportFrom={r,c};
      currentHint='✨ Elige la celda vacía de destino';
      highlightCells((rr,cc)=>G.grid[rr][cc]===0);
      renderAbilityBar();
      return;
    }
    if(v!==0) return;
    const dest={r,c};
    teleportCell(teleportFrom.r,teleportFrom.c,r,c,player);
    playTone(420,.14);
    afterAbility(dest);
  }
}

// Cierra la habilidad activa del humano: marca usada, repinta y cede el turno.
function afterAbility(winCoord){
  G.abilityUsed[pendingAbility.player]=true;
  pendingAbility=null; teleportFrom=null; currentHint='';
  clearTargeting(); rerenderBoard();
  endTurn(winCoord);
}

function cancelAbility(){
  pendingAbility=null; teleportFrom=null; currentHint='';
  clearTargeting(); renderAbilityBar();
}

// Avanza el turno tras una habilidad (que no coloca ficha propia salvo caso win).
function endTurn(winCoord){
  if(winCoord){
    const w=checkWin(winCoord.r,winCoord.c);
    if(w){endGame(w);return;}
  }
  G.turn++;
  if(G.turn>=G.gridSize*G.gridSize){endGame(0);return;}
  G.currentPlayer=G.currentPlayer===1?2:1;
  updateUI(); renderAbilityBar();
  if(G.vsAI&&G.currentPlayer===2&&!G.isOver) setTimeout(aiTurn,480);
}

// ── Resaltado de celdas objetivo ──
function forEachCell(fn){ for(let r=0;r<G.gridSize;r++) for(let c=0;c<G.gridSize;c++) fn(r,c,cellEl(r,c)); }
function clearTargeting(){ forEachCell((r,c,el)=>el.classList.remove('targetable')); }
function highlightCells(pred){
  forEachCell((r,c,el)=>{ el.classList.remove('targetable'); if(pred(r,c)) el.classList.add('targetable'); });
}

// ═══════════════════════════════════════════════════
// IA (orquestación · la lógica pura vive en game-logic.js)
// ═══════════════════════════════════════════════════
function aiTurn(){
  if(G.isOver) return;
  if(!abilityUsed(2)){
    const act=aiAbilityMove(G.p2Orb);
    if(act){ aiUseAbility(act); return; }
  }
  let m=findWin(2)||findWin(1)||findStrategic()||randMove();
  if(m) placeOrb(m.r,m.c);
}

function aiUseAbility(act){
  G.abilityUsed[2]=true;
  if(act.id==='blackhole'){
    blackHole(act.r,act.c); rerenderBoard(); playTone(110,.35); endTurn(null);
  }else if(act.id==='wall'){
    blockCell(act.r,act.c); renderCellDOM(act.r,act.c); playTone(320,.12); endTurn(null);
  }else if(act.id==='steal'){
    stealCell(act.r,act.c,2); renderCellDOM(act.r,act.c); playTone(360,.14); endTurn({r:act.r,c:act.c});
  }else if(act.id==='teleport'){
    teleportCell(act.fr,act.fc,act.tr,act.tc,2);
    renderCellDOM(act.fr,act.fc); renderCellDOM(act.tr,act.tc);
    playTone(420,.14); endTurn({r:act.tr,c:act.tc});
  }else if(act.id==='double'){
    placeOrb(act.r,act.c,true);                          // 1ª: tapa la amenaza
    if(!G.isOver){ const m=findWin(2)||findStrategic()||randMove(); if(m) placeOrb(m.r,m.c,false); }
  }
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

  renderAbilityBar();

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
      wo.className='winner-orb '+orb.cls+shadeClass(winner); wo.style.display='block';
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
  document.getElementById('cpOrb').className='cp-orb '+orb.cls+shadeClass(G.currentPlayer);
  const cpn=document.getElementById('cpName');
  cpn.textContent=G.currentPlayer===1?'JUGADOR 1':(G.vsAI?'SOMBRA IA':'JUGADOR 2');
  cpn.style.color=orb.col;
}

function restartRound(){
  G.currentPlayer=1; G.turn=0; G.isOver=false; G.winCells=[];
  G.grid=Array.from({length:G.gridSize},()=>Array(G.gridSize).fill(0));
  G.abilityUsed={1:false,2:false};
  resetAbilityState();
  buildGrid(); updateUI(); renderAbilityBar();
}

// ═══════════════════════════════════════════════════
// RANKING (UI · saveRank vive en game-logic.js)
// ═══════════════════════════════════════════════════
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
// TUTORIAL (coach-marks) · resalta cada elemento y explica la habilidad
// ═══════════════════════════════════════════════════
let tutorialStep = 0;
let tutSteps = [];
const TUT_KEY = 'sc_tutorial_v1';

function buildTutorialSteps(){
  const orbId = G.currentPlayer===1 ? G.p1Orb : G.p2Orb;
  const ab = ABILITIES[orbId] || ABILITIES[G.p1Orb];
  const rival = G.vsAI
    ? 'La Sombra IA también tiene la habilidad de su orbe.'
    : 'Cada jugador tiene la habilidad de su propio orbe.';
  return [
    { target:null, title:'¡Bienvenido a Shadow Connect!',
      text:`El objetivo: conecta ${G.connect} orbes en línea —horizontal, vertical o diagonal— antes que tu rival.` },
    { target:'.cur-player', title:'Turno actual',
      text:'Aquí ves de quién es el turno y con qué orbe juega. Arriba a la derecha está el número de turno.' },
    { target:'#gameGrid', title:'El tablero',
      text:'Toca una celda para colocar tu orbe. Se resalta la columna bajo el cursor como guía visual.' },
    { target:'#abilityBar', title:`Tu habilidad: ${ab.name} ${ab.icon}`,
      text:`${ab.desc}. ${ab.how} Solo se usa 1 vez por partida. ${rival}` },
    { target:'.scores-row', title:'Marcador y controles',
      text:'El marcador lleva las rondas ganadas. Abajo empiezas una nueva ronda o vuelves al menú; arriba a la izquierda puedes pausar o reabrir esta ayuda con “?”.' },
  ];
}

function startTutorial(){
  if(!document.getElementById('gameScreen').classList.contains('active')) return;
  tutSteps = buildTutorialSteps();
  tutorialStep = 0;
  document.getElementById('tutorialOverlay').classList.add('active');
  renderTutorialStep();
}

function renderTutorialStep(){
  const s = tutSteps[tutorialStep];
  if(!s) return;
  document.getElementById('tutStep').textContent = `${tutorialStep+1}/${tutSteps.length}`;
  document.getElementById('tutTitle').textContent = s.title;
  document.getElementById('tutText').textContent = s.text;
  document.getElementById('tutPrev').style.visibility = tutorialStep===0 ? 'hidden' : 'visible';
  document.getElementById('tutNext').textContent = tutorialStep===tutSteps.length-1 ? '¡A jugar!' : 'Siguiente ›';

  const hole = document.getElementById('tutorialHole');
  const tip = document.getElementById('tutorialTip');
  const el = s.target ? document.querySelector(s.target) : null;
  const pad = 8;

  if(el && el.getBoundingClientRect){
    const r = el.getBoundingClientRect();
    hole.style.display = 'block';
    hole.style.left = (r.left - pad) + 'px';
    hole.style.top = (r.top - pad) + 'px';
    hole.style.width = (r.width + pad*2) + 'px';
    hole.style.height = (r.height + pad*2) + 'px';
    positionTip(tip, r);
  } else {
    // Paso de bienvenida: hueco nulo (todo oscuro) + tooltip centrado.
    hole.style.display = 'block';
    hole.style.width = '0px'; hole.style.height = '0px';
    hole.style.left = '50%'; hole.style.top = '45%';
    tip.style.transform = 'translate(-50%,-50%)';
    tip.style.left = '50%'; tip.style.top = '50%';
  }
}

function positionTip(tip, r){
  tip.style.transform = 'none';
  const vw = window.innerWidth, vh = window.innerHeight;
  const tipW = Math.min(300, vw - 32);
  tip.style.width = tipW + 'px';
  const tipH = tip.offsetHeight || 170;
  let top = (r.bottom + tipH + 16 < vh) ? r.bottom + 12 : Math.max(12, r.top - tipH - 12);
  let left = r.left + r.width/2 - tipW/2;
  left = Math.max(12, Math.min(left, vw - tipW - 12));
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}

function tutNext(){ if(tutorialStep < tutSteps.length-1){ tutorialStep++; renderTutorialStep(); } else endTutorial(); }
function tutPrev(){ if(tutorialStep > 0){ tutorialStep--; renderTutorialStep(); } }
function endTutorial(){
  document.getElementById('tutorialOverlay').classList.remove('active');
  try{ localStorage.setItem(TUT_KEY,'1'); }catch(e){}
}
function showTutorial(){ startTutorial(); }               // reproducir manualmente
function maybeAutoTutorial(){
  let seen = false;
  try{ seen = !!localStorage.getItem(TUT_KEY); }catch(e){}
  if(!seen) setTimeout(startTutorial, 350);
}

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
// EXPOSICIÓN GLOBAL
// Los handlers usados en onclick inline del HTML deben ser
// accesibles desde window (un módulo ES no crea globales).
// ═══════════════════════════════════════════════════
Object.assign(window, {
  setType, openOrbSelect, startGameFromSelect, showRanking, showInfo,
  pauseGame, resumeGame, restartRound, goMenu, closeModal, showTutorial,
});

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
document.querySelectorAll('#aiShade .shade-btn').forEach(b=>{
  b.onclick=()=>{ aiShade=b.dataset.shade; updateShadeSelector(); playTone(360,.08); };
});
// Botones del tutorial + reposicionar al redimensionar/rotar.
document.getElementById('tutNext').onclick=tutNext;
document.getElementById('tutPrev').onclick=tutPrev;
document.getElementById('tutSkip').onclick=endTutorial;
window.addEventListener('resize',()=>{
  if(document.getElementById('tutorialOverlay').classList.contains('active')) renderTutorialStep();
});
updatePlayerUI();
