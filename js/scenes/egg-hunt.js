// ========================================================================
// DragonBlood · Scene: Egg hunt
// On foot: kill the mother dragon, extract her egg, escape the wild dragons.
// ========================================================================
'use strict';
function buildEggMission(cfg){
  const E=ELEMENTS[cfg.element],ri=rIdx(cfg.rarity),RR=RARITY[ri];
  const sc=baseScene(0x2b1714,26,115);
  const colliders=[],interact=[];
  const ground=mesh(new THREE.CircleGeometry(62,48),M(0x2c2321));ground.rotation.x=-Math.PI/2;sc.add(ground);
  for(let i=0;i<42;i++){const a=i/42*Math.PI*2,h=9+Math.random()*12;sc.add(mesh(new THREE.ConeGeometry(4+Math.random()*3,h,5),M(0x221a18),Math.sin(a)*48,h/2-.5,Math.cos(a)*48));}
  const rand=rng(cfg.seed);
  for(let i=0;i<18;i++){const a=rand()*Math.PI*2,r=12+rand()*26,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.hypot(x,z-26)<7)continue;
    const s=1.2+rand()*2.2;const rock=mesh(new THREE.DodecahedronGeometry(s,0),M(0x3a2e2a),x,s*.6,z);rock.rotation.set(rand()*3,rand()*3,0);sc.add(rock);colliders.push({x,z,r:s*.9,obj:rock});}
  addWall(sc,colliders,-17,13,.8,9);addWall(sc,colliders,17,13,-.8,9);addWall(sc,colliders,0,-20,0,11);
  const lava=mesh(new THREE.CircleGeometry(4.2,32),new THREE.MeshStandardMaterial({color:0xff5a1a,emissive:0xff4a10,emissiveIntensity:1.1}));lava.rotation.x=-Math.PI/2;lava.position.y=.05;sc.add(lava);
  const rim=mesh(new THREE.TorusGeometry(4.6,.7,6,24),M(0x1e1614));rim.rotation.x=Math.PI/2;rim.position.y=.2;sc.add(rim);
  const lavaLight=new THREE.PointLight(0xff6a2a,2.2,28);lavaLight.position.set(0,3,0);sc.add(lavaLight);
  const scale=2.1+ri*.35;
  const boss=makeDragon(E.color,scale,cfg.element);boss.position.set(0,12,-22);sc.add(boss);
  const hpMax=Math.round(RR.hp*(1+.55*(cfg.party-1))*(1+.12*(cfg.lvl-1)));
  const dmgMul=(1+.25*(cfg.party-1))*(1+.08*(cfg.lvl-1))*(1+ri*.08);
  const B={hp:hpMax,max:hpMax,mode:'fly',t:0,ang:-Math.PI/2,fireCD:2.2,sweepCD:1.5,from:new THREE.Vector3(),to:new THREE.Vector3()};
  const allies=[];const AN=['Bren','Sefa'];
  for(let i=0;i<cfg.party-1;i++){const n=makeNPC(i?0x5f8fb0:0x8fae5f);n.position.set(i?3:-3,0,27);sc.add(n);const lab=makeLabel(AN[i],'Ally',.5);lab.position.y=2.7;n.add(lab);allies.push({m:n,cd:0,i});}
  let phase='fight',eggMesh=null,portal=null,spawnLeft=0,spawnT=0,bossKilled=false,lastBurn=0;
  // On-foot mission rules: timed, running out of time fails, dying respawns at the last checkpoint.
  let timeLeft=cfg.timeLimit||900,objText='',checkpoint={x:0,z:27},deaths=0;
  const obj=t=>{objText=t;};
  const proj=[],wild=[];
  const wildCount=Math.min(8,2+cfg.party+ri);
  const bossTitle=`${RR.name} ${E.name} Mother Dragon`;
  showBoss(bossTitle,1);obj('Wait for the mother dragon to land, then strike her on foot. Dodge her fire.');

  function end(success,reason){if(missionOver)return;finishMission({kind:'egg',success,reason,cfg,bossKilled});}
  function shootFire(){boss.updateMatrixWorld();const from=boss.localToWorld(new THREE.Vector3(0,1.2,2.6));
    let tx=P.x,tz=P.z;if(allies.length&&Math.random()<.3){const a=allies[Math.floor(Math.random()*allies.length)].m.position;tx=a.x;tz=a.z;}
    const to=new THREE.Vector3(tx+rnd(-1.5,1.5),1,tz+rnd(-1.5,1.5));const v=to.sub(from).normalize().multiplyScalar(15+ri*1.2);
    const s=mesh(new THREE.SphereGeometry(.45+ri*.05,10,8),new THREE.MeshStandardMaterial({color:E.color,emissive:E.color,emissiveIntensity:1.5}));s.position.copy(from);sc.add(s);proj.push({m:s,v,life:0});}
  function checkDead(){if(B.hp<=0&&B.mode!=='dying'){B.hp=0;B.mode='dying';B.t=0;bossKilled=true;hideBoss();toast('The mother dragon falls.','good');}}
  function startNest(){phase='nest';eggMesh=makeEgg(cfg.element);eggMesh.position.set(0,.75,0);sc.add(eggMesh);
    interact.push({x:0,z:0,r:3.6,enabled:()=>phase==='nest',label:()=>`Extract the egg · ${pct(extractChance())} chance`,action:extract});
    checkpoint={x:0,z:8};toast('Checkpoint reached.','good');
    obj('Wade into the lava nest and take the egg. The lava burns, so be quick.');}
  function extract(){const c=extractChance();if(Math.random()<c){
      phase='escape';sc.remove(eggMesh);eggMesh=null;eggVM.material.color.setHex(E.color);eggVM.material.emissive.setHex(E.color);eggVM.visible=true;
      const a=Math.random()*Math.PI*2;portal=makePortal(0xc9a35a);portal.position.set(Math.sin(a)*38,0,Math.cos(a)*38);portal.lookAt(0,0,0);sc.add(portal);
      spawnLeft=wildCount;spawnT=.5;toast(`Egg extracted. ${wildCount} wild dragons smell it.`,'good');
      checkpoint={x:0,z:7};
      obj('Carry the egg to the golden exit portal. Strike wild dragons to drive them off. They can only take the egg by killing you.');
    }else end(false,`The egg cracked during extraction (${pct(c)} chance). Better tools and a higher rider level raise the odds.`);}
  function spawnWild(){const a=Math.random()*Math.PI*2;const m=makeDragon(new THREE.Color(E.color).lerp(new THREE.Color(0x777777),.45).getHex(),.85,cfg.element);
    m.position.set(Math.sin(a)*44,14,Math.cos(a)*44);sc.add(m);wild.push({m,stun:0,kb:new THREE.Vector3(),ph:Math.random()*6,speed:(8.5+ri*.6)*(1+.04*(cfg.lvl-1))});}

  return{kind:'egg',scene:sc,colliders,interact,radius:42,
    speedMul:()=>phase==='escape'?.85:1,
    arrowTargets(){const t=[];
      if(phase==='fight'&&B.mode!=='dying')t.push({x:boss.position.x,z:boss.position.z,y:boss.position.y-scale*.9,h:scale*2,r:1+scale*1.1,hit:d=>{B.hp-=d*rnd(.9,1.12);boss.userData.flash=.12;checkDead();}});
      if(phase==='escape')for(const w of wild)t.push({x:w.m.position.x,z:w.m.position.z,y:w.m.position.y-1.2,h:2.6,r:1.8,hit:()=>{w.stun=1.6;w.kb.set(w.m.position.x-P.x,0,w.m.position.z-P.z).normalize().multiplyScalar(12);w.m.userData.flash=.15;}});
      return t;},
    squireTargets(){const t=[];
      if(phase==='fight'&&B.mode!=='dying'&&boss.position.y<scale*2.2)t.push({x:boss.position.x,z:boss.position.z,r:1.4+scale*1.1,hit:d=>{B.hp-=d;boss.userData.flash=.12;checkDead();}});
      if(phase==='escape')for(const w of wild)if(w.m.position.y<5.5&&w.stun<=0)t.push({x:w.m.position.x,z:w.m.position.z,r:1.6,hit:()=>{w.stun=1.4;w.kb.set(w.m.position.x-SQ.m.position.x,0,w.m.position.z-SQ.m.position.z).normalize().multiplyScalar(12);w.m.userData.flash=.15;}});
      return t;},
    dynCollide(){if(phase!=='fight'||boss.position.y>scale*2.2)return;const dx=P.x-boss.position.x,dz=P.z-boss.position.z,d=Math.hypot(dx,dz),m=scale*1.15;if(d<m&&d>1e-4){P.x=boss.position.x+dx/d*m;P.z=boss.position.z+dz/d*m;}},
    onDeath(){if(phase==='escape'){eggVM.visible=false;end(false,'A wild dragon killed you and took the egg.');return;}
      deaths++;P.hp=maxHp();P.x=checkpoint.x;P.z=checkpoint.z;P.yaw=0;P.pitch=0;hurtA=.9;
      for(const p of proj)sc.remove(p.m);proj.length=0;
      for(const w of wild){w.stun=3;w.kb.set(w.m.position.x-P.x,0,w.m.position.z-P.z).normalize().multiplyScalar(18);}
      toast(`You fell and respawned at the checkpoint. Deaths: ${deaths}.`,'bad');},
    onAttack(dmg){
      if(phase==='fight'&&B.mode!=='dying'){const low=boss.position.y<scale*2.2,d=Math.hypot(boss.position.x-P.x,boss.position.z-P.z);
        if(low&&d<3.4+scale*1.1&&facing(boss.position.x,boss.position.z)>.35){B.hp-=dmg*rnd(.9,1.12);boss.userData.flash=.12;checkDead();}}
      if(phase==='escape')for(const w of wild){const d=Math.hypot(w.m.position.x-P.x,w.m.position.z-P.z);
        if(d<4.8&&w.m.position.y<5.5&&facing(w.m.position.x,w.m.position.z)>.2){w.stun=1.8;w.kb.set(w.m.position.x-P.x,0,w.m.position.z-P.z).normalize().multiplyScalar(16);w.m.userData.flash=.15;}}},
    update(dt,t,active){
      lava.material.emissiveIntensity=1+Math.sin(t*2)*.25;
      if(!active)return;
      timeLeft-=dt;setObjective(`${objText} · ${fmtShort(timeLeft)} left`);
      if(timeLeft<=0){end(false,'Time ran out. On a timed mission, running out of time counts as failing.');return;}
      tickFlash(boss,dt);
      // boss
      if(phase==='fight'){B.t+=dt;
        flap(boss,t,B.mode==='land'?2:6,B.mode==='land'?.15:.7);
        if(B.mode==='fly'){B.ang+=dt*.33;const tx=Math.cos(B.ang)*22,tz=Math.sin(B.ang)*22,ty=11+Math.sin(t*1.3)*1.2,k=Math.min(1,dt*2);
          boss.position.x+=(tx-boss.position.x)*k;boss.position.y+=(ty-boss.position.y)*k;boss.position.z+=(tz-boss.position.z)*k;
          boss.lookAt(Math.cos(B.ang+.25)*22,ty,Math.sin(B.ang+.25)*22);
          B.fireCD-=dt;if(B.fireCD<=0){shootFire();B.fireCD=Math.max(.75,1.9-ri*.22);}
          if(B.t>7.5){B.mode='descend';B.t=0;B.from.copy(boss.position);const a=Math.random()*Math.PI*2;let lx=P.x+Math.cos(a)*7,lz=P.z+Math.sin(a)*7,d=Math.hypot(lx,lz)||1;
            if(d<8){lx*=8/d;lz*=8/d;}if(d>33){lx*=33/d;lz*=33/d;}B.to.set(lx,scale*.75,lz);}}
        else if(B.mode==='descend'){const k=Math.min(1,B.t/1.4),e=k*k*(3-2*k);boss.position.lerpVectors(B.from,B.to,e);boss.lookAt(P.x,boss.position.y,P.z);
          if(k>=1){B.mode='land';B.t=0;B.sweepCD=1.4;toast('She has landed. Strike now!');}}
        else if(B.mode==='land'){const cur2=boss.rotation.y;boss.lookAt(P.x,boss.position.y,P.z);const want=boss.rotation.y;boss.rotation.y=cur2+(want-cur2)*Math.min(1,dt*2);
          B.sweepCD-=dt;if(B.sweepCD<=0){B.sweepCD=2.1;const d=Math.hypot(P.x-boss.position.x,P.z-boss.position.z);if(d<3+scale*1.2){hurt(13*dmgMul);toast('Tail sweep!','bad');}}
          if(B.t>6.5){B.mode='ascend';B.t=0;B.from.copy(boss.position);}}
        else if(B.mode==='ascend'){const k=Math.min(1,B.t/1.3);boss.position.y=B.from.y+(11-B.from.y)*k*k;if(k>=1){B.mode='fly';B.t=0;B.ang=Math.atan2(boss.position.z,boss.position.x);}}
        else if(B.mode==='dying'){boss.rotation.z+=dt*1.5;boss.position.y=Math.max(scale*.3,boss.position.y-dt*6);if(B.t>2.2){sc.remove(boss);startNest();}}
        if(B.mode!=='dying')setBoss(B.hp/B.max);}
      // projectiles
      for(let i=proj.length-1;i>=0;i--){const p=proj[i];p.life+=dt;p.m.position.addScaledVector(p.v,dt);
        const dx=p.m.position.x-P.x,dy=p.m.position.y-1.2,dz=p.m.position.z-P.z;
        if(dx*dx+dy*dy+dz*dz<1.4){hurt(9*dmgMul);sc.remove(p.m);proj.splice(i,1);continue;}
        if(p.m.position.y<.3||p.life>5){if(Math.hypot(dx,dz)<2.2)hurt(4*dmgMul);sc.remove(p.m);proj.splice(i,1);}}
      // lava burns
      if(Math.hypot(P.x,P.z)<4.3){lastBurn+=dt;if(lastBurn>.25){hurt(3);lastBurn=0;}}
      // allies
      for(const a of allies){a.cd-=dt;let tx,tz;
        if(phase==='fight'&&B.mode==='land'){const bx=boss.position.x,bz=boss.position.z,ang=Math.atan2(a.m.position.z-bz,a.m.position.x-bx);tx=bx+Math.cos(ang)*(2.4+scale);tz=bz+Math.sin(ang)*(2.4+scale);
          if(Math.hypot(a.m.position.x-tx,a.m.position.z-tz)<1.2){B.hp-=dt*12*(1+.1*S.playerLvl);if(Math.random()<dt*3)boss.userData.flash=.08;checkDead();}}
        else{tx=P.x+(a.i?2.6:-2.6);tz=P.z+2.2;}
        const dx=tx-a.m.position.x,dz=tz-a.m.position.z,d=Math.hypot(dx,dz);
        if(d>.3){const sp=Math.min(d,(phase==='escape'?8.5:6.5)*dt);a.m.position.x+=dx/d*sp;a.m.position.z+=dz/d*sp;a.m.rotation.y=Math.atan2(dx,dz);a.m.position.y=Math.abs(Math.sin(t*10))*.12;}
        if(phase==='escape'&&a.cd<=0){for(const w of wild){if(w.stun>0)continue;const wd=Math.hypot(w.m.position.x-a.m.position.x,w.m.position.z-a.m.position.z);
          if(wd<6&&w.m.position.y<6){w.stun=1.4;w.kb.set(w.m.position.x-a.m.position.x,0,w.m.position.z-a.m.position.z).normalize().multiplyScalar(13);a.cd=3.5;break;}}}}
      // escape
      if(phase==='escape'){
        if(spawnLeft>0){spawnT-=dt;if(spawnT<=0){spawnWild();spawnLeft--;spawnT=1.3;}}
        for(const w of wild){flap(w.m,t+w.ph,7,.7);tickFlash(w.m,dt);
          if(w.stun>0){w.stun-=dt;w.m.position.addScaledVector(w.kb,dt);w.kb.multiplyScalar(Math.pow(.15,dt));w.m.position.y+=(6-w.m.position.y)*Math.min(1,dt*2);continue;}
          const dx=P.x-w.m.position.x,dz=P.z-w.m.position.z,d=Math.hypot(dx,dz)||1e-3;
          w.m.position.x+=dx/d*w.speed*dt;w.m.position.z+=dz/d*w.speed*dt;
          const ty=d>9?7:1.4;w.m.position.y+=(ty-w.m.position.y)*Math.min(1,dt*2.2);w.m.lookAt(P.x,w.m.position.y,P.z);
          w.biteCD=Math.max(0,(w.biteCD||0)-dt);
          if(d<2.3&&w.m.position.y<3&&w.biteCD<=0){w.biteCD=1.2;hurt(10*dmgMul);toast('A wild dragon tears at you. If it kills you, it takes the egg.','bad');
            if(missionOver)return;w.stun=.7;w.kb.set(w.m.position.x-P.x,0,w.m.position.z-P.z).normalize().multiplyScalar(8);}}
        if(portal){portal.userData.disc.material.opacity=.45+Math.sin(t*3)*.15;if(Math.hypot(P.x-portal.position.x,P.z-portal.position.z)<2.8)end(true);}}
      if(eggMesh)eggMesh.rotation.y+=dt;}
  };
}
