// ========================================================================
// DragonBlood · Scene: Holy Tree trial
// On foot: destroy shrines, plant the seed, hold the ground. Plus the Holy Tree panel.
// ========================================================================
'use strict';
// On foot. Destroy the three corrupted shrines, then plant the holy seed at the sacred spring and hold the
// ground while it takes root. The new tree yields holy bark: Easy 2, Medium 3-4, Hard 5.
const TRIALS={
  easy:{name:'Easy',D:1,bark:[2,2],gold:0,mul:1},
  medium:{name:'Medium',D:1.45,bark:[3,4],gold:100,mul:1.6},
  hard:{name:'Hard',D:2.1,bark:[5,5],gold:250,mul:2.4},
};
function startTrial(diff){const T_=TRIALS[diff];if(!T_||S.carriedEgg)return;if(S.gold<T_.gold){toast(`A ${T_.name} trial costs ${T_.gold} gold.`,'bad');return;}
  S.gold-=T_.gold;const cfg={kind:'trial',diff,element:MP.trialEl,D:T_.D,high:diff==='hard',lvl:{easy:1,medium:3,hard:6}[diff],timeLimit:900,seed:Math.floor(Math.random()*1e9)};
  closePanel(true);missionOver=false;
  setScene(buildTrial(cfg));P.x=0;P.z=36;P.yaw=0;P.pitch=0;P.hp=maxHp();save();
  toast(`Holy Tree Trial (${T_.name}, ${ELEMENTS[MP.trialEl].name} grove): cleanse the three corrupted shrines.`);}
