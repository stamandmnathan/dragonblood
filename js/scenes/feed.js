// ========================================================================
// DragonBlood · Scene: Dragon feed
// On foot: kill critters and collect food for a hatchling.
// ========================================================================
'use strict';
function buildFeedMission(cfg){
  const E=ELEMENTS[cfg.element];
  const sc=baseScene(E.sky,20,95);
  const colliders=[],interact=[];
  const ground=mesh(new THREE.CircleGeometry(60,48),M(E.ground));ground.rotation.x=-Math.PI/2;sc.add(ground);
  const decoCol=new THREE.Color(E.ground).lerp(new THREE.Color(E.color),.3).getHex();
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2,h=8+Math.random()*9;sc.add(mesh(new THREE.ConeGeometry(4,h,5),M(new THREE.Color(E.ground).multiplyScalar(.7)),Math.sin(a)*49,h/2,Math.cos(a)*49));}
  const rand=rng(cfg.seed);
  for(let i=0;i<28;i++){const a=rand()*Math.PI*2,r=6+rand()*36,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.hypot(x,z-34)<6)continue;
    const h=2+rand()*4,rad=.6+rand()*.9;const c=mesh(new THREE.ConeGeometry(rad,h,5),M(decoCol),x,h/2,z);c.rotation.z=rnd(-.2,.2);sc.add(c);colliders.push({x,z,r:rad,obj:c});}
  addWall(sc,colliders,-14,10,.5,9);addWall(sc,colliders,15,-6,-.5,9);addWall(sc,colliders,-5,-23,0,10);
  const n=8+(cfg.lure?4:0)+(regionBonus('feed')?3:0);const food=[];
  function addFood(x,z){const f=mesh(new THREE.OctahedronGeometry(.35,0),new THREE.MeshStandardMaterial({color:E.color,emissive:E.color,emissiveIntensity:.9}),x,.8,z);sc.add(f);food.push({m:f,ph:Math.random()*6});}
  for(let i=0;i<n;i++){const a=rand()*Math.PI*2,r=8+rand()*32;addFood(Math.sin(a)*r,Math.cos(a)*r);}
  const crits=[];const cc=Math.min(9,5+Math.floor(S.playerLvl/2));
  for(let i=0;i<cc;i++){const a=rand()*Math.PI*2,r=12+rand()*26;const m=makeCritter(E.color);m.position.set(Math.sin(a)*r,0,Math.cos(a)*r);sc.add(m);crits.push({m,hp:36,cd:0});}
  const portal=makePortal(0xc9a35a);portal.position.set(0,0,38);sc.add(portal);
  let collected=0,timeLeft=90,breathCD=0;const parts=[];
  const d=activeDragon();let comp=null;
  if(d&&d.growth>=100){comp=makeDragon(ELEMENTS[d.element].color,.9,d.element);comp.position.set(0,9,30);sc.add(comp);}
  interact.push({x:0,z:38,r:3.4,label:()=>`Return home with ${collected} ${E.food}`,action:()=>end(true)});
  setObjective(`Gather ${E.food} for your ${E.name} dragons. Complete this before time ends.`);
  function end(success,reason){if(missionOver)return;finishMission({kind:'feed',success,reason,cfg,collected});}
  return{kind:'feed',scene:sc,colliders,interact,radius:44,
    squireTargets(){return crits.map(c=>({x:c.m.position.x,z:c.m.position.z,r:1.2,hit:d=>{c.hp-=d;c.m.userData.flash=.12;if(c.hp<=0){const i=crits.indexOf(c);if(i>=0)killCrit(i);}}}));},
    onDeath(){end(false,'You fell. The food you gathered was lost.');},
    onAttack(dmg){for(let i=crits.length-1;i>=0;i--){const c=crits[i];const dd=Math.hypot(c.m.position.x-P.x,c.m.position.z-P.z);
      if(dd<3.2&&facing(c.m.position.x,c.m.position.z)>.3){c.hp-=dmg;c.m.userData.flash=.12;if(c.hp<=0)killCrit(i);}}},
    onBreath(dr){if(breathCD>0){toast(`${dr.name} needs ${breathCD.toFixed(1)}s to draw breath.`);return;}breathCD=3.5;
      const dmg=30+dragonPower(dr),f=fwd();
      for(let i=0;i<24;i++){const p=mesh(new THREE.SphereGeometry(.25,6,5),new THREE.MeshBasicMaterial({color:ELEMENTS[dr.element].color,transparent:true,opacity:.9}),P.x+f.x,1.3,P.z+f.z);
        sc.add(p);parts.push({m:p,v:new THREE.Vector3(f.x*rnd(16,24)+rnd(-3,3),rnd(-1,1.5),f.z*rnd(16,24)+rnd(-3,3)),life:0});}
      for(let i=crits.length-1;i>=0;i--){const c=crits[i];const dd=Math.hypot(c.m.position.x-P.x,c.m.position.z-P.z);
        if(dd<14&&facing(c.m.position.x,c.m.position.z)>.7){c.hp-=dmg;c.m.userData.flash=.2;if(c.hp<=0)killCrit(i);}}},
    update(dt,t,active){
      portal.userData.disc.material.opacity=.45+Math.sin(t*3)*.15;
      for(const f of food){f.m.rotation.y+=dt*2;f.m.position.y=.8+Math.sin(t*2+f.ph)*.18;}
      if(!active)return;
      timeLeft-=dt;breathCD=Math.max(0,breathCD-dt);
      setObjective(`${E.food}: ${collected} gathered · ${fmtShort(timeLeft)} left`);
      if(timeLeft<=0){end(true);return;}
      for(let i=food.length-1;i>=0;i--){const f=food[i];if(Math.hypot(f.m.position.x-P.x,f.m.position.z-P.z)<1.8){sc.remove(f.m);food.splice(i,1);collected++;}}
      for(const c of crits){c.cd-=dt;tickFlash(c.m,dt);const dx=P.x-c.m.position.x,dz=P.z-c.m.position.z,dd=Math.hypot(dx,dz)||1e-3;
        if(dd<20&&dd>1.3){c.m.position.x+=dx/dd*4.8*dt;c.m.position.z+=dz/dd*4.8*dt;c.m.rotation.y=Math.atan2(dx,dz);c.m.position.y=Math.abs(Math.sin(t*12))*.1;}
        if(dd<1.7&&c.cd<=0){hurt(8);c.cd=1;}}
      for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life+=dt;p.m.position.addScaledVector(p.v,dt);p.m.material.opacity=Math.max(0,.9-p.life*1.6);if(p.life>.6){sc.remove(p.m);parts.splice(i,1);}}
      if(comp){const a=t*.6;comp.position.x+=(P.x+Math.cos(a)*7-comp.position.x)*Math.min(1,dt*1.5);comp.position.z+=(P.z+Math.sin(a)*7-comp.position.z)*Math.min(1,dt*1.5);comp.position.y=8+Math.sin(t)*.6;comp.lookAt(P.x+Math.cos(a+.3)*7,comp.position.y,P.z+Math.sin(a+.3)*7);flap(comp,t,5,.6);}
    }};
  function killCrit(i){const c=crits[i];sc.remove(c.m);crits.splice(i,1);if(Math.random()<.35)addFood(c.m.position.x,c.m.position.z);}
}
