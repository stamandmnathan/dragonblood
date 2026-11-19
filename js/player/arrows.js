// ========================================================================
// DragonBlood · Arrows
// Bow projectiles: firing, flight and hit tests.
// ========================================================================
'use strict';
const ARROWS=[];
function fireArrow(dmg){if(!cur)return;const cp=Math.cos(P.pitch),dir=new THREE.Vector3(-Math.sin(P.yaw)*cp,Math.sin(P.pitch),-Math.cos(P.yaw)*cp);
  const m=new THREE.Group();m.add(mesh(new THREE.CylinderGeometry(.02,.02,.8,5),M(0x8a6a48),0,0,0));m.add(mesh(new THREE.ConeGeometry(.045,.12,5),M(0xd0d0d8,{metalness:.7}),0,.44,0));
  m.position.set(P.x+dir.x*.8,P.y+1.6+dir.y*.8,P.z+dir.z*.8);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);cur.scene.add(m);
  ARROWS.push({m,v:dir.multiplyScalar(62),life:0,dmg});}
function arrowsReset(){ARROWS.length=0;}
function arrowsUpdate(dt){if(!ARROWS.length)return;const ts=cur.arrowTargets?cur.arrowTargets():cur.squireTargets?cur.squireTargets():[];
  for(let i=ARROWS.length-1;i>=0;i--){const a=ARROWS[i];a.life+=dt;a.v.y-=4*dt;
    // move in short sub-steps so a fast arrow can't skip past a thin target between frames
    const n=Math.max(1,Math.ceil(a.v.length()*dt/.6)),p=a.m.position;let hit=null,wall=false;
    for(let s=0;s<n&&!hit&&!wall;s++){p.addScaledVector(a.v,dt/n);
      for(const t of ts){const y0=t.y||0,hh=t.h||2.2;if(Math.hypot(t.x-p.x,t.z-p.z)<(t.r||1.2)&&p.y>y0-.3&&p.y<y0+hh){hit=t;break;}}
      wall=!hit&&p.y<2.6&&cur.colliders.some(c=>c.obj&&Math.hypot(c.x-p.x,c.z-p.z)<c.r);}
    a.m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),a.v.clone().normalize());
    if(hit)try{hit.hit(a.dmg);}catch(e){}
    if(hit||wall||p.y<0||a.life>1.3){cur.scene.remove(a.m);a.m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});ARROWS.splice(i,1);}}}
function interact(){if(!started||modalOpen||!cur)return;const it=nearestInteract();if(it)it.action();}
function nearestInteract(){let best=null,bd=1e9;for(const it of cur.interact||[]){if(it.enabled&&!it.enabled())continue;const d=Math.hypot(it.x-P.x,it.z-P.z);if(d<it.r&&d<bd){bd=d;best=it;}}return best;}
function breath(){if(!started||modalOpen||!cur)return;if(cur.kind==='patrol'){cur.onBreath();return;}const d=activeDragon();
  if(!d){toast('You have no dragon yet. Hunt a mother dragon for an egg.');return;}
  if(d.growth<100){toast(`${d.name} is only ${Math.floor(d.growth)}% grown. A dragon fights only when fully raised.`,'bad');return;}
  if(cur.kind==='egg'){toast('Mother dragons are fought on foot. Your dragon stays home.','bad');return;}
  if(!cur.onBreath){toast(`${d.name} is resting at the roost. Take it on a Dragon Feed mission.`);return;}
  cur.onBreath(d);}
function drinkSalve(){if(!started||modalOpen||!cur||cur.kind==='hub')return;if(S.salves<1){toast('No salves left. The Alchemist sells them.','bad');return;}
  if(P.hp>=maxHp()){toast('Already at full health.');return;}S.salves--;TUTF.salve=true;P.hp=Math.min(maxHp(),P.hp+45);toast('+45 health');updateHUD();}
