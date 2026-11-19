// ========================================================================
// DragonBlood · Squire
// The companion: following, fighting, field aid, levels and expeditions.
// ========================================================================
'use strict';
// A squire who follows the knight on every mission, fights at his side, and levels up
// from missions he joins or from expeditions he is sent on alone from his post in the kingdom.
const SQ_MAX=10;
const sqNeed=l=>80*l;
const sqDmg=()=>6+3*(S.squire.lvl-1);
const sqRate=()=>S.squire.lvl>=5?1:1.4;
const sqAidUses=()=>S.squire.lvl>=7?2:S.squire.lvl>=3?1:0;
const SQ_PERKS=[[1,'Fights at your side on every mission'],[3,'Field aid: patches you up for 30 health once per mission when you drop below 35%'],[5,'Quicker strikes: attacks every 1.0s instead of 1.4s'],[7,'Field aid can be used twice per mission'],[10,'Master squire: expedition rewards +25%']];
// Prototype speed: expeditions run in seconds; the design length is shown alongside.
const EXPEDITIONS=[
  {id:'scout',name:'Scout the borderlands',secs:45,design:'1 hour',xp:40,gold:[20,40],mat:[10,20],minLvl:1},
  {id:'escort',name:'Escort a merchant caravan',secs:120,design:'4 hours',xp:110,gold:[60,110],mat:[25,45],minLvl:3},
  {id:'ruins',name:'Search the old ruins',secs:300,design:'8 hours',xp:260,gold:[120,200],mat:[50,90],holy:.35,minLvl:5},
];
const SQ_POST={x:-5.5,z:10};
const SQ={m:null,label:null,blade:null,joined:false,placed:false,cd:0,swing:0,aids:0,target:null};
function sqGrantXP(n){const q=S.squire;if(q.lvl>=SQ_MAX)return null;q.xp+=n;let up=false;
  while(q.lvl<SQ_MAX&&q.xp>=sqNeed(q.lvl)){q.xp-=sqNeed(q.lvl);q.lvl++;up=true;}if(q.lvl>=SQ_MAX)q.xp=0;
  return up?`${q.name} reached squire level ${q.lvl}.`:null;}
function sqAway(){return !!S.squire.exp;}
function sqExpDone(){const e=S.squire.exp;return !!e&&Date.now()>=e.start+e.dur;}
function makeSquire(){const g=makeNPC(0x8a6d3b);g.scale.setScalar(.88);
  const blade=new THREE.Group();blade.add(mesh(new THREE.BoxGeometry(.06,.9,.12),M(0xc8c8d0,{metalness:.5}),0,.45,0));blade.add(mesh(new THREE.BoxGeometry(.32,.06,.08),M(0x5a3d26),0,0,0));
  blade.position.set(.42,.95,.1);blade.rotation.x=.5;g.add(blade);
  g.add(mesh(new THREE.BoxGeometry(.08,.6,.5),M(0x6b4a2a),-.42,.85,.1));// small shield
  return{g,blade};}
function sqSetLabel(sub){if(!SQ.m)return;if(SQ.label){SQ.m.remove(SQ.label);SQ.label.material.map.dispose();SQ.label.material.dispose();}
  SQ.label=makeLabel(S.squire.name,sub,.5);SQ.label.position.y=2.7/.88;SQ.m.add(SQ.label);}
