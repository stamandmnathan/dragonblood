// ========================================================================
// DragonBlood · Scene: Tutorial nest
// First-launch on-foot tutorial, plus the practice range and tutorial starters.
// ========================================================================
'use strict';
// Part 1 on foot: move, sprint, fight nest guards, salve, take an egg. Part 2: Sky Patrol tutorial mode.
const TUTF={};
const TUT_EGGS=[{el:'electric',name:'Lightning'},{el:'poison',name:'Poison'},{el:'fire',name:'Fire'},{el:'ice',name:'Ice'}];
function buildTutorialNest(){
  const sc=baseScene(0x2b1714,30,120);const colliders=[],interact=[];
  const ground=mesh(new THREE.CircleGeometry(62,48),M(0x2c2321));ground.rotation.x=-Math.PI/2;sc.add(ground);
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2,h=9+Math.random()*12;sc.add(mesh(new THREE.ConeGeometry(4+Math.random()*3,h,5),M(0x221a18),Math.sin(a)*48,h/2-.5,Math.cos(a)*48));}
  const rand=rng(4242);
  for(let i=0;i<14;i++){const a=rand()*Math.PI*2,r=16+rand()*20,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.abs(x)<8)continue;
    const s=1+rand()*1.8,rock=mesh(new THREE.DodecahedronGeometry(s,0),M(0x3a2e2a),x,s*.6,z);rock.rotation.set(rand()*3,rand()*3,0);sc.add(rock);colliders.push({x,z,r:s*.9,obj:rock});}
  const NZ=-12;
  const bed=mesh(new THREE.CircleGeometry(4.4,32),M(0x4a3626));bed.rotation.x=-Math.PI/2;bed.position.set(0,.04,NZ);sc.add(bed);
  const rim=mesh(new THREE.TorusGeometry(4.6,.6,6,24),M(0x1e1614));rim.rotation.x=Math.PI/2;rim.position.set(0,.2,NZ);sc.add(rim);
  const glow=new THREE.PointLight(0xff8a4a,1.8,26);glow.position.set(0,3,NZ);sc.add(glow);
  const eggs=TUT_EGGS.map((E,i)=>{const x=-3+i*2,z=NZ+.5,m=makeEgg(E.el);m.position.set(x,.75,z);sc.add(m);
    const lab=makeLabel(E.name,'Egg',.5);lab.position.set(x,2.3,z);sc.add(lab);return{E,x,z,m,lab,ph:i};});
  const mom=makeDragon(0x8a4a3a,2.4);mom.position.set(0,1.4,-24);sc.add(mom);
  const crits=[[-5,16],[5,13],[0,8]].map(([x,z])=>{const m=makeCritter(0xe2683a);m.position.set(x,0,z);m.rotation.y=Math.PI;sc.add(m);return{m,hp:20,cd:0};});
  let stepI=-1,chosen=null,awake=false,portal=null,moved=0,lx=0,lz=34,momT=0,momAng=-Math.PI/2,fireCD=2.5;const proj=[];
  const stepId=()=>steps[stepI]&&steps[stepI].id;
  function pick(E){if(chosen)return;chosen=E.el;const e=eggs.find(x=>x.E===E);sc.remove(e.m);sc.remove(e.lab);
    const col=ELEMENTS[E.el].color;eggVM.material.color.setHex(col);eggVM.material.emissive.setHex(col);eggVM.visible=true;
    toast(`You took the ${E.name} egg.`,'good');}
  for(const e of eggs)interact.push({x:e.x,z:e.z,r:1.6,enabled:()=>stepId()==='choose'&&!chosen,label:()=>`Take the ${e.E.name} egg`,action:()=>pick(e.E)});
  function wake(){awake=true;momT=0;portal=makePortal(0xc9a35a);portal.position.set(0,0,32);sc.add(portal);toast('The mother dragon is waking up!','bad');}
  const steps=[
    {t:()=>'Move with WASD and look around with the mouse. Click the view to lock the mouse.',
      tick:()=>{moved+=Math.hypot(P.x-lx,P.z-lz);lx=P.x;lz=P.z;},done:()=>moved>6},
    {t:()=>'Hold Shift while moving to sprint. Sprinting uses stamina.',done:()=>P.st<ST_MAX-15},
    {id:'fight',t:()=>`Nest guards! Strike them: click or press F (${crits.length} left).`,done:()=>!crits.length},
    {start:()=>{S.salves=Math.max(S.salves,1);if(P.hp>=maxHp())P.hp=maxHp()-30;TUTF.salve=false;},t:()=>'You are hurt. Press H to drink a healing salve.',done:()=>TUTF.salve},
    {id:'choose',t:()=>'The mother dragon is asleep. Walk into her nest, stand next to an egg and press E to take it: Lightning, Poison, Fire or Ice.',done:()=>!!chosen},
    {start:wake,t:()=>'She woke up! Carry your egg to the golden portal behind you. Sprint with Shift and dodge her fire.',
      done:()=>portal&&Math.hypot(P.x-portal.position.x,P.z-portal.position.z)<2.8},
  ];
  function hitCrit(c,dmg){c.hp-=dmg;c.m.userData.flash=.12;if(c.hp<=0){sc.remove(c.m);crits.splice(crits.indexOf(c),1);}}
  function shoot(){const from=dragonMouth(mom);dragonBreathe(mom,.6);const to=new THREE.Vector3(P.x+rnd(-1,1),1,P.z+rnd(-1,1));
    const s=mesh(new THREE.SphereGeometry(.45,10,8),new THREE.MeshStandardMaterial({color:0xe2552b,emissive:0xe2552b,emissiveIntensity:1.5}));s.position.copy(from);sc.add(s);fxFireball(s,0xe2552b,1);
    proj.push({m:s,v:to.sub(from).normalize().multiplyScalar(13),life:0});}
  return{kind:'tutorial',tut:true,scene:sc,colliders,interact,radius:42,squireTargets:()=>[],
    arrowTargets:()=>stepId()==='fight'?crits.map(c=>({x:c.m.position.x,z:c.m.position.z,r:1.2,h:1.4,hit:d=>{if(crits.includes(c))hitCrit(c,d);}})):[],
    dynCollide(){if(awake)return;const dx=P.x-mom.position.x,dz=P.z-mom.position.z,d=Math.hypot(dx,dz),m=4.5;if(d<m&&d>1e-4){P.x=mom.position.x+dx/d*m;P.z=mom.position.z+dz/d*m;}},
    onAttack(dmg){if(stepId()!=='fight')return;for(const c of crits.slice()){const d=Math.hypot(c.m.position.x-P.x,c.m.position.z-P.z);if(d<3.2&&facing(c.m.position.x,c.m.position.z)>.3)hitCrit(c,dmg);}},
    onDeath(){P.hp=maxHp();P.x=0;P.z=awake?-2:30;P.yaw=awake?Math.PI:0;hurtA=.9;for(const p of proj)sc.remove(p.m);proj.length=0;toast('You went down. In the tutorial you get straight back up.','bad');},
    abandon(){eggVM.visible=false;finishMission({kind:'tutorial',success:false});},
    update(dt,t,active){
      for(const e of eggs)if(e.m.parent){const s=1+Math.sin(t*3+e.ph)*.04;e.m.scale.set(s,1.35*s,s);}
      if(!awake){mom.children[0].scale.y=.8+Math.sin(t*1.2)*.03;mom.userData.wingL.rotation.z=.15;mom.userData.wingR.rotation.z=-.15;}
      if(portal)portal.userData.disc.material.opacity=.45+Math.sin(t*3)*.15;
      if(!active)return;
      if(stepI<0||steps[stepI].done()){if(stepI>=0)toast('Step complete.','good');stepI++;
        if(stepI>=steps.length){startTutorialRide(chosen);return;}if(steps[stepI].start)steps[stepI].start();}
      const st=steps[stepI];if(st.tick)st.tick(dt);setObjective(`Tutorial ${stepI+1}/${steps.length} · ${st.t()}`);
      for(const c of crits){enemyAnim(c.m,dt);if(stepId()!=='fight')continue;c.cd-=dt;const dx=P.x-c.m.position.x,dz=P.z-c.m.position.z,d=Math.hypot(dx,dz)||1e-3;
        if(d<24&&d>1.3){c.m.position.x+=dx/d*4*dt;c.m.position.z+=dz/d*4*dt;c.m.rotation.y=Math.atan2(dx,dz);c.m.position.y=Math.abs(Math.sin(t*12))*.1;}
        if(d<1.7&&c.cd<=0){enemyStrike(c.m);hurt(3);c.cd=1.1;}}
      if(awake){momT+=dt;flap(mom,t,6,.7);
        if(momT<2){mom.position.y=1.4+momT*5;}
        else{momAng+=dt*.4;const tx=Math.cos(momAng)*18,tz=Math.sin(momAng)*18-4,k=Math.min(1,dt*2);mom.position.x+=(tx-mom.position.x)*k;mom.position.y+=(11-mom.position.y)*k;mom.position.z+=(tz-mom.position.z)*k;
          mom.lookAt(P.x,mom.position.y,P.z);fireCD-=dt;if(fireCD<=0){shoot();fireCD=2.6;}}}
      for(let i=proj.length-1;i>=0;i--){const p=proj[i];p.life+=dt;p.m.position.addScaledVector(p.v,dt);
        const dx=p.m.position.x-P.x,dy=p.m.position.y-1.2,dz=p.m.position.z-P.z;
        if(dx*dx+dy*dy+dz*dz<1.4){hurt(6);fxExplode(p.m.position,0xe2552b,1.2);sc.remove(p.m);proj.splice(i,1);continue;}
        if(p.m.position.y<.3||p.life>5){if(p.m.position.y<.3)fxExplode(p.m.position,0xe2552b,1.8);sc.remove(p.m);proj.splice(i,1);}}}};
}
function startPracticeRange(){if(S.carriedEgg)return;closePanel(true);missionOver=false;if(!S.rangeWeapon)S.rangeWeapon=S.weapon;
  setScene(buildPatrol({lvl:1,range:true,seed:Math.floor(Math.random()*1e9)}));P.x=0;P.z=91;P.y=0;P.yaw=0;P.pitch=0;P.hp=maxHp();save();
  toast('Practice range: walk up to a tablet and press E. Nothing here costs anything.');}
function startTutorial(){for(const k in TUTF)delete TUTF[k];closePanel(true);missionOver=false;
  if(S.tutDragon&&S.dragons.some(d=>d.id===S.tutDragon)){startTutorialRide(null);return;}
  setScene(buildTutorialNest());P.x=0;P.z=34;P.yaw=0;P.pitch=0;P.hp=maxHp();save();
  toast('Tutorial: learn the basics, then take your first dragon egg.');}
function startTutorialRide(el){eggVM.visible=false;let d=S.dragons.find(x=>x.id===S.tutDragon);
  if(!d){d=makeDragonFromEgg({rarity:'uncommon',element:el||'fire',lvl:1});d.growth=100;d.imprint=40;S.dragons.push(d);S.tutDragon=d.id;}
  S.active=d.id;save();missionOver=false;
  setScene(buildPatrol({lvl:1,tut:true,seed:Math.floor(Math.random()*1e9)}));P.x=0;P.z=90;P.y=0;P.yaw=0;P.pitch=0;P.hp=maxHp();
  toast(el?`Seasons pass. Your ${ELEMENTS[el].name} egg hatched and grew into ${d.name}. Time to learn to ride.`:`Back to riding practice with ${d.name}.`,'good');}
