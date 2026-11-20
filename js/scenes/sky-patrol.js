// ========================================================================
// DragonBlood · Scene: Sky Patrol
// Riding mission (also the tutorial ride and the practice range):
// mounting, flight, grabbing, being grabbed, combat, tutorial steps, range tablets.
// ========================================================================
'use strict';
const STAM={breath:18,bite:8,grab:10,dive:12,diveSec:10,takeoff:10,fly:1.2,landRegen:3,awayRegen:12};
// Sky Patrol difficulty. Medium is the original balance.
//   riders: riders to unseat · together: riders in the air at once · D: enemy health/damage
//   grab: enemy grab cooldown multiplier · free/pull: keys and seconds to break free / to rip a rider off
//   (grab prompts are always 4 keys; difficulty changes only the time)
//   mul: reward multiplier · high: 3% Legendary scroll chance on a win instead of 1%
const PATROL_DIFFS={
  easy:  {name:'Easy',  riders:3,together:1,D:.75,grab:1.5,freeKeys:4,freeTime:4.2,pullKeys:4,pullTime:3.2,mul:.6,high:false},
  medium:{name:'Medium',riders:4,together:2,D:1,  grab:1,  freeKeys:4,freeTime:3.4,pullKeys:4,pullTime:2.6,mul:1, high:false},
  hard:  {name:'Hard',  riders:6,together:3,D:1.5,grab:.7, freeKeys:4,freeTime:2.8,pullKeys:4,pullTime:2.2,mul:1.6,high:true},
};
// Both grab prompts use the movement keys. Arrow keys count as their WASD match.
const QTE_KEYS=['KeyW','KeyA','KeyS','KeyD'];
const QTE_ALIAS={ArrowUp:'KeyW',ArrowLeft:'KeyA',ArrowDown:'KeyS',ArrowRight:'KeyD'};
const touchHold={dive:false};
// Fall damage depends on how high you were dropped and how late you pulled the chute.
function fallDamage(dropH,openH){if(openH==null)return Math.max(0,dropH-3)*4;return Math.max(0,(dropH-openH)-15)*1.5+(openH<8?(8-openH)*7:0);}
function buildPatrol(cfg){
  const sc=baseScene(0x6d7f94,80,300);
  const colliders=[],interact=[];const PT=PATROL_DIFFS[cfg.diff]||(cfg.tut?PATROL_DIFFS.easy:PATROL_DIFFS.medium);// tutorial: easy prompts
  const RAD=125,DIFF=(1+.15*(cfg.lvl-1))*PT.D,GY=1.25,TOTAL=cfg.tut||cfg.range?4:PT.riders;
  const ground=mesh(new THREE.CircleGeometry(175,56),M(0x4a5a38));ground.rotation.x=-Math.PI/2;sc.add(ground);
  for(let i=0;i<46;i++){const a=i/46*Math.PI*2,h=30+Math.random()*30;sc.add(mesh(new THREE.ConeGeometry(14+Math.random()*8,h,5),M(0x3d4638),Math.sin(a)*152,h/2-1,Math.cos(a)*152));}
  const rand=rng(cfg.seed);
  for(let i=0;i<50;i++){const a=rand()*Math.PI*2,r=14+rand()*105,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.hypot(x,z-100)<16)continue;
    if(rand()<.55){const h=4+rand()*5,t=new THREE.Group();t.position.set(x,0,z);t.add(mesh(new THREE.CylinderGeometry(.25,.35,h*.4,6),M(0x4a3426),0,h*.2,0));t.add(mesh(new THREE.ConeGeometry(1.6,h*.8,6),M(0x2f4a2c),0,h*.6,0));sc.add(t);colliders.push({x,z,r:.8,obj:t});}
    else{const sz=1.4+rand()*3,rk=mesh(new THREE.DodecahedronGeometry(sz,0),M(0x6b665e),x,sz*.55,z);rk.rotation.set(rand()*3,rand()*3,0);sc.add(rk);colliders.push({x,z,r:sz*.9,obj:rk});}}
  // war camp and drop zone
  const F=FACTIONS[S.faction],DZ={x:0,z:100,r:8};
  const dz=mesh(new THREE.RingGeometry(DZ.r-1,DZ.r,40),new THREE.MeshBasicMaterial({color:0xc9a35a,side:THREE.DoubleSide}));dz.rotation.x=-Math.PI/2;dz.position.set(DZ.x,.06,DZ.z);sc.add(dz);
  for(const[tx,tz]of[[-13,104],[13,104],[-9,115],[9,115]]){const tent=mesh(new THREE.ConeGeometry(3,3.6,4),M(F.hex),tx,1.8,tz);tent.rotation.y=Math.PI/4;sc.add(tent);colliders.push({x:tx,z:tz,r:2.6});}
  sc.add(mesh(new THREE.CylinderGeometry(.12,.12,9,6),M(0x2d2420),0,4.5,112));
  sc.add(mesh(new THREE.PlaneGeometry(2.4,1.5),M(F.hex,{side:THREE.DoubleSide}),1.2,8,112));
  const campLab=makeLabel('War Camp','Drop zone');campLab.position.set(0,11,108);sc.add(campLab);
  const campLight=new THREE.PointLight(0xffc070,1.4,40);campLight.position.set(0,6,100);sc.add(campLight);
  // things to grab: two supply crates and one stranded ally (tutorial: one nearby crate, no scout)
  const pickups=[];
  const placeFar=()=>{const a=Math.PI+rnd(-1.1,1.1),r=rnd(55,110);return{x:Math.sin(a)*r,z:Math.cos(a)*r};};
  for(let i=0;i<(cfg.range?0:cfg.tut?1:2);i++){const q=cfg.tut?{x:28,z:44}:placeFar(),g=new THREE.Group();g.add(mesh(new THREE.BoxGeometry(1.4,1.1,1.4),M(0x8a6234),0,.55,0));g.add(mesh(new THREE.BoxGeometry(1.5,.18,1.5),M(0xc9a35a,{metalness:.5}),0,1.1,0));
    const lab=makeLabel('Supply crate','',.55);lab.position.y=2.4;g.add(lab);g.position.set(q.x,0,q.z);sc.add(g);pickups.push({kind:'crate',m:g,state:'ground',name:'supply crate'});}
  if(!cfg.tut&&!cfg.range){const q=placeFar(),g=makeNPC(0x5f8fb0),lab=makeLabel('Stranded scout','Ally · carry to camp',.55);lab.position.y=2.8;g.add(lab);g.position.set(q.x,0,q.z);sc.add(g);pickups.push({kind:'scout',m:g,state:'ground',name:'scout'});}

  // your dragons — only one mount: active grown dragon, else first grown
  const _ad=activeDragon(),_mount=_ad&&_ad.growth>=100?_ad:S.dragons.find(d=>d.growth>=100);
  const roster=_mount?[_mount]:[];
  const DS={};for(const d of roster)DS[d.id]={hp:dHp(d),st:dStam(d),cd:d.cdUntil&&d.cdUntil>Date.now()?(d.cdUntil-Date.now())/1000:0,away:true,used:false,wounded:false};
  let R=null,lastId=S.active;
  function spawnDragon(d,x,y,z,state){const m=makeDragon(ELEMENTS[d.element].color,.95,d.element);m.rotation.order='YXZ';m.position.set(x,y,z);sc.add(m);DS[d.id].away=false;DS[d.id].used=true;
    R={d,m,pos:m.position,state,spd:0,diving:false,bank:0,target:null,noDiveMsg:0};lastId=d.id;return R;}
  function removeDragon(){if(!R)return;sc.remove(R.m);DS[R.d.id].away=true;R=null;}
  const ad=activeDragon();
  const first=ad&&DS[ad.id]&&DS[ad.id].cd<=0?ad:roster.find(d=>DS[d.id].cd<=0);
  if(first)spawnDragon(first,0,GY,82,'idle');

  // enemies
  const foes=[],soldiers=[],bodies=[],shots=[],myShots=[];
  let spawned=0,unseated=0,delivered=0,scoutSaved=false,held=null,struggle=null,qte=null,captor=null,carryT=0,breathCD=0,biteCD=0,won=false;
  function spawnFoe(){spawned++;const T=cfg.tut||cfg.range,a=T?rnd(0,Math.PI*2):rnd(-1,1)+Math.PI,r=T?rnd(45,60):rnd(90,120),m=makeDragon(0x5c3a5e,.95),o=T?playerPos():new THREE.Vector3();
    m.position.set(o.x+Math.sin(a)*r,rnd(22,34),o.z+Math.cos(a)*r);sc.add(m);
    const rider=makeRider();rider.scale.setScalar(.75);rider.position.set(0,.75,-.3);m.add(rider);
    const hp=cfg.tut?70:Math.round(260*DIFF);foes.push({m,rider,hp,max:hp,state:'fly',ang:Math.random()*6,fireCD:cfg.tut?rnd(5,7):rnd(2.5,4.5),grabCD:cfg.tut?1e9:rnd(10,16)*PT.grab,stun:0,t:0,hasRider:true});return foes[foes.length-1];}
  function checkSpawn(){if(cfg.tut||cfg.range)return;const active=foes.filter(f=>f.hasRider).length;if(active<PT.together&&spawned<TOTAL)spawnFoe();}
  if(!cfg.tut&&!cfg.range){spawnFoe();spawnFoe();}

  const canopy=mesh(new THREE.SphereGeometry(2.2,12,6,0,Math.PI*2,0,Math.PI/2),M(0xd9c7a0,{side:THREE.DoubleSide}),0,3.2,0);canopy.visible=false;camera.add(canopy);
  const makeCanopy=()=>mesh(new THREE.SphereGeometry(1.4,10,5,0,Math.PI*2,0,Math.PI/2),M(0xbfa77e,{side:THREE.DoubleSide}),0,2.8,0);
  const fwd3=()=>{const cp=Math.cos(P.pitch);return new THREE.Vector3(-Math.sin(P.yaw)*cp,Math.sin(P.pitch),-Math.cos(P.yaw)*cp);};
  const playerPos=()=>P.mode==='mounted'&&R?R.pos.clone():new THREE.Vector3(P.x,P.y+1,P.z);
  setObjective('');

  function end(success,reason){if(missionOver)return;
    if(cfg.tut){for(const d of roster)d.cdUntil=0;finishMission({kind:'tutorial',success,reason});return;}
    for(const d of roster){const c=DS[d.id].cd;d.cdUntil=c>0?Date.now()+c*1000:0;}
    finishMission({kind:'patrol',success,reason,cfg,total:TOTAL,unseated,delivered,scoutSaved,used:roster.filter(d=>DS[d.id].used)});}

  // ----- the rider's dragon
  function mount(){P.mode='mounted';R.state='landed';lastId=R.d.id;P.pitch=0;toast(`Mounted ${R.d.name}. R to take off.`);}
  function dismount(){const rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);P.mode='foot';P.y=0;P.vy=0;P.grounded=true;P.x=R.pos.x+rx*3;P.z=R.pos.z+rz*3;R.state='idle';R.diving=false;}
  function setTarget(){const f=fwd();R.target=new THREE.Vector3(P.x+f.x*5,GY,P.z+f.z*5);}
  function callDragon(d){if(R)removeDragon();const a=Math.random()*Math.PI*2;spawnDragon(d,P.x+Math.cos(a)*55,30,P.z+Math.sin(a)*55,'arriving');setTarget();toast(`You called ${d.name}. It is on its way.`);}
  function swap(){const other=roster.find(d=>d.id!==R.d.id&&DS[d.id].cd<=0);
    if(!other){toast(`${R.d.name} is recovering (${fmtShort(DS[R.d.id].cd)}) and only one dragon can fly as a mount for now. Wait for it to recover.`,'bad');return;}
    const old=R.d,ds=DS[old.id];ds.cd*=1.5;removeDragon();
    toast(`${old.name} was sent away to make room for the swap. Its cooldown is longer: ${fmtShort(ds.cd)}.`,'bad');callDragon(other);}
  function sendAway(){if(qte||P.mode==='grabbed'||P.mode==='falling'||P.mode==='chute')return;
    if(!R){toast('No dragon is with you. Press R to call one.');return;}
    if(P.mode==='mounted'){if(R.state!=='landed'){toast('Land first (R), then send your dragon away.');return;}dismount();}
    const d=R.d,ds=DS[d.id],heal=Math.round(dHp(d)*.15);ds.hp=Math.min(dHp(d),ds.hp+heal);removeDragon();
    toast(`${d.name} flew off to rest: +${heal} health and faster stamina recovery. R calls it back.`,'good');}
  function exhausted(){const d=R.d,ds=DS[d.id];if(ds.hp<=0){ds.hp=0;ds.wounded=true;}ds.cd=dCool(d);
    if(P.mode==='mounted')dismount();R.state='idle';
    toast(`${d.name} landed and needs ${fmtShort(ds.cd)} to recover (${Math.round(dCoolDesign(d)/60*10)/10} min at full game speed). R calls it back once it recovers.`,'bad');}
  // While falling, your own dragon can swoop in and catch you before you hit the ground.
  function catchable(){const d=R?R.d:roster.find(x=>x.id===lastId&&DS[x.id].cd<=0)||roster.find(x=>DS[x.id].cd<=0);
    if(!d)return null;const ds=DS[d.id];return ds.cd<=0&&ds.st>=STAM.takeoff?d:null;}
  function callCatch(){if(R&&R.state==='catching')return true;const d=catchable();
    if(!d){toast(R&&DS[R.d.id].cd>0?`${R.d.name} is recovering and cannot catch you.`:'No dragon has the stamina to catch you.','bad');return false;}
    if(!R||R.d!==d){callDragon(d);R.pos.set(P.x+rnd(-30,30),P.y+18,P.z+rnd(-30,30));}
    R.state='catching';R.diving=false;toast(`${d.name} is diving to catch you!`);return true;}
  function caught(){const ds=DS[R.d.id];ds.st=Math.max(0,ds.st-STAM.takeoff);P.mode='mounted';P.vy=0;canopy.visible=false;
    R.pos.set(P.x,Math.max(P.y,GY+2),P.z);R.state='flying';R.spd=14;lastId=R.d.id;toast(`${R.d.name} caught you. Back in the saddle.`,'good');}
  function forceLand(reason){if(!R)return;R.diving=false;R.state=P.mode==='mounted'?'forced':'drift';toast(reason,'bad');}
  function dragonHurt(n){const ds=DS[R.d.id];ds.hp-=n*(1-dReduce(R.d));R.m.userData.flash=.15;hurtA=Math.min(.5,hurtA+.15);
    if(ds.hp<=0&&R.state!=='forced'){ds.hp=0;ds.st=0;forceLand(`${R.d.name} is badly wounded and must land now.`);}}
  function rideKey(){
    if(P.mode==='falling'||P.mode==='chute'){if(!callCatch()&&P.mode==='falling')openChute();return;}
    if(P.mode==='grabbed'||qte)return;
    if(P.mode==='mounted'){const ds=DS[R.d.id];
      if(R.state==='flying'){R.state='landing';R.diving=false;toast(`${R.d.name} is landing.`);}
      else if(R.state==='landed'){if(ds.st<STAM.takeoff){toast(`${R.d.name} is too tired to take off. Let it rest or send it away (V).`,'bad');return;}
        ds.st-=STAM.takeoff;R.state='flying';R.spd=12;R.pos.y+=2;}
      return;}
    if(R){const ds=DS[R.d.id],d2=Math.hypot(R.pos.x-P.x,R.pos.z-P.z);
      if(ds.cd>0){swap();return;}
      if(R.state==='idle'&&d2<6){mount();return;}
      if(R.state==='idle'||R.state==='drift'){R.state='arriving';setTarget();toast(`${R.d.name} is coming to you.`);}
      return;}
    const pick=roster.find(d=>d.id===lastId&&DS[d.id].cd<=0)||roster.find(d=>DS[d.id].cd<=0);
    if(!pick){toast('Every dragon you own is still recovering.','bad');return;}
    callDragon(pick);}

  // ----- grabbing
  function findGrab(){if(!R)return null;let best=null,bd=7.5;
    const consider=(kind,obj,pos)=>{const d=pos.distanceTo(R.pos);if(d<bd){bd=d;best={kind,obj};}};
    for(const f of foes)if(f.hasRider&&(f.state==='fly'||f.state==='swoop'))consider('rider',f,f.m.position);
    for(const q of pickups)if(q.state==='ground')consider(q.kind,q,q.m.position);
    for(const so of soldiers)consider('soldier',so,so.m.position.clone().setY(so.m.position.y+1));
    return best;}
  const grabName=g=>g.kind==='rider'?'enemy rider':g.kind==='soldier'?'enemy soldier':g.kind==='scout'?'stranded scout':'supply crate';
  function grabKey(){if(P.mode!=='mounted'){toast(P.mode==='foot'?'Grab is a riding action. Mount your dragon first (R).':'You cannot grab right now.');return;}
    if(qte)return;if(held){dropHeld();return;}if(struggle)return;
    const ds=DS[R.d.id],g=findGrab();
    if(!g){toast('Nothing close enough to grab. Fly within a few metres.');return;}
    if(ds.st<STAM.grab){toast(`${R.d.name} does not have the stamina to grab.`,'bad');return;}
    ds.st-=STAM.grab;
    if(g.kind==='rider'){startPull(g.obj);return;}
    if(g.kind==='soldier'){const so=g.obj;soldiers.splice(soldiers.indexOf(so),1);held={kind:'soldier',m:so.m,hp:so.hp};toast('Enemy soldier snatched. G to drop them from a height.');return;}
    const q=g.obj;q.state='held';held={kind:q.kind,m:q.m,q};
    toast(q.kind==='scout'?'You picked up the scout. Fly to the war camp and press G over the gold ring.':'Crate grabbed. Drop it at the war camp (G over the gold ring).');}
  function dropHeld(){const h=held;held=null;const pos=h.m.position,y=pos.y;
    const overDZ=Math.hypot(pos.x-DZ.x,pos.z-DZ.z)<DZ.r&&R.pos.y<16;
    if(h.kind==='crate'||h.kind==='scout'){
      if(overDZ){h.q.state='done';pos.set(DZ.x+rnd(-4,4),0,DZ.z+rnd(-4,4));
        if(h.kind==='crate'){delivered++;toast(`Crate delivered (${delivered}/2).`,'good');}else{scoutSaved=true;toast('Scout rescued and safe at the war camp.','good');}checkWin();}
      else{h.q.state='falling';bodies.push({m:h.m,vy:0,dropH:y,openH:h.kind==='scout'?y:null,canChute:h.kind==='scout',kind:h.kind,q:h.q});
        toast(h.kind==='scout'?'You let go of the scout. They parachute down; pick them up again.':'You dropped the crate. It is back on the ground.');}
      return;}
    bodies.push({m:h.m,vy:0,dropH:y,openH:Math.min(y,rnd(2,22)),canChute:true,kind:h.kind,hp:h.hp,enemy:true});
    toast('Dropped. Watch how late they pull the chute.');}
  function checkWin(){if(cfg.tut||cfg.range)return;if(!won&&unseated>=TOTAL&&delivered>=2&&scoutSaved){won=true;toast('Patrol complete.','good');setTimeout(()=>end(true),900);}}

  // ----- the grab key prompt: press the movement keys shown, in order, before the bar runs out.
  // qte.mode 'free': an enemy grabbed you; succeed to break out of its claws and fall.
  // qte.mode 'pull': you grabbed an enemy rider; succeed to rip them off their dragon.
  // A wrong key starts the sequence again. Easy/Medium/Hard set the key count and time (PATROL_DIFFS).
  const qteSeq=n=>Array.from({length:n},()=>QTE_KEYS[Math.floor(Math.random()*QTE_KEYS.length)]);
  function renderQTE(){const el=$('#qte');if(!qte){el.hidden=true;return;}el.hidden=false;
    el.querySelector('p').textContent=qte.mode==='pull'?'Rip the rider from the saddle':'Break free from the claws';
    $('#qteKeys').innerHTML=qte.seq.map((k,i)=>`<button type="button" data-k="${k}" class="${i<qte.i?'done':i===qte.i?'next':''}">${k.slice(3)}</button>`).join('');}
  // An enemy grab is instant: you are snatched off your dragon into its claws.
  // The only way out is breaking free from the claws, which drops you from where you are.
  function startQTE(f){qte={mode:'free',foe:f,seq:qteSeq(PT.freeKeys),i:0,t:PT.freeTime,max:PT.freeTime};
    captor=f;f.state='carry';f.ang=Math.random()*Math.PI*2;carryT=5.5;P.mode='grabbed';
    if(R){R.state='drift';R.diving=false;}renderQTE();
    toast('An enemy rider snatched you off your dragon! Press the keys to break free from its claws.','bad');}
  // You grab an enemy rider: hold them in front of your dragon while you work the keys.
  function startPull(f){struggle={foe:f};f.state='struggle';qte={mode:'pull',foe:f,seq:qteSeq(PT.pullKeys),i:0,t:PT.pullTime,max:PT.pullTime};
    if(R)R.diving=false;renderQTE();toast('You grabbed an enemy rider! Press the keys to rip them from the saddle.');}
  function pullDone(won){const f=qte.foe;qte=null;struggle=null;renderQTE();
    if(!won){f.state='fly';f.stun=2;f.grabCD=8*PT.grab;toast('The rider broke free of your grip.','bad');return;}
    f.hasRider=false;f.m.remove(f.rider);f.rider.scale.setScalar(1);sc.add(f.rider);f.state='flee';f.t=0;unseated++;held={kind:'rider',m:f.rider,hp:60};
    toast(`Rider pulled off their dragon (${unseated}/${TOTAL}). Press G to drop them.`,'good');checkSpawn();checkWin();}
  function qteKey(code){code=QTE_ALIAS[code]||code;if(!qte||!QTE_KEYS.includes(code))return!!qte;
    if(code===qte.seq[qte.i]){qte.i++;if(qte.i>=qte.seq.length&&qte.mode==='pull'){pullDone(true);return true;}
      if(qte.i>=qte.seq.length){const f=qte.foe;f.state='fly';f.stun=2.5;f.grabCD=16;qte=null;renderQTE();captor=null;
      P.mode='falling';P.vy=0;P.dropH=P.y;P.openH=null;
      toast(`You broke free from the claws at ${Math.round(P.y)} m. Open your parachute (${isTouch?'Ride':'Space'})!`,'good');return true;}}
    else qte.i=0;
    renderQTE();return true;}
  function pulledOff(){qte=null;renderQTE();
    toast('You could not break free. It is carrying you higher before it drops you.','bad');}
  function openChute(){if(P.mode!=='falling')return;P.mode='chute';P.openH=P.y;P.vy=0;canopy.visible=true;}
  function playerLand(){const dmg=Math.round(fallDamage(P.dropH,P.mode==='chute'?P.openH:null)),noChute=P.mode!=='chute';
    P.y=0;P.vy=0;P.grounded=true;P.mode='foot';canopy.visible=false;
    if(R&&R.state==='catching'){R.state='arriving';setTarget();}
    if(dmg>0){toast(noChute?`You hit the ground without a parachute: ${dmg} damage.`:`Hard landing: ${dmg} fall damage. Pull the chute earlier.`,'bad');hurt(dmg);}
    else toast('Clean landing. The parachute absorbed the fall.','good');}

  // ----- combat
  function damageFoe(f,n){if(f.state==='down')return;f.hp-=n;f.m.userData.flash=.15;fxSparks(f.m.position,0xffa040,10);
    if(f.hp<=0){f.state='down';f.t=0;fxExplode(f.m.position,0x6a4a5a,2.4);
      if(struggle&&struggle.foe===f)struggle=null;
      if(qte&&qte.foe===f){qte=null;renderQTE();}
      if(f.hasRider){f.hasRider=false;unseated++;f.m.remove(f.rider);f.rider.scale.setScalar(1);f.rider.position.copy(f.m.position).add(new THREE.Vector3(0,1,0));sc.add(f.rider);
        bodies.push({m:f.rider,vy:3,dropH:f.rider.position.y,openH:Math.min(f.rider.position.y,rnd(4,20)),canChute:true,kind:'rider',hp:60,enemy:true});
        toast(`Enemy dragon downed. Its rider bailed out (${unseated}/${TOTAL}).`,'good');checkSpawn();checkWin();}}}
  function damageSoldier(so,n){if(so.tut&&tf.blockLock&&!TUTF.blocked&&wType()!=='bow'){toast('Block one of their strikes first: hold the right mouse button.');return;}if(so.dummy){rgHit(n);so.m.position.y=.25;return;}so.hp-=n;so.m.position.y=.3;so.m.userData.flash=.15;if(so.hp<=0){sc.remove(so.m);soldiers.splice(soldiers.indexOf(so),1);toast('Enemy soldier defeated.','good');}}
  function bite(){if(biteCD>0||!R)return;const ds=DS[R.d.id];if(R.state==='forced'||R.state==='landing')return;
    if(ds.st<STAM.bite){toast('Not enough stamina to bite.','bad');return;}
    ds.st-=STAM.bite;biteCD=.6;dragonBite(R.m);const head=R.pos.clone().addScaledVector(fwd3(),3),atk=dragonPower(R.d);
    for(const f of foes){if(f.state==='down'||f.state==='flee')continue;if(f.m.position.distanceTo(head)<6.5){tf.bite=true;damageFoe(f,atk*1.4);return;}}
    for(const so of soldiers){if(so.m.position.clone().setY(so.m.position.y+1).distanceTo(head)<5){damageSoldier(so,atk*1.5);return;}}}
  function footStrike(dmg){for(const so of soldiers.slice()){const d=Math.hypot(so.m.position.x-P.x,so.m.position.z-P.z);if(d<3.2&&facing(so.m.position.x,so.m.position.z)>.3)damageSoldier(so,dmg);}}
  function shootAt(f,tgt){const from=f.m.position.clone().add(new THREE.Vector3(0,.6,0)),v=tgt.clone().sub(from).normalize().multiplyScalar(28);
    const m=mesh(new THREE.SphereGeometry(.5,10,8),new THREE.MeshStandardMaterial({color:0xb05cff,emissive:0x8a3cff,emissiveIntensity:1.5}));m.position.copy(from);sc.add(m);dragonBreathe(f.m,.5);fxFireball(m,0xb05cff,.9);shots.push({m,v,life:0,dmg:cfg.tut?3:11*DIFF});}

  function move(dt){
    if(P.mode==='foot'){updatePlayer(dt);return;}
    if(P.mode==='grabbed'){if(captor){P.x=captor.m.position.x;P.y=captor.m.position.y-2.6;P.z=captor.m.position.z;}return;}
    let fz=0,fx=0;if(keys.KeyW||keys.ArrowUp)fz+=1;if(keys.KeyS||keys.ArrowDown)fz-=1;if(keys.KeyD||keys.ArrowRight)fx+=1;if(keys.KeyA||keys.ArrowLeft)fx-=1;fx+=joy.x;fz-=joy.y;
    const s=Math.sin(P.yaw),c=Math.cos(P.yaw);
    if(P.mode==='falling'||P.mode==='chute'){const sp=P.mode==='chute'?8:3;P.x+=(-s*fz+c*fx)*sp*dt;P.z+=(-c*fz-s*fx)*sp*dt;
      if(P.mode==='chute')P.y-=4*dt;else{P.vy-=22*dt;P.y+=P.vy*dt;}
      const r=Math.hypot(P.x,P.z);if(r>RAD){P.x*=RAD/r;P.z*=RAD/r;}
      if(P.y<=0)playerLand();return;}
    if(P.mode!=='mounted'||!R)return;
    const ds=DS[R.d.id];
    if(R.state==='flying'){
      const wantDive=(keys.ShiftLeft||keys.ShiftRight||touchHold.dive)&&!qte;
      if(wantDive&&!R.diving){if(ds.st>=STAM.dive){ds.st-=STAM.dive;R.diving=true;}else if(!R.noDiveMsg){toast('Not enough stamina to dive.','bad');R.noDiveMsg=1;}}
      if(!wantDive){R.diving=false;R.noDiveMsg=0;}
      const target=qte?4:R.diving?46:fz>0?24:fz<0?6:13;
      R.spd+=(target-R.spd)*Math.min(1,dt*(R.diving?3:1.6));
      const f3=fwd3();if(R.diving){f3.y=Math.min(f3.y,-.6);f3.normalize();ds.st-=STAM.diveSec*dt;}
      R.pos.addScaledVector(f3,R.spd*dt);
      if(!qte){R.pos.x+=c*fx*8*dt;R.pos.z+=-s*fx*8*dt;if(keys.Space)R.pos.y+=11*dt;if(keys.KeyC||keys.ControlLeft)R.pos.y-=11*dt;}
      R.bank+=(-fx*.5-R.bank)*Math.min(1,dt*4);
      if(R.pos.y<GY+1.2){R.pos.y=GY+1.2;R.diving=false;}if(R.pos.y>75)R.pos.y=75;
      if(R.diving){const atk=dragonPower(R.d);
        for(const f of foes){if(f.state==='down'||f.state==='flee')continue;if(f.m.position.distanceTo(R.pos)<4.5){damageFoe(f,atk*1.8);R.diving=false;toast('Dive-bomb!','good');break;}}
        for(const so of soldiers.slice()){if(so.m.position.clone().setY(1).distanceTo(R.pos)<3.8){damageSoldier(so,atk*2);R.diving=false;toast('Dive-bomb!','good');break;}}}
      ds.st-=STAM.fly*dt;
      if(ds.st<=0){ds.st=0;forceLand(`${R.d.name} ran out of stamina and is landing now.`);}}
    else if(R.state==='landing'){R.pos.y-=12*dt;R.bank*=.9;if(R.pos.y<=GY){R.pos.y=GY;R.state='landed';toast(`${R.d.name} landed. R take off · X dismount · V send away.`);}}
    else if(R.state==='forced'){R.pos.y-=15*dt;if(R.pos.y<=GY){R.pos.y=GY;exhausted();}}
    else if(R.state==='landed'){R.pos.x+=(-s*fz+c*fx)*6*dt;R.pos.z+=(-c*fz-s*fx)*6*dt;R.bank*=.9;}
    const r=Math.hypot(R.pos.x,R.pos.z);if(r>RAD){R.pos.x*=RAD/r;R.pos.z*=RAD/r;}
    if(P.mode==='mounted'){P.x=R.pos.x;P.z=R.pos.z;P.y=R.pos.y;}}

  const KEYS_RIDE='<span><kbd>W/S</kbd> speed</span><span><kbd>Mouse</kbd> steer</span><span><kbd>Space</kbd>/<kbd>C</kbd> altitude</span><span><kbd>Shift</kbd> dive-attack</span><span><kbd>Click</kbd> bite</span><span><kbd>Q</kbd> breath</span><span><kbd>G</kbd> grab/drop</span><span><kbd>R</kbd> land or take off</span><span><kbd>X</kbd> dismount</span>';
  const KEYS_FOOT='<span><kbd>WASD</kbd> move</span><span><kbd>Space</kbd> jump</span><span><kbd>Click</kbd>/<kbd>F</kbd> strike</span><span><kbd>RMB</kbd> block</span><span><kbd>R</kbd> call / mount</span><span><kbd>V</kbd> send dragon away</span><span><kbd>H</kbd> salve</span><span><kbd>1-4</kbd> power</span><span><kbd>Z</kbd> scroll</span>';

  // ----- tutorial mode (first launch): walks through riding and on-foot keys against weak enemies
  const tf={w:0,s:0,yaw:0,lastYaw:null,up:0,down:0,dive:false,breath:false,bite:false,fell:false,blockLock:false};
  let tutSteps=null,tutI=-1,tutUnseat0=0,snatcher=null;
  const dn=()=>roster[0]?roster[0].name:'your dragon';
  const flying=()=>P.mode==='mounted'&&R&&R.state==='flying';
  const liveRiders=()=>foes.filter(f=>f.hasRider&&f.state!=='down'&&f.state!=='flee'&&f!==snatcher).length;
  function tutRespawn(){P.hp=maxHp();P.mode='foot';P.y=0;P.vy=0;P.grounded=true;P.x=0;P.z=92;canopy.visible=false;qte=null;renderQTE();
    if(captor){captor.state='fly';captor=null;}if(R&&R.state==='catching'){R.state='arriving';setTarget();}hurtA=.9;
    toast(`You went down. ${cfg.range?'On the practice range':'In the tutorial'} you get straight back up at the war camp.`,'bad');}
  function makeSnatcher(){snatcher=spawnFoe();snatcher.grabCD=2.5;snatcher.fireCD=1e9;}
  if(cfg.tut)tutSteps=[
    {t:()=>`Your egg grew into ${dn()}. Walk up to it and press R to mount.`,done:()=>P.mode==='mounted'},
    {t:()=>'Press R to take off.',done:()=>flying()},
    {t:()=>'Hold W to fly faster, then hold S to slow down.',
      tick:dt=>{if(flying()){if(keys.KeyW||keys.ArrowUp)tf.w+=dt;if(keys.KeyS||keys.ArrowDown)tf.s+=dt;}},done:()=>tf.w>1&&tf.s>.6},
    {t:()=>'Steer by moving the mouse. Turn all the way around in the air.',
      tick:()=>{if(tf.lastYaw!=null&&flying())tf.yaw+=Math.abs(P.yaw-tf.lastYaw);tf.lastYaw=P.yaw;},done:()=>tf.yaw>Math.PI*1.6},
    {t:()=>'Hold Space to climb, then hold C to descend.',
      tick:dt=>{if(flying()){if(keys.Space)tf.up+=dt;if(keys.KeyC||keys.ControlLeft)tf.down+=dt;}},done:()=>tf.up>.8&&tf.down>.6},
    {t:()=>'Hold Shift to dive. A dive is fast, and flying into an enemy while diving hits it hard.',
      tick:()=>{if(R&&R.diving)tf.dive=true;},done:()=>tf.dive},
    {start:()=>{tutUnseat0=unseated;spawnFoe();spawnFoe();},t:()=>'Two weak enemy riders are flying in. Aim at one and press Q to breathe on it.',
      tick:()=>{if(!liveRiders())spawnFoe();},done:()=>tf.breath},
    {t:()=>'Fly right up to an enemy dragon and click to bite it.',tick:()=>{if(!liveRiders())spawnFoe();},done:()=>tf.bite},
    {t:()=>`Unseat the enemy riders: bite, breathe or dive into their dragons, or fly close and press G to grab a rider and press the keys shown to pull them off (${Math.min(2,unseated-tutUnseat0)}/2).`,
      tick:()=>{if(!liveRiders()&&unseated-tutUnseat0<2)spawnFoe();},done:()=>unseated-tutUnseat0>=2},
    {start:makeSnatcher,
      t:()=>P.mode==='grabbed'?'Press the keys shown to break free from its claws.':P.mode==='falling'?`Press Space to open your parachute, or R to have ${dn()} catch you.`:P.mode==='chute'?'Steer with WASD as you float down.':
        'An enemy rider is coming to snatch you off your dragon. Keep flying and let it grab you.',
      tick:()=>{if(P.mode==='falling'||P.mode==='chute'||P.mode==='grabbed')tf.fell=true;if(!tf.fell&&(!foes.includes(snatcher)||!snatcher.hasRider))makeSnatcher();},
      done:()=>tf.fell&&(P.mode==='mounted'||P.mode==='foot'),
      end:()=>{if(snatcher&&snatcher.hasRider&&snatcher.state!=='down'){snatcher.state='flee';snatcher.t=0;}snatcher=null;}},
    {t:()=>held&&held.kind==='crate'?'Carry the crate to the gold ring at the war camp and press G over the ring to drop it.':
        'Mount up and take off if you need to (R), then fly low over the supply crate and press G to grab it.',done:()=>delivered>=1},
    {t:()=>'Press R to land.',done:()=>(P.mode==='mounted'&&R&&R.state==='landed')||P.mode==='foot'},
    {t:()=>'Press X to dismount.',done:()=>P.mode==='foot'},
    {start:()=>{TUTF.blocked=false;tf.blockLock=true;for(let k=0;k<3;k++){const a=k*2.1,m=makeSoldier();m.position.set(P.x+Math.sin(a)*9,0,P.z+Math.cos(a)*9);sc.add(m);soldiers.push({m,hp:25,cd:1.5,tut:true});}},
      t:()=>'Enemy soldiers! Hold the right mouse button to block one of their strikes.',done:()=>TUTF.blocked||wType()==='bow'},
    {start:()=>{tf.blockLock=false;},t:()=>`Now strike them down: click or press F (${soldiers.filter(s=>s.tut).length} left).`,done:()=>!soldiers.some(s=>s.tut)},
    {start:()=>{TUTF.dp=false;P.dp=dpMax();},t:()=>'Use Dragon Power: stand still, press 1 for Mending, then press the keys that appear.',
      tick:()=>{if(!TUTF.dp&&!CH&&P.hp>=maxHp())P.hp=Math.max(1,maxHp()-30);},done:()=>TUTF.dp},
    {t:()=>`Press V to send ${dn()} away to rest. While it is away it heals and gets its stamina back faster.`,done:()=>!R},
    {t:()=>`Press R to call ${dn()} back.`,done:()=>R&&R.state==='idle'},
    {start:()=>{TUTF.tab=false;},t:()=>'Press Tab to open your kingdom breakdown, then close it with Esc.',done:()=>TUTF.tab},
  ];
  function tutTick(dt){if(!tutSteps)return;
    const d0=roster[0];if(d0){const ds=DS[d0.id];ds.st=Math.max(ds.st,dStam(d0)*.35);ds.hp=Math.max(ds.hp,dHp(d0)*.35);ds.cd=0;}
    if(tutI<0||tutSteps[tutI].done()){
      if(tutI>=0){const s=tutSteps[tutI];if(s.end)s.end();toast('Step complete.','good');}
      tutI++;if(tutI>=tutSteps.length){tutSteps=null;setObjective('');toast('Tutorial complete.','good');setTimeout(()=>end(true),900);return;}
      const s=tutSteps[tutI];if(s.start)s.start();}
    const s=tutSteps[tutI];if(s.tick)s.tick(dt);setObjective(`Tutorial ${tutI+1}/${tutSteps.length} · ${s.t()}`);}


  // ----- practice range: tablets to try weapons, dragons, scrolls and Dragon Power, and to spawn enemies
  const rg={passive:false,god:false,el:'fire',rar:'rare',flv:1,hits:[],last:0,total:0,loan:0};
  function makeDummy(){const g=new THREE.Group(),wood=M(0x7a5a3a),straw=M(0xc9a35a);
    g.add(mesh(new THREE.CylinderGeometry(.1,.1,2.2,6),wood,0,1.1,0));g.add(mesh(new THREE.CylinderGeometry(.42,.38,1.1,8),straw,0,1.25,0));
    g.add(mesh(new THREE.SphereGeometry(.28,8,6),straw,0,2.05,0));g.add(mesh(new THREE.BoxGeometry(1.5,.14,.14),wood,0,1.55,0));return g;}
  const RG_ENEMIES={
    dummy:{name:'Training dummy',desc:'Stands still and never dies. The bar at the top shows the damage you deal to it.',make:()=>({m:makeDummy(),hp:1e9,cd:0,dummy:true})},
    critter:{name:'Critter',desc:'Weak and quick. Bites for a little damage.',make:()=>({m:makeCritter(0xe2683a),hp:30,cd:1,dmg:4,src:'creature'})},
    soldier:{name:'Soldier',desc:'An enemy foot soldier. Blocking (hold right mouse) cuts his strikes by 90%.',make:()=>({m:makeSoldier(),hp:60,cd:1.2})},
    knight:{name:'Armored knight',desc:'Tough and hits hard. Good for testing block, salves and Dragon Power.',make:()=>({m:makeKnight(),hp:200,cd:1.4,dmg:13})},
    rider:{name:'Enemy rider dragon',desc:'Flies, spits fire and can snatch you off your dragon. Unseat it and the rider drops to fight on foot.'},
  };
  // ground enemies line up on the field in front of the camp, five to a row
  function rgSpawn(type){if(type==='rider'){spawnFoe();return;}
    const k=soldiers.filter(s=>s.rg).length,so=RG_ENEMIES[type].make();so.rg=type;
    so.m.position.set(((k%5)-2)*3.2,0,70-Math.floor(k/5)*3.2);so.m.rotation.y=0;sc.add(so.m);soldiers.push(so);}
  function rgClear(){for(const so of soldiers)sc.remove(so.m);soldiers.length=0;for(const f of foes)sc.remove(f.m);foes.length=0;
    for(const b of bodies)sc.remove(b.m);bodies.length=0;struggle=null;if(qte){qte=null;renderQTE();}
    if(captor){captor=null;if(P.mode==='grabbed'){P.mode='falling';P.vy=0;P.dropH=P.y;P.openH=null;}}}
  function rgDragon(d){if(P.mode!=='foot'){toast('Use the tablets on foot.');return;}
    if(R)removeDragon();roster.length=0;roster.push(d);DS[d.id]={hp:dHp(d),st:dStam(d),cd:0,away:true,used:false,wounded:false};
    spawnDragon(d,P.x+3,GY,P.z-4,'idle');toast(`${d.name} is here. Press R to mount.`,'good');}
  function rgLoaner(){const E=ELEMENTS[rg.el],Rr=RARITY[rIdx(rg.rar)];rg.loan++;
    return{id:-rg.loan,name:`${Rr.name} ${E.name} dragon`,rarity:rg.rar,element:rg.el,lvl:1,growth:100,imprint:50,armor:0,saddle:0,flv:rg.flv,fxp:0};}
  function rgRefill(){P.hp=maxHp();P.st=ST_MAX;P.winded=false;P.dp=dpMax();for(const k in DPS.cd)DPS.cd[k]=0;SCR.used=false;
    for(const d of roster){const ds=DS[d.id];ds.hp=dHp(d);ds.st=dStam(d);ds.cd=0;ds.wounded=false;}updateHUD();}
  function rgHit(n){rg.last=Math.round(n);rg.total+=n;rg.hits.push({t:performance.now()/1000,n});}
  const rgDps=()=>{const now=performance.now()/1000;rg.hits=rg.hits.filter(h=>now-h.t<5);return Math.round(rg.hits.reduce((a,h)=>a+h.n,0)/5);};
  function rgTick(){if(rg.god){P.hp=maxHp();for(const d of roster)DS[d.id].hp=dHp(d);}
    const dum=soldiers.some(s=>s.dummy);
    setObjective(`Practice range · ${dum?`Dummy: last hit ${rg.last} · ${rgDps()} damage per second (5s) · total ${Math.round(rg.total)}`:'Walk up to a tablet and press E'}`);}
  const onOff=(on,arg)=>`<div class="seg"><button type="button" data-act="rg" data-arg="${arg}:1" aria-pressed="${on}">On</button><button type="button" data-act="rg" data-arg="${arg}:0" aria-pressed="${!on}">Off</button></div>`;
  const P_rgWeapons={eyebrow:()=>'Practice range',title:()=>'Armory tablet',render(){
    let h=`<p class="note">Try any weapon for free. When you leave the range you go back to your ${WEAPONS[S.rangeWeapon||S.weapon].name}.</p>`;
    for(const ty of Object.keys(WTYPES)){h+=`<p class="section-h">${WTYPES[ty].name}</p><p class="note">${WTYPES[ty].desc}</p>`;
      for(const id in WEAPONS){const w=WEAPONS[id];if((w.type||'sword')!==ty)continue;
        h+=row(w.name,`${w.dmg} damage · tier ${w.lvl}`,'',S.weapon===id?'<span class="tag">In hand</span>':btn('rg','weapon:'+id,'Use'));}}
    return h;}};
  const P_rgDragons={eyebrow:()=>'Practice range',title:()=>'Dragon tablet',render(){const d0=roster[0];
    let h=`<p class="note">Summon a loaner dragon of any element, rarity and flight level, or ride one of your own. One dragon flies with you at a time. ${d0?`With you now: <b>${d0.name}</b>.`:'No dragon is with you yet.'}</p>`;
    h+='<p class="section-h">Element</p><div class="grid2">'+ELEMENT_IDS.map(e=>`<button type="button" class="pick" data-act="rg" data-arg="del:${e}" aria-pressed="${rg.el===e}"><b>${ELEMENTS[e].name}</b></button>`).join('')+'</div>';
    h+='<p class="section-h">Rarity</p><div class="grid2">'+RARITY.map(r=>`<button type="button" class="pick" data-act="rg" data-arg="rar:${r.id}" aria-pressed="${rg.rar===r.id}"><b style="color:${r.css}">${r.name}</b><span>${r.hp} base health</span></button>`).join('')+'</div>';
    h+='<p class="section-h">Flight level</p><div class="seg">'+[1,5,10].map(n=>`<button type="button" data-act="rg" data-arg="flv:${n}" aria-pressed="${rg.flv===n}">Level ${n}</button>`).join('')+'</div>';
    h+=`<p class="note">Flight level raises stamina, health and attack.</p>${btn('rg','summon','Summon this dragon',P.mode!=='foot','primary')}`;
    const own=S.dragons.filter(d=>d.growth>=100);
    h+='<p class="section-h">Your dragons</p>'+(own.length?own.map(d=>row(d.name,`${rar(d).name} ${ELEMENTS[d.element].name} · flight level ${flv(d)} · no flight XP is earned here`,'',d0&&d0.id===d.id?'<span class="tag">With you</span>':btn('rg','own:'+d.id,'Ride'))).join(''):'<p class="note">You have no fully grown dragons yet.</p>');
    return h;}};
  const P_rgSpells={eyebrow:()=>'Practice range',title:()=>'Spell tablet',render(){const cs=PRACTICE_SCROLL&&SCR.equipped===PRACTICE_SCROLL.uid?PRACTICE_SCROLL.id:null;
    let h=`<p class="section-h">Legendary scrolls</p><p class="note">Practice copies never run out and don't touch your real scrolls. Slot one, then stand still on foot, press Z and type the 3 keys shown. The blast hits everything within ${SCROLL_R}m, breaks walls and leaves you at 10% health, so refill afterwards.</p>`;
    h+=SPELLS.map(sp=>row(sp.name,`${scrollDmg()} damage at your Intelligence`,'',cs===sp.id?'<span class="tag">Slotted</span>':btn('rg','scroll:'+sp.id,'Slot'))).join('');
    h+='<p class="section-h">Dragon Power</p><p class="note">Used on foot: press 1 to 4, stand still and type the keys shown.</p>';
    h+=DP_ABIL.map(A=>row(`${A.key} · ${A.name}`,`${A.desc()} · ${A.cost} Dragon Power · ${A.cd}s cooldown`,'','')).join('');
    h+=btn('rg','refilldp','Refill Dragon Power and reset cooldowns',false,'primary');return h;}};
  const P_rgEnemies={eyebrow:()=>'Practice range',title:()=>'Enemy tablet',render(){
    let h='<p class="note">Ground enemies line up on the field in front of the camp. Close the tablet to fight them.</p>';
    h+=Object.entries(RG_ENEMIES).map(([k,e])=>row(e.name,e.desc,'',btn('rg','spawn:'+k,'Spawn')+btn('rg','spawn3:'+k,'Spawn 3'))).join('');
    const nS=soldiers.length,nF=foes.filter(f=>f.state!=='down').length;
    h+=`<p class="note">On the field: ${nS} on foot · ${nF} in the air.</p>${btn('rg','clear','Clear all enemies',!nS&&!nF,'danger')}`;
    h+='<p class="section-h">Rules</p>'+row('Enemies fight back','Turn off to make every enemy harmless while you test damage.','',onOff(!rg.passive,'fight'))+row('Invincible','Your health and your dragon\'s health never drop.','',onOff(rg.god,'god'));
    h+=row('Refill','Full health, stamina and Dragon Power, and your dragon is rested.','',btn('rg','refill','Refill'));
    h+=row('Leave the range','Back to your kingdom. Weapons and scrolls go back to what you own.','',btn('rg','leave','Leave',false,'danger'));return h;}};
  function rangeAct(arg){const i=String(arg).indexOf(':'),k=i<0?arg:arg.slice(0,i),v=i<0?'':arg.slice(i+1);
    if(k==='weapon'&&WEAPONS[v]){S.weapon=v;buildWeaponModel();toast(`${WEAPONS[v].name} in hand.`);}
    else if(k==='del')rg.el=v;else if(k==='rar')rg.rar=v;else if(k==='flv')rg.flv=+v;
    else if(k==='summon')rgDragon(rgLoaner());
    else if(k==='own'){const d=S.dragons.find(x=>String(x.id)===v);if(d)rgDragon(d);}
    else if(k==='scroll'){PRACTICE_SCROLL={uid:-1,id:v,uses:99,practice:true};SCR.equipped=-1;SCR.used=false;toast(`${spellOf(v).name} scroll slotted. Press Z on foot to read it.`);}
    else if(k==='refilldp'){P.dp=dpMax();for(const x in DPS.cd)DPS.cd[x]=0;}
    else if(k==='spawn')rgSpawn(v);else if(k==='spawn3'){for(let n=0;n<3;n++)rgSpawn(v);}
    else if(k==='clear')rgClear();
    else if(k==='fight')rg.passive=v!=='1';else if(k==='god')rg.god=v==='1';
    else if(k==='refill')rgRefill();
    else if(k==='leave'){closePanel(true);goHub(true);}}
  if(cfg.range){const TAB=[['Armory','Weapons',0xc9a35a,P_rgWeapons],['Dragon','Dragons to ride',0xe2683a,P_rgDragons],['Spell','Scrolls · Dragon Power',0x9a7be0,P_rgSpells],['Enemy','Spawn enemies · rules',0xb8452c,P_rgEnemies]];
    TAB.forEach(([nm,sub,col,panel],i)=>{const x=-12+i*8,z=87,g=new THREE.Group();g.position.set(x,0,z);
      g.add(mesh(new THREE.BoxGeometry(1.8,.4,1.1),M(0x5d554d),0,.2,0));
      const slab=mesh(new THREE.BoxGeometry(1.5,1.9,.3),M(0x6b665e),0,1.35,0);slab.rotation.x=-.25;g.add(slab);
      const face=mesh(new THREE.PlaneGeometry(1.2,1.5),new THREE.MeshBasicMaterial({color:col}),0,1.37,.17);face.rotation.x=-.25;g.add(face);
      const l=new THREE.PointLight(col,.8,8);l.position.set(0,2,.8);g.add(l);sc.add(g);
      const lab=makeLabel(`${nm} tablet`,sub,.6);lab.position.set(x,3.3,z);sc.add(lab);colliders.push({x,z,r:1});
      interact.push({x,z:z+.6,r:3,enabled:()=>P.mode==='foot',label:()=>`Use the ${nm} tablet`,action:()=>openPanel(panel)});});}

  return{kind:'patrol',tut:!!cfg.tut,range:!!cfg.range,rangeAct,scene:sc,colliders,interact,radius:RAD,move,
    arrowTargets(){const t=soldiers.map(so=>({x:so.m.position.x,z:so.m.position.z,y:so.m.position.y,h:2,r:.9,hit:d=>{if(soldiers.includes(so))damageSoldier(so,d);}}));
      for(const f of foes)if(f.state!=='down')t.push({x:f.m.position.x,z:f.m.position.z,y:f.m.position.y-1.6,h:3.2,r:2.4,hit:d=>damageFoe(f,d)});return t;},
    scrollTargets(){return soldiers.filter(so=>so.m.position.y<.5).map(so=>({x:so.m.position.x,z:so.m.position.z,r:1.1,hit:d=>{if(soldiers.includes(so))damageSoldier(so,d);}}));},
    squireTargets(){return soldiers.filter(so=>so.m.position.y<.5&&!so.dummy).map(so=>({x:so.m.position.x,z:so.m.position.z,r:1.1,hit:d=>{if(soldiers.includes(so))damageSoldier(so,d);}}));},
    cleanup(){if(cfg.range){PRACTICE_SCROLL=null;if(SCR.equipped===-1)SCR.equipped=null;if(S.rangeWeapon){S.weapon=S.rangeWeapon;delete S.rangeWeapon;buildWeaponModel();save();}}
      camera.remove(canopy);canopy.geometry.dispose();canopy.material.dispose();qte=null;renderQTE();touchHold.dive=false;},
    abandon(){if(cfg.range){goHub(true);return;}end(false,cfg.tut?'You skipped the rest of the tutorial.':'You abandoned the patrol.');},
    onDeath(){if(cfg.tut||cfg.range){tutRespawn();return;}end(false,'You fell in battle. On a dragon mission, failing sends you back to the kingdom.');},
    onAttack(dmg){if(P.mode==='mounted')bite();else if(P.mode==='foot')footStrike(dmg);},
    onBreath(){if(P.mode!=='mounted'||!R){toast(R?'Mount your dragon (R) to use its breath.':'Call your dragon (R) first.');return;}
      if(breathCD>0||R.state==='forced')return;const ds=DS[R.d.id];
      if(ds.st<STAM.breath){toast('Not enough stamina for breath.','bad');return;}
      ds.st-=STAM.breath;breathCD=.8;const f3=fwd3(),o=camera.getWorldPosition(new THREE.Vector3()).addScaledVector(f3,3),col=ELEMENTS[R.d.element].color;
      const m=mesh(new THREE.SphereGeometry(.7,10,8),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.6}));m.position.copy(o);sc.add(m);dragonBreathe(R.m,.45);fxFireball(m,col,1.3);
      tf.breath=true;myShots.push({m,col,v:f3.multiplyScalar(60),life:0,dmg:dragonPower(R.d)*1.1});},
    onKey(code){
      if(qte)return qteKey(code);
      if(code==='Space'){if(P.mode==='falling'){openChute();return true;}return P.mode==='mounted'||P.mode==='chute';}
      if(code==='KeyR'){rideKey();return true;}
      if(code==='KeyG'){grabKey();return true;}
      if(code==='KeyX'){if(P.mode==='mounted'&&R.state==='landed')dismount();else if(P.mode==='mounted')toast('Land first (R) to dismount.');return true;}
      if(code==='KeyV'){sendAway();return true;}
      return false;},
    placeCam(){weaponRig.visible=P.mode==='foot';
      if(P.mode==='mounted'&&R){R.m.updateMatrixWorld();camera.position.copy(R.m.localToWorld(new THREE.Vector3(0,2.25,-1.3)));camera.rotation.set(P.pitch,P.yaw,R.bank*.4);}
      else{camera.position.set(P.x,P.y+1.7+(P.mode==='foot'&&P.grounded?Math.sin(P.bob)*.05:0),P.z);camera.rotation.set(P.pitch,P.yaw,0);}},
    keyHints(){return P.mode==='mounted'?KEYS_RIDE:KEYS_FOOT;},
    hint(){if(qte)return null;
      const catchTxt=R&&R.state==='catching'?` · ${R.d.name} comes to catch you`:catchable()?` · <kbd>${isTouch?'Ride':'R'}</kbd>Call dragon to catch you`:'';
      if(P.mode==='falling')return isTouch?`<kbd>Ride</kbd>Call dragon or open parachute`:`<kbd>Space</kbd>Open parachute${catchTxt}`;
      if(P.mode==='chute')return `Parachute open · press WASD to steer${catchTxt}`;
      if(P.mode==='grabbed')return 'The rider carries you. Get ready to open the parachute.';
      if(P.mode==='mounted'&&R){if(struggle)return 'Hold the rider.';
        if(held){const over=Math.hypot(held.m.position.x-DZ.x,held.m.position.z-DZ.z)<DZ.r&&R.pos.y<16;return over?`<kbd>G</kbd>Drop the ${held.kind==='scout'?'scout':held.kind==='crate'?'crate':'soldier'} at the war camp`:`<kbd>G</kbd>Drop the ${held.kind==='rider'?'rider':held.kind}`;}
        const g=findGrab();if(g)return `<kbd>G</kbd>Grab the ${grabName(g)}`;
        if(R.state==='landed')return '<kbd>R</kbd>Take off · <kbd>X</kbd>Dismount · <kbd>V</kbd>Send away';return null;}
      if(P.mode==='foot'){if(!R)return roster.length?'<kbd>R</kbd>Call a dragon':null;const ds=DS[R.d.id],d2=Math.hypot(R.pos.x-P.x,R.pos.z-P.z);
        if(ds.cd>0)return `${R.d.name} recovers (${fmtShort(ds.cd)}) · <kbd>R</kbd>Call another dragon · <kbd>V</kbd>Send it away`;
        if(R.state==='idle'&&d2<6)return `<kbd>R</kbd>Mount ${R.d.name}`;
        if(R.state==='idle'||R.state==='drift')return `<kbd>R</kbd>Call ${R.d.name}`;}
      return null;},
    dragonHud(){const d=R?R.d:roster.find(x=>x.id===lastId)||roster[0];if(!d)return null;const ds=DS[d.id];let st;
      if(ds.cd>0)st=`Recovering ${fmtShort(ds.cd)}`;else if(!R||R.d!==d)st='Away · resting';
      else if(P.mode==='mounted')st=R.state==='flying'?(R.diving?'Diving':'Flying'):R.state==='landing'?'Landing':R.state==='forced'?'Forced landing':'Landed';
      else st=R.state==='arriving'?'Arriving':R.state==='drift'?'Riderless':'Waiting';
      return{name:d.name,hp:ds.hp,hpMax:dHp(d),st:ds.st,stMax:dStam(d),status:st};},
    update(dt,t,active){
      campLight.intensity=1.3+Math.sin(t*2)*.2;
      if(R){tickFlash(R.m,dt);const fl=(R.state==='landed'||R.state==='idle');flap(R.m,t,fl?1.4:R.diving?2:5,fl?.2:R.diving?.15:.7);}
      for(const f of foes){tickFlash(f.m,dt);flap(f.m,t+f.ang,6,.7);}
      if(!active)return;
      breathCD=Math.max(0,breathCD-dt);biteCD=Math.max(0,biteCD-dt);
      // dragon recovery: slow while landed, faster when sent away
      for(const d of roster){const ds=DS[d.id];if(ds.cd>0){ds.cd-=dt;if(ds.cd<=0){ds.cd=0;if(ds.wounded){ds.wounded=false;ds.hp=Math.max(ds.hp,Math.round(dHp(d)*.25));}toast(`${d.name} has recovered and can fly again.`,'good');}}
        const present=R&&R.d===d;
        if(ds.away)ds.st=Math.min(dStam(d),ds.st+STAM.awayRegen*dt);
        else if(present&&(R.state==='landed'||R.state==='idle'))ds.st=Math.min(dStam(d),ds.st+STAM.landRegen*dt);}
      // dragon visuals and riderless behaviour
      if(R){if(P.mode==='mounted'){R.m.rotation.set(R.state==='landed'?0:-P.pitch*.45+(R.diving?.5:0),P.yaw+Math.PI,R.bank);}
        else if(R.state==='drift'){R.pos.y-=8*dt;if(R.pos.y<=GY){R.pos.y=GY;R.state='idle';}}
        else if(R.state==='catching'){if(P.mode!=='falling'&&P.mode!=='chute'){R.state='arriving';setTarget();}
          else{const tgt=new THREE.Vector3(P.x,P.y-1.5,P.z),dir=tgt.clone().sub(R.pos),d=dir.length();
            if(d<3.2)caught();else{R.pos.addScaledVector(dir.normalize(),Math.min(d,48*dt));R.m.lookAt(tgt);flap(R.m,t,2,.15);}}}
        else if(R.state==='arriving'){const dir=R.target.clone().sub(R.pos),d=dir.length();if(d<.8){R.pos.copy(R.target);R.state='idle';toast(`${R.d.name} is here. R to mount.`);}
          else{R.pos.addScaledVector(dir.normalize(),Math.min(d,24*dt));R.m.lookAt(R.target.x,R.pos.y,R.target.z);}}
        else if(R.state==='idle'){const want=Math.atan2(P.x-R.pos.x,P.z-R.pos.z);R.m.rotation.set(0,want,0);}}
      // carried player
      if(captor){carryT-=dt;if(carryT<=0){const f=captor;captor=null;f.state='fly';f.grabCD=20;P.mode='falling';P.vy=0;P.dropH=P.y;P.openH=null;
        toast(`Dropped from ${Math.round(P.y)} m! Open your parachute (${isTouch?'Ride':'Space'}). Too late costs you.`,'bad');}}
      if(qte){qte.t-=dt;$('#qteFill').style.width=(clamp(qte.t/qte.max,0,1)*100)+'%';if(qte.t<=0){if(qte.mode==='pull')pullDone(false);else pulledOff();}}
      // your grip on an enemy rider
      // (your grip on an enemy rider is resolved by the key prompt: see startPull / pullDone)
      if(held&&R){const f=fwd();held.m.position.set(R.pos.x+f.x*.8,R.pos.y-2.6,R.pos.z+f.z*.8);if(held.m.position.y<0)held.m.position.y=0;}
      // enemy riders
      const tgt=playerPos();
      for(let i=foes.length-1;i>=0;i--){const f=foes[i];f.t+=dt;
        if(f.state==='down'){f.m.position.y-=12*dt;f.m.rotation.z+=dt*2;if(f.m.position.y<1){sc.remove(f.m);foes.splice(i,1);}continue;}
        if(f.state==='flee'){const away=f.m.position.clone().sub(tgt).setY(0).normalize();f.m.position.addScaledVector(away,20*dt);f.m.position.y+=6*dt;if(f.t>6){sc.remove(f.m);foes.splice(i,1);}continue;}
        if(f.state==='struggle'&&R){f.m.position.lerp(R.pos.clone().addScaledVector(fwd3(),4.5),Math.min(1,dt*6));f.m.lookAt(R.pos);continue;}
        if(f.state==='hook'&&R){f.m.position.lerp(R.pos.clone().add(new THREE.Vector3(0,3.2,0)),Math.min(1,dt*6));continue;}
        if(f.state==='carry'){f.m.position.y=Math.min(70,f.m.position.y+7*dt);f.m.position.x+=Math.cos(f.ang)*8*dt;f.m.position.z+=Math.sin(f.ang)*8*dt;
          f.m.lookAt(f.m.position.x+Math.cos(f.ang),f.m.position.y,f.m.position.z+Math.sin(f.ang));continue;}
        if(f.stun>0){f.stun-=dt;f.m.position.y+=2*dt;continue;}
        if(rg.passive){f.grabCD=Math.max(f.grabCD,3);f.fireCD=Math.max(f.fireCD,2);}f.grabCD-=dt;f.fireCD-=dt;
        if(f.state==='swoop'){const dir=tgt.clone().sub(f.m.position),d=dir.length();f.m.position.addScaledVector(dir.normalize(),Math.min(d,30*dt));f.m.lookAt(tgt);
          if(d<4.5&&P.mode==='mounted'&&R&&R.state==='flying'&&!qte&&!struggle)startQTE(f);
          else if(f.t>4||P.mode!=='mounted'){f.state='fly';f.grabCD=8;}
          continue;}
        f.ang+=dt*.45;const want=tgt.clone().add(new THREE.Vector3(Math.cos(f.ang)*24,6+Math.sin(t*.8+i)*3,Math.sin(f.ang)*24));want.y=Math.max(8,want.y);
        const dir=want.sub(f.m.position),d=dir.length();if(d>.1)f.m.position.addScaledVector(dir.normalize(),Math.min(d,18*dt));
        f.m.lookAt(tgt.x,f.m.position.y,tgt.z);
        if(f.fireCD<=0&&f.m.position.distanceTo(tgt)<70&&P.mode!=='grabbed'){f.fireCD=rnd(2.2,3.6)/Math.sqrt(DIFF);shootAt(f,tgt);}
        if(f.grabCD<=0&&P.mode==='mounted'&&R&&R.state==='flying'&&!qte&&!struggle&&f.m.position.distanceTo(tgt)<30&&!foes.some(o=>['swoop','hook','carry'].includes(o.state))){f.state='swoop';f.t=0;}}
      // enemy fire
      for(let i=shots.length-1;i>=0;i--){const sh=shots[i];sh.life+=dt;sh.m.position.addScaledVector(sh.v,dt);let hit=false;
        if(P.mode==='mounted'&&R){if(sh.m.position.distanceTo(R.pos)<2.8){dragonHurt(sh.dmg);hit=true;}}
        else if(P.mode!=='grabbed'&&sh.m.position.distanceTo(new THREE.Vector3(P.x,P.y+1,P.z))<1.5){hurt(sh.dmg);hit=true;}
        if(hit||sh.m.position.y<0||sh.life>5){if(hit||sh.m.position.y<0)fxExplode(sh.m.position,0xb05cff,hit?1.4:1.1);sc.remove(sh.m);shots.splice(i,1);}}
      // your breath
      for(let i=myShots.length-1;i>=0;i--){const sh=myShots[i];sh.life+=dt;sh.m.position.addScaledVector(sh.v,dt);let hit=false;
        for(const f of foes){if(f.state==='down'||f.state==='flee')continue;if(sh.m.position.distanceTo(f.m.position)<3.4){damageFoe(f,sh.dmg);hit=true;break;}}
        if(!hit)for(const so of soldiers){if(sh.m.position.distanceTo(so.m.position.clone().setY(1))<2.2){damageSoldier(so,sh.dmg);hit=true;break;}}
        if(!hit&&sh.m.position.y<.3){for(const so of soldiers.slice())if(Math.hypot(so.m.position.x-sh.m.position.x,so.m.position.z-sh.m.position.z)<4)damageSoldier(so,sh.dmg*.5);hit=true;}
        if(hit||sh.life>1.6){fxExplode(sh.m.position,sh.col,hit?2.2:.8);sc.remove(sh.m);myShots.splice(i,1);}}
      // falling bodies (dropped riders, crates, the scout)
      for(let i=bodies.length-1;i>=0;i--){const b=bodies[i];
        if(b.chute)b.m.position.y-=4*dt;else{b.vy-=22*dt;b.m.position.y+=b.vy*dt;if(b.canChute&&b.m.position.y<=b.openH){b.chute=true;b.canopy=makeCanopy();b.m.add(b.canopy);}}
        if(b.m.position.y<=0){b.m.position.y=0;if(b.canopy)b.m.remove(b.canopy);bodies.splice(i,1);
          if(b.enemy){const dmg=fallDamage(b.dropH,b.chute?b.openH:null),hp=b.hp-dmg;
            if(hp<=0){sc.remove(b.m);toast(`The rider hit the ground hard (${Math.round(dmg)} damage) and is out of the fight.`,'good');}
            else{soldiers.push({m:b.m,hp,cd:1});toast(dmg>0?`The rider took ${Math.round(dmg)} fall damage and fights on below.`:'The rider pulled the chute in time and fights on below.');}}
          else b.q.state='ground';}}
      // unseated riders fight on foot
      for(const so of soldiers){so.cd-=dt;so.m.position.y=Math.max(0,so.m.position.y-dt);if(!so.dummy)enemyAnim(so.m,dt);
        if(P.mode!=='foot'||so.dummy||rg.passive)continue;const dx=P.x-so.m.position.x,dz=P.z-so.m.position.z,d=Math.hypot(dx,dz)||1e-3;
        if(d<40&&d>1.3){so.m.position.x+=dx/d*4.5*dt;so.m.position.z+=dz/d*4.5*dt;so.m.rotation.y=Math.atan2(dx,dz);}
        if(d<1.8&&so.cd<=0){enemyStrike(so.m);hurt((so.dmg||7)*DIFF,so.src||'player-melee');so.cd=1.1;}}
      // objective
      if(cfg.tut){tutTick(dt);return;}
      if(cfg.range){rgTick(dt);return;}
      if(!won)setObjective(`Unseat enemy riders ${unseated}/${TOTAL} · Crates ${delivered}/2 · Scout ${scoutSaved?'rescued':'missing'}${held&&held.kind!=='rider'&&held.kind!=='soldier'?' · Fly to the war camp.':''}`);
    }};
}
