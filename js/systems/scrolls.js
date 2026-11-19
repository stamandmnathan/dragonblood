// ========================================================================
// DragonBlood · Legendary scrolls
// Rare one-shot spells: equipping, casting (Z), impacts and the scroll HUD.
// ========================================================================
'use strict';
// Legendary spell scrolls are very rare drops (3% on higher-difficulty missions, 1% on any other win). Each scroll holds 3 uses. Before a mission the player slots one scroll on the pre-mission
// screen; during that mission it can be cast once (Z): stand still and press 3 keys. Moving, damage or a
// dragon grab cancels the cast and keeps the use. On impact it deals massive area damage, breaks walls and
// rocks, and drops the knight to 10% health.
const SPELLS=[
  {id:'fireball',name:'Fireball',color:0xff6a2a},
  {id:'bolt',name:'Electric Bolt',color:0x8fd8ff},
  {id:'poison',name:'Poison Missile',color:0x7bd043},
];
const spellOf=id=>SPELLS.find(s=>s.id===id);
const SCROLL_R=10,scrollDmg=()=>500+25*intel();
const SCR={pending:null,equipped:null,used:false,shots:[]};
let PRACTICE_SCROLL=null;// practice range only: never saved, never runs out
const scrollByUid=uid=>PRACTICE_SCROLL&&uid===PRACTICE_SCROLL.uid?PRACTICE_SCROLL:(S.scrolls||[]).find(s=>s.uid===uid);
function spReset(){SCR.shots=[];SCR.used=false;
  if(cur&&cur.kind!=='hub'){SCR.equipped=SCR.pending&&scrollByUid(SCR.pending)?SCR.pending:null;}else SCR.equipped=null;SCR.pending=null;}
function addScroll(id){S.nextScroll=(S.nextScroll||1);const s={uid:S.nextScroll++,id,uses:3};S.scrolls=(S.scrolls||[]).concat(s);return s;}
function castScroll(){if(!started||modalOpen||!cur||missionOver||cur.kind==='hub')return;
  const s=scrollByUid(SCR.equipped);
  if(!s){toast('No scroll in your slot for this mission. Slot one on the pre-mission screen.');return;}
  if(SCR.used){toast('Your scroll has already been used this mission.');return;}
  if(P.mode!=='foot'){toast('Scrolls are read on foot.');return;}
  if(CH){toast('Already casting.');return;}
  if(isMoving()){toast('Stand still to read the scroll.','bad');return;}
  const Sp=spellOf(s.id);
  CH={name:`${Sp.name} scroll`,seq:Array.from({length:3},()=>CH_KEYS[Math.floor(Math.random()*CH_KEYS.length)]),i:0,t:4,max:4,done:()=>fireScroll(s)};renderChant();}
function fireScroll(s){const Sp=spellOf(s.id),f=fwd();
  const m=mesh(new THREE.SphereGeometry(.9,14,10),new THREE.MeshStandardMaterial({color:Sp.color,emissive:Sp.color,emissiveIntensity:2.4}));
  m.position.set(P.x+f.x*1.6,1.6,P.z+f.z*1.6);cur.scene.add(m);
  fxCast(Sp.color);fxTrail(m,{color:0xffffff,color1:Sp.color,size:1.5,life:.5,every:.3,smoke:true,flicker:true});SCR.shots.push({s,Sp,m,vx:f.x*30,vz:f.z*30,life:0});
  if(s.practice){SCR.used=false;toast(`${Sp.name} unleashed. Practice scrolls never run out.`,'good');return;}
  SCR.used=true;s.uses--;if(s.uses<=0)S.scrolls=S.scrolls.filter(x=>x!==s);save();
  toast(s.uses>0?`${Sp.name} scroll unleashed. ${s.uses} use${s.uses===1?'':'s'} left on it.`:`${Sp.name} scroll unleashed. The scroll crumbles to ash.`,'good');}