function sqSpawn(){SQ.m=null;SQ.label=null;SQ.blade=null;SQ.joined=false;SQ.placed=false;SQ.cd=0;SQ.swing=0;SQ.target=null;
  if(!cur||!S.squire)return;const sc=cur.scene;
  if(cur.kind==='hub'){
    // his post: a small tent and banner left of the plaza
    const tent=mesh(new THREE.ConeGeometry(1.5,2,4),M(0x7b6646),SQ_POST.x-1.6,1,SQ_POST.z+.4);tent.rotation.y=Math.PI/4;sc.add(tent);
    sc.add(mesh(new THREE.CylinderGeometry(.05,.05,3,6),M(0x2d2420),SQ_POST.x+1.3,1.5,SQ_POST.z-.4));
    cur.colliders.push({x:SQ_POST.x-1.6,z:SQ_POST.z+.4,r:1.3});
    if(!sqAway()){const s=makeSquire();SQ.m=s.g;SQ.blade=s.blade;SQ.m.position.set(SQ_POST.x,0,SQ_POST.z);SQ.m.lookAt(0,0,0);sc.add(SQ.m);sqSetLabel(`Squire · Level ${S.squire.lvl}`);}
    else{const lab=makeLabel(`${S.squire.name}'s Post`,sqExpDone()?'Back from expedition':'Away on expedition',.6);lab.position.set(SQ_POST.x,3.4,SQ_POST.z);sc.add(lab);}
    cur.interact.push({x:SQ_POST.x,z:SQ_POST.z,r:3.4,label:()=>sqAway()?(sqExpDone()?`Hear ${S.squire.name}'s expedition report`:`${S.squire.name}'s post`):`Talk to ${S.squire.name}, your squire`,action:()=>openPanel(P_squire)});
    return;}
  if(sqAway())return;// on an expedition: he cannot join
  const s=makeSquire();SQ.m=s.g;SQ.blade=s.blade;sc.add(SQ.m);sqSetLabel(`Squire · Level ${S.squire.lvl}`);
  SQ.joined=true;SQ.aids=sqAidUses();}
function sqUpdate(dt){
  if(!SQ.m||!cur)return;const q=SQ.m.position;
  if(cur.kind==='hub'){SQ.m.position.y=Math.abs(Math.sin(T*1.3))*.03;return;}
  if(!SQ.placed){const f=fwd();q.set(P.x-f.x*2+f.z*1.6,0,P.z-f.z*2-f.x*1.6);SQ.placed=true;}
  SQ.cd=Math.max(0,SQ.cd-dt);
  // swing animation
  if(SQ.swing>0){SQ.swing=Math.max(0,SQ.swing-dt/.3);}const sw=Math.sin((1-SQ.swing)*Math.PI)*(SQ.swing>0?1:0);
  if(SQ.blade)SQ.blade.rotation.x=.5+sw*1.6;
  // field aid
  if(SQ.aids>0&&P.hp>0&&P.hp<maxHp()*.35&&Math.hypot(q.x-P.x,q.z-P.z)<9){SQ.aids--;P.hp=Math.min(maxHp(),P.hp+30);
    toast(`${S.squire.name} binds your wounds: +30 health.${SQ.aids?` One more aid left.`:''}`,'good');updateHUD();}
  // pick a target near him or the knight
  const ts=cur.squireTargets?cur.squireTargets():[];let best=null,bd=1e9;
  for(const t of ts){const dP=Math.hypot(t.x-P.x,t.z-P.z),dS=Math.hypot(t.x-q.x,t.z-q.z);if(Math.min(dP,dS)>15)continue;if(dS<bd){bd=dS;best=t;}}
  let tx,tz,stop,speed=6.5;
  if(best){tx=best.x;tz=best.z;stop=(best.r||1.4)+.5;speed=7.5;
    if(bd<=stop+.4){if(SQ.cd<=0){SQ.cd=sqRate();SQ.swing=1;best.hit(sqDmg());}}}
  else{const f=fwd();tx=P.x-f.x*2.2+f.z*1.6;tz=P.z-f.z*2.2-f.x*1.6;stop=.4;}
  const dx=tx-q.x,dz=tz-q.z,d=Math.hypot(dx,dz);
  if(!best&&Math.hypot(P.x-q.x,P.z-q.z)>30){q.x=tx;q.z=tz;}
  else if(d>stop){if(!best&&d>6)speed=10.5;const step=Math.min(d-stop,speed*dt);q.x+=dx/d*step;q.z+=dz/d*step;SQ.bob=(SQ.bob||0)+dt*10;}
  for(const col of cur.colliders){const cx=q.x-col.x,cz=q.z-col.z,cd=Math.hypot(cx,cz),m=col.r+.45;if(cd<m&&cd>1e-4){q.x=col.x+cx/cd*m;q.z=col.z+cz/cd*m;}}
  const r=Math.hypot(q.x,q.z);if(r>cur.radius){q.x*=cur.radius/r;q.z*=cur.radius/r;}
  q.y=d>stop?Math.abs(Math.sin(SQ.bob||0))*.08:0;
  const lx=best?best.x:(d>stop?tx:P.x),lz=best?best.z:(d>stop?tz:P.z);if(Math.hypot(lx-q.x,lz-q.z)>.1)SQ.m.rotation.y=Math.atan2(lx-q.x,lz-q.z);}