function buildTrial(cfg){
  const D=cfg.D,di={easy:0,medium:1,hard:2}[cfg.diff];
  const sc=baseScene(0x1c2620,22,100);const colliders=[],interact=[];
  const ground=mesh(new THREE.CircleGeometry(62,48),M(0x26331f));ground.rotation.x=-Math.PI/2;sc.add(ground);
  for(let i=0;i<44;i++){const a=i/44*Math.PI*2,h=10+Math.random()*10;const t=mesh(new THREE.ConeGeometry(3.4,h,6),M(0x1d2e1b),Math.sin(a)*48,h/2,Math.cos(a)*48);sc.add(t);}
  const rand=rng(cfg.seed);
  for(let i=0;i<22;i++){const a=rand()*Math.PI*2,r=9+rand()*30,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.hypot(x,z-34)<6||Math.hypot(x,z)<7)continue;
    if(rand()<.5){const h=3+rand()*4,t=new THREE.Group();t.position.set(x,0,z);t.add(mesh(new THREE.CylinderGeometry(.22,.32,h*.4,6),M(0x4a3426),0,h*.2,0));t.add(mesh(new THREE.ConeGeometry(1.4,h*.8,6),M(0x2f4a2c),0,h*.6,0));sc.add(t);colliders.push({x,z,r:.8,obj:t});}
    else{const s=1+rand()*1.8,rk=mesh(new THREE.DodecahedronGeometry(s,0),M(0x4f4a44),x,s*.55,z);rk.rotation.set(rand()*3,rand()*3,0);sc.add(rk);colliders.push({x,z,r:s*.9,obj:rk});}}
  addWall(sc,colliders,-12,18,.4,8);addWall(sc,colliders,12,-12,-.6,8);
  // sacred spring + seedling tree that grows when planted
  const spring=mesh(new THREE.CircleGeometry(3,32),new THREE.MeshStandardMaterial({color:0x6fd0c0,emissive:0x2a8f80,emissiveIntensity:.8}));spring.rotation.x=-Math.PI/2;spring.position.y=.05;sc.add(spring);
  const rim=mesh(new THREE.TorusGeometry(3.4,.35,6,28),M(0x8f8a7c));rim.rotation.x=Math.PI/2;rim.position.y=.15;sc.add(rim);
  const tree=new THREE.Group();tree.add(mesh(new THREE.CylinderGeometry(.35,.6,4,8),M(0xd8c79a,{emissive:0x5a4a20,emissiveIntensity:.4}),0,2,0));
  const crown=mesh(new THREE.IcosahedronGeometry(2.6,1),new THREE.MeshStandardMaterial({color:0xf2e6a8,emissive:0xd8b850,emissiveIntensity:.7,flatShading:true}),0,5,0);tree.add(crown);
  tree.scale.setScalar(.01);tree.visible=false;sc.add(tree);
  const springLab=makeLabel('Sacred Spring','Plant the holy seed here',.6);springLab.position.set(0,4,0);springLab.visible=false;sc.add(springLab);
  // corrupted shrines
  const shrines=[];
  for(const[x,z]of[[-22,6],[22,4],[0,-24]]){const g=new THREE.Group();g.position.set(x,0,z);
    const ob=mesh(new THREE.CylinderGeometry(.7,1.2,4.5,4),new THREE.MeshStandardMaterial({color:0x2a1f33,emissive:new THREE.Color(ELEMENTS[cfg.element||'fire'].color).multiplyScalar(.6),emissiveIntensity:.9,flatShading:true}),0,2.25,0);g.add(ob);g.userData.mats=[ob.material];
    g.add(mesh(new THREE.TorusGeometry(1.6,.12,6,20),new THREE.MeshBasicMaterial({color:0x9b6bff}),0,.2,0));g.children[1].rotation.x=Math.PI/2;
    const lab=makeLabel('Corrupted Shrine','Destroy it',.55);lab.position.y=5.6;g.add(lab);sc.add(g);
    const col={x,z,r:1.4};colliders.push(col);const hp=Math.round(160*D);shrines.push({g,ob,x,z,hp,max:hp,col,spawnT:rnd(1,4)});}
  // hollow husks (corrupted creatures)
  const husks=[];const maxH=5+2*di;
  function spawnHusk(x,z){const m=makeCritter(0x9b6bff);m.position.set(x,0,z);sc.add(m);husks.push({m,hp:Math.round(40*D),cd:.6});}
  for(const s of shrines)for(let i=0;i<2;i++)spawnHusk(s.x+rnd(-3,3),s.z+rnd(-3,3));
  let phase='shrines',timeLeft=cfg.timeLimit,deaths=0,plantP=0,growT=0,edgeT=3,checkpoint={x:0,z:36};const PLANT=8;
  const portal=makePortal(0xc9a35a);portal.position.set(0,0,40);sc.add(portal);
  function end(success,reason){if(missionOver)return;finishMission({kind:'trial',success,reason,cfg,deaths});}
  function killHusk(h){const i=husks.indexOf(h);if(i<0)return;sc.remove(h.m);husks.splice(i,1);}
  function hitShrine(s,d){if(s.hp<=0)return;s.hp-=d;s.g.userData.flash=.15;
    if(s.hp<=0){sc.remove(s.g);colliders.splice(colliders.indexOf(s.col),1);const left=shrines.filter(x=>x.hp>0).length;
      toast(left?`Shrine cleansed. ${left} left.`:'All shrines cleansed. Plant the holy seed at the sacred spring.','good');
      if(!left){phase='plant';springLab.visible=true;checkpoint={x:0,z:8};}}}
  const live=()=>shrines.filter(s=>s.hp>0);
  interact.push({x:0,z:0,r:3.4,enabled:()=>phase==='plant'&&plantP===0,label:()=>'Plant the holy seed',action:()=>{plantP=.001;toast('The seed is in the earth. Stay at the spring while it takes root.');}});
  const targets=(withY)=>{const t=husks.map(h=>({x:h.m.position.x,z:h.m.position.z,r:1.1,y:0,h:1.6,hit:d=>{h.hp-=d;h.m.userData.flash=.12;if(h.hp<=0)killHusk(h);}}));
    for(const s of live())t.push({x:s.x,z:s.z,r:1.5,y:0,h:4.6,hit:d=>hitShrine(s,d)});return t;};
  return{kind:'trial',scene:sc,colliders,interact,radius:44,
    squireTargets:()=>targets(),arrowTargets:()=>targets(),
    abandon(){end(false,'You abandoned the trial.');},
    onDeath(){deaths++;P.hp=maxHp();P.x=checkpoint.x;P.z=checkpoint.z;P.yaw=0;P.pitch=0;hurtA=.9;if(plantP>0){plantP=0;toast('You fell. The seed must be planted again.','bad');}
      for(const h of husks){const dx=h.m.position.x-P.x,dz=h.m.position.z-P.z,d=Math.hypot(dx,dz)||1;if(d<10){h.m.position.x=P.x+dx/d*12;h.m.position.z=P.z+dz/d*12;}}
      toast(`You fell and respawned at the last checkpoint. Deaths: ${deaths}.`,'bad');},
    onAttack(dmg){for(const h of husks.slice()){const d=Math.hypot(h.m.position.x-P.x,h.m.position.z-P.z);if(d<3.2&&facing(h.m.position.x,h.m.position.z)>.3){h.hp-=dmg;h.m.userData.flash=.12;if(h.hp<=0)killHusk(h);}}
      for(const s of live()){const d=Math.hypot(s.x-P.x,s.z-P.z);if(d<3.6&&facing(s.x,s.z)>.3)hitShrine(s,dmg);}},
    update(dt,t,active){portal.userData.disc.material.opacity=.45+Math.sin(t*3)*.15;
      for(const s of live()){tickFlash(s.g,dt);s.ob.rotation.y+=dt*.4;}
      if(tree.visible&&tree.scale.x<1){tree.scale.setScalar(Math.min(1,tree.scale.x+dt*.45));}crown.rotation.y+=dt*.2;
      if(!active)return;
      timeLeft-=dt;if(timeLeft<=0){end(false,'Time ran out. On a timed mission, running out of time counts as failing.');return;}
      // spawning
      if(phase==='shrines'){for(const s of live()){s.spawnT-=dt;if(s.spawnT<=0){s.spawnT=rnd(5,7)/D;if(husks.length<maxH)spawnHusk(s.x+rnd(-2,2),s.z+rnd(-2,2));}}
        setObjective(`Destroy the corrupted shrines: ${3-live().length}/3 · ${fmtShort(timeLeft)} left`);}
      else if(phase==='plant'){
        if(plantP>0){edgeT-=dt;if(edgeT<=0){edgeT=rnd(2.6,3.6)/D;if(husks.length<maxH+2){const a=Math.random()*Math.PI*2;spawnHusk(Math.sin(a)*30,Math.cos(a)*30);}}
          const inRing=Math.hypot(P.x,P.z)<4;if(inRing)plantP+=dt;
          setObjective(inRing?`The seed takes root: ${Math.floor(plantP/PLANT*100)}%. Stay at the spring.`:`Return to the spring. The seed grows only while you stand by it (${Math.floor(plantP/PLANT*100)}%).`);
          if(plantP>=PLANT){phase='grow';tree.visible=true;springLab.visible=false;toast('The holy tree takes root and grows.','good');for(const h of husks)sc.remove(h.m);husks.length=0;}}
        else setObjective(`Plant the holy seed at the sacred spring. Press E. ${fmtShort(timeLeft)} left`);}
      else if(phase==='grow'){growT+=dt;setObjective('The new holy tree sheds its bark.');if(growT>2.6){end(true);return;}}
      // husk AI
      for(const h of husks){h.cd-=dt;tickFlash(h.m,dt);const dx=P.x-h.m.position.x,dz=P.z-h.m.position.z,dd=Math.hypot(dx,dz)||1e-3;
        if(dd>1.3){const sp=(4.2+.5*di);h.m.position.x+=dx/dd*sp*dt;h.m.position.z+=dz/dd*sp*dt;h.m.rotation.y=Math.atan2(dx,dz);h.m.position.y=Math.abs(Math.sin(t*10))*.1;}
        if(dd<1.7&&h.cd<=0){hurt(6*D);h.cd=1.1;}}
    }};
}
const P_tree={eyebrow:()=>'Sacred grove',title:()=>'Holy Tree',render(){
  const inv=barkInv(),w=WEAPONS[S.weapon],socks=socketsOf(S.weapon);
  let h=`<p class="note">Holy bark is cut from trees you plant on Holy Tree Trials (Mission Gate). Each dragon element has its own bark with its own effect. Bark drops as Seedling; combine ${BARK_COMBINE} of the same kind and tier into 1 of the next tier. Only the sockets of your equipped weapon count.</p>`;
  h+=`<p class="section-h">Sockets · ${w.name}</p><p class="note">${socks.length} socket${socks.length>1?'s':''} (tier 1–2 weapons have 1, tier 3–4 have 2, tier 5 has 3). Damage per ${wType()==='bow'?'arrow':'strike'}: ${w.dmg} → <b>${weaponDmg()}</b>. ${barkSummary(S.weapon)?`Active: <b>${barkSummary(S.weapon)}</b>.`:'No bark set yet.'} Change your equipped weapon at the Blacksmith.</p>`;
  const owned=[];for(const e of BARK_IDS)inv[e].forEach((n,i)=>{if(n>0)owned.push([e,i+1]);});
  socks.forEach((s,si)=>{const opts=owned.filter(([e,t])=>!(s&&s.e===e&&s.t===t)).map(([e,t])=>btn('setBark',`${si}:${e}:${t}`,`${BARK_TYPES[e].name.replace('bark','')} T${t}`)).join('');
    h+=row(`Socket ${si+1}`,s?`<span style="color:#${ELEMENTS[s.e].color.toString(16).padStart(6,'0')}">${barkName(s.e,s.t)}</span> · ${BARK_TYPES[s.e].fx(BARK_TYPES[s.e].vals[s.t-1])}`:'Empty','',(opts+(s?btn('removeBark',si,'Remove'):''))||'<span class="tag dim">No bark</span>');});
  h+='<p class="section-h">Your holy bark</p>';
  for(const e of BARK_IDS){const T=BARK_TYPES[e],E=ELEMENTS[e],c='#'+E.color.toString(16).padStart(6,'0');
    h+=`<div class="dcard"><div class="dhead"><span class="dname" style="font-size:22px;color:${c}">${T.name}</span><span style="color:var(--smoke)">${E.name} · ${T.fx(T.vals[0])} → ${T.fx(T.vals[4]).replace(/^[+-]?/,'')} by tier</span></div>
      <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr))">${BARK_TIERS.map((nm,i)=>`<div style="border:1px solid var(--line);border-radius:3px;padding:6px 8px;display:grid;gap:4px"><span style="font-size:13px">${nm} <b style="font-family:var(--mono)">×${inv[e][i]}</b></span>${i<4?btn('combineBark',`${e}:${i}`,`Combine ${BARK_COMBINE}`,inv[e][i]<BARK_COMBINE):'<span class="tag dim" style="text-align:center">Top tier</span>'}</div>`).join('')}</div></div>`;}
  return h;}};