function spUpdate(dt){
  const ts=cur.scrollTargets?cur.scrollTargets():cur.squireTargets?cur.squireTargets():[];
  for(let i=SCR.shots.length-1;i>=0;i--){const o=SCR.shots[i];o.life+=dt;o.m.position.x+=o.vx*dt;o.m.position.z+=o.vz*dt;o.m.rotation.y+=dt*6;
    const x=o.m.position.x,z=o.m.position.z;
    const hitT=ts.some(t=>Math.hypot(t.x-x,t.z-z)<(t.r||1.2)+.9);
    const hitW=cur.colliders.some(c=>c.obj&&Math.hypot(c.x-x,c.z-z)<c.r+.9);
    if(!hitT&&!hitW&&o.life<1.1&&Math.hypot(x,z)<cur.radius)continue;
    scrollImpact(x,z,o.Sp,ts);cur.scene.remove(o.m);o.m.geometry.dispose();o.m.material.dispose();SCR.shots.splice(i,1);}}
function scrollImpact(x,z,Sp,ts){const dmg=scrollDmg();let n=0;
  for(const t of ts)if(Math.hypot(t.x-x,t.z-z)<SCROLL_R+(t.r||1.2)*.5){try{t.hit(dmg);}catch(e){}n++;}
  // break walls, rocks and trees caught in the blast
  const broken=new Set();for(const c of cur.colliders)if(c.obj&&Math.hypot(c.x-x,c.z-z)<SCROLL_R+c.r)broken.add(c.obj);
  for(const ob of broken){cur.scene.remove(ob);const p=new THREE.Vector3();ob.getWorldPosition(p);spBurst(p.x,p.z,0x8a7d70,1.6);fxDust(p.setY(1),16);}
  for(let i=cur.colliders.length-1;i>=0;i--)if(broken.has(cur.colliders[i].obj))cur.colliders.splice(i,1);
  spBurst(x,z,Sp.color,SCROLL_R);fxExplode(new THREE.Vector3(x,1.2,z),Sp.color,7);hurtA=.9;
  const floor=Math.round(maxHp()*.1);if(P.hp>floor)P.hp=floor;updateHUD();
  toast(`The blast hits ${n} foe${n===1?'':'s'}${broken.size?` and shatters ${broken.size} wall${broken.size===1?'':'s'} and rock${broken.size===1?'':'s'}`:''}. The backlash leaves you at 10% health.`,'bad');}
function spBurst(x,z,color,r){const sc=cur.scene,m=mesh(new THREE.SphereGeometry(r,16,12),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,depthWrite:false}));m.position.set(x,1,z);sc.add(m);
  let a=0;const iv=setInterval(()=>{a+=.06;m.material.opacity=Math.max(0,.6-a);m.scale.setScalar(1+a*.6);if(a>=.6){clearInterval(iv);sc.remove(m);m.geometry.dispose();m.material.dispose();}},30);}
function rollScroll(r,lines){if(!r.success)return;
  if(Math.random()>=(r.cfg&&r.cfg.high?.03:.01))return;// 3% on higher-difficulty missions (high-level hunts), 1% on any other win
  const Sp=SPELLS[Math.floor(Math.random()*SPELLS.length)];addScroll(Sp.id);
  lines.push(`<b style="color:#ecb64e">Legendary scroll found: ${Sp.name} (3 uses).</b> Slot it on the pre-mission screen before your next mission.`);}
function spHUD(){if($('#hpBox').hidden)return;const s=scrollByUid(SCR.equipped),row=$('#scrollRow');row.hidden=!s&&!SCR.used;if(row.hidden)return;
  const txt=SCR.used?'Used this mission':`${spellOf(s.id).name} · ${s.uses} use${s.uses===1?'':'s'}`;if($('#scrollText').textContent!==txt)$('#scrollText').textContent=txt;}
function scrollLabel(s){return `${spellOf(s.id).name} scroll · ${s.uses} use${s.uses===1?'':'s'} left`;}
function spellSheet(){const L=S.scrolls||[];return `<p class="section-h">Legendary scrolls</p><p class="note">Very hard to find: higher-difficulty missions (high-level hunts) have a 3% chance to drop one on a win, every other mission win 1%. Each scroll has 3 uses. Slot one on the pre-mission screen; it can be read once per mission (Z), standing still, by pressing 3 keys. It deals massive damage in a ${SCROLL_R}m blast (${scrollDmg()} at your Intelligence), breaks walls and rocks, and leaves you at 10% health.</p>
  ${L.length?L.map(s=>row(scrollLabel(s),'','','')).join(''):'<p class="note">You have no scrolls yet.</p>'}`;}
