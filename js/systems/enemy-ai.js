// ========================================================================
// DragonBlood · Enemy behaviour
// AI for the enemy types with their own tactics, shared by the scenes that use
// them (Sky Patrol and the practice range, Dragon Feed):
//   archer       - keeps 9-24 m away, draws, then looses an arrow you can dodge
//   shield       - walks in behind a tower shield; blows and arrows from the
//                  front barely scratch it (hit it from the side or behind, or
//                  use your dragon or a spell)
//   brute        - paws the ground, then charges in a straight line; a hit hurts
//                  and knocks you back, a miss leaves it dazed and taking double
//                  damage for a moment
// Models are in engine/enemy-models.js. Ordinary soldiers keep the simple chase
// in each scene.
// ========================================================================
'use strict';

// --- archer
// a: {m, cd, draw, dmg}. target: {x,y,z} or null when there is nothing to shoot at.
// shoot(from, to) is called when the arrow leaves the bow.
function archerThink(a,dt,target,shoot){const p=a.m.position,u=a.m.userData;a.cd=(a.cd==null?1.5:a.cd)-dt;
  if(!target){u.drawing=false;a.draw=0;return;}
  const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz)||1e-3;
  if(d>42){u.drawing=false;a.draw=0;return;}
  a.m.rotation.y=Math.atan2(dx,dz);
  if(!a.draw){if(d<9){p.x-=dx/d*3.2*dt;p.z-=dz/d*3.2*dt;}else if(d>24){p.x+=dx/d*3.2*dt;p.z+=dz/d*3.2*dt;}}// keep its distance
  if(a.cd<=0&&!a.draw){a.draw=.75;u.drawing=true;}
  if(a.draw){a.draw-=dt;if(a.draw<=0){a.draw=0;u.drawing=false;a.cd=2.4+Math.random()*.8;
    shoot(new THREE.Vector3(p.x+dx/d*.6,p.y+1.45*(a.m.scale.y||1),p.z+dz/d*.6),new THREE.Vector3(target.x,target.y,target.z));}}}

// Enemy arrows. list: the scene's array of arrows. Each arrow drops a little, so it is
// aimed slightly high. hit(pos) returns true when it struck something (the arrow is removed).
function enemyArrow(sc,list,from,to,dmg,speed){speed=speed||34;
  const d=to.clone().sub(from),dist=d.length(),t=dist/speed;d.normalize().multiplyScalar(speed);d.y+=4*t/2;// gravity 4
  const m=new THREE.Group();m.add(mesh(new THREE.CylinderGeometry(.018,.018,.75,4),M(0x8a6a48),0,0,0));
  m.add(mesh(new THREE.ConeGeometry(.04,.12,4),M(0xb8b8c0,{metalness:.7}),0,.42,0));
  const fl=mesh(new THREE.PlaneGeometry(.06,.14),M(0xb03a2a,{side:THREE.DoubleSide}),0,-.3,0);m.add(fl);
  m.position.copy(from);sc.add(m);if(typeof fxTrail==='function')fxTrail(m,{color:0xffe0b0,color1:0x806040,size:.14,life:.18,every:.5});
  list.push({m,v:d,life:0,dmg});}
function enemyArrowsUpdate(sc,list,dt,hit){const up=new THREE.Vector3(0,1,0);
  for(let i=list.length-1;i>=0;i--){const a=list[i];a.life+=dt;a.v.y-=4*dt;a.m.position.addScaledVector(a.v,dt);
    a.m.quaternion.setFromUnitVectors(up,a.v.clone().normalize());
    const struck=hit(a.m.position,a.dmg);
    if(struck||a.m.position.y<.05||a.life>3){if(!struck&&a.m.position.y<.05&&typeof fxDust==='function')fxDust(a.m.position,4);
      sc.remove(a.m);a.m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});list.splice(i,1);}}}

// --- shield-bearer
// True when a blow (src 'melee' or 'arrow') from (fx,fz) lands on the front of the shield.
function shieldBlocks(e,src,fx,fz){if(e.kind!=='shield'||(src!=='melee'&&src!=='arrow'))return false;
  const p=e.m.position,r=e.m.rotation.y,dx=fx-p.x,dz=fz-p.z,d=Math.hypot(dx,dz)||1e-3;
  return (Math.sin(r)*dx+Math.cos(r)*dz)/d>.35;}// facing the attacker within about 70 degrees each side
const SHIELD_KEEP=.15;// share of a blocked hit that still gets through

// --- brute
// b: {m, state, t, cd, dmg}. onHit(dmg, dirX, dirZ) is called when the charge (or a gore) lands.
// R: arena radius, so a charge never leaves the play area.
function bruteThink(b,dt,tx,tz,onHit,R){const p=b.m.position,u=b.m.userData;b.t=(b.t||0)+dt;b.cd=(b.cd==null?2:b.cd)-dt;
  const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz)||1e-3;if(!b.state)b.state='roam';
  if(b.state==='roam'){if(d<28){b.m.rotation.y=Math.atan2(dx,dz);if(d>2.6){p.x+=dx/d*2.8*dt;p.z+=dz/d*2.8*dt;}
      if(b.cd<=0&&d<17&&d>4.5){b.state='wind';b.t=0;u.wind=1;}
      else if(b.cd<=0&&d<=2.8){enemyStrike(b.m);onHit(b.dmg*.5,dx/d,dz/d);b.cd=1.8;}}}// close in: a horn gore
  else if(b.state==='wind'){b.m.rotation.y=Math.atan2(dx,dz);// paws the ground: the warning
    if(b.t>.9){b.state='charge';b.t=0;u.wind=0;u.charge=1;b.dir={x:dx/d,z:dz/d};}}
  else if(b.state==='charge'){p.x+=b.dir.x*18*dt;p.z+=b.dir.z*18*dt;
    if(typeof fxDust==='function'&&Math.random()<.5)fxDust(new THREE.Vector3(p.x,.2,p.z),1);
    const r=Math.hypot(p.x,p.z);if(R&&r>R){p.x*=R/r;p.z*=R/r;b.t=99;}// hit the edge of the arena
    if(Math.hypot(tx-p.x,tz-p.z)<2.1){onHit(b.dmg,b.dir.x,b.dir.z);u.charge=0;b.state='roam';b.cd=3;b.t=0;return;}
    if(b.t>1.25){u.charge=0;u.dazed=1;b.state='dazed';b.t=0;}}// missed: dazed
  else if(b.state==='dazed'&&b.t>2.2){u.dazed=0;b.state='roam';b.cd=2.5;b.t=0;}}
const bruteMul=b=>b.state==='dazed'?2:1;// dazed brutes take double damage