function sqMissionEnd(r,lines){if(!SQ.joined)return;const lvl=(r.cfg&&r.cfg.lvl)||1;
  const xp=r.success?50+10*lvl:15;S.squire.missions=(S.squire.missions||0)+1;const up=sqGrantXP(xp);
  lines.push(S.squire.lvl>=SQ_MAX&&!up?`${S.squire.name} is a master squire.`:`${S.squire.name} +${xp} squire XP${up?` · ${up}`:''}`);}
function sqTick(){const q=S.squire;if(!q||!q.exp||q.exp.notified||!sqExpDone())return;q.exp.notified=true;save();
  toast(`${q.name} is back from the expedition. Visit his post to hear his report.`,'good');
  if(cur&&cur.kind==='hub'&&!modalOpen){const px=P.x,pz=P.z;setScene(buildHub());P.x=px;P.z=pz;}else hubDirty=true;}
const P_squire={eyebrow:()=>'Your companion',title:()=>`${S.squire.name} · Squire`,live:true,render(){
  const q=S.squire;let h='';
  h+=`<div class="dstats"><span>Level <b>${q.lvl}</b>/${SQ_MAX}</span><span>Damage <b>${sqDmg()}</b></span><span>Strike every <b>${sqRate()}s</b></span><span>Field aid <b>${sqAidUses()||'locked'}</b></span><span>Missions <b>${q.missions||0}</b></span></div>`;
  h+=q.lvl>=SQ_MAX?'<p class="note">Fully trained.</p>':meter('grow',`XP to level ${q.lvl+1}`,q.xp,sqNeed(q.lvl),`${Math.round(q.xp)} / ${sqNeed(q.lvl)}`);
  h+='<p class="section-h">Training</p>'+SQ_PERKS.map(([l,t])=>`<div class="row"><div><b>Level ${l}</b><p>${t}</p></div><div class="acts">${q.lvl>=l?'<span class="tag">Learned</span>':'<span class="tag dim">Locked</span>'}</div></div>`).join('');
  h+='<p class="section-h">Expeditions</p>';
  if(q.exp){const E=EXPEDITIONS.find(e=>e.id===q.exp.id),left=(q.exp.start+q.exp.dur-Date.now())/1000;
    if(left>0)return h+`<p class="note">${q.name} is away: <b>${E.name}</b>. Back in ${fmtShort(left)}. He can't join missions until he returns.</p>`;
    return h+row(`Back from: ${E.name}`,`${q.name} has returned with his findings.`,'',btn('claimSq',null,'Hear his report',false,'primary'));}
  h+=`<p class="note">Send ${q.name} out alone to earn XP and bring back supplies. While he's away he can't fight beside you. In this prototype expeditions take seconds; the design length is shown in brackets.</p>`;
  const mul=(1+.08*(q.lvl-1))*(q.lvl>=SQ_MAX?1.25:1);
  for(const E of EXPEDITIONS){const lock=q.lvl<E.minLvl;
    h+=row(`${E.name} · ${fmtShort(E.secs)} (${E.design})`,`+${E.xp} XP · ${Math.round(E.gold[0]*mul)}–${Math.round(E.gold[1]*mul)} gold · ${Math.round(E.mat[0]*mul)}–${Math.round(E.mat[1]*mul)} material${E.holy?` · ${Math.round(E.holy*100)}% chance of holy water`:''}`,'',
      lock?`<span class="tag dim">Needs squire Lv ${E.minLvl}</span>`:btn('sendSq',E.id,'Send'));}
  return h;}};
