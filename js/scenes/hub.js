// ========================================================================
// DragonBlood · Scene: Hub
// The kingdom: walls, houses, keep, vendor stalls, hatchery, roost,
// mission gate, war table and holy tree.
// ========================================================================
'use strict';
function buildHub(){
  const k=kingdom(),tier=k.tier,F=FACTIONS[S.faction||'ember'];
  const sc=baseScene(0x3c3140,45,150);
  const colliders=[],interact=[],anim={};
  const ground=mesh(new THREE.PlaneGeometry(400,400),M(0x3c4430));ground.rotation.x=-Math.PI/2;sc.add(ground);
  const plaza=mesh(new THREE.CircleGeometry(17,48),M(0x6a6058));plaza.rotation.x=-Math.PI/2;plaza.position.y=.02;sc.add(plaza);
  const ring=mesh(new THREE.RingGeometry(16.6,17.4,48),M(0x4d453f));ring.rotation.x=-Math.PI/2;ring.position.y=.03;sc.add(ring);
  const path=mesh(new THREE.PlaneGeometry(4,22),M(0x5d554e));path.rotation.x=-Math.PI/2;path.position.set(0,.025,26);sc.add(path);
  // walls grow with tier
  const R=36,seg=36,wallH=2.2+tier*1.3,stone=tier>=2,wallMat=stone?M(0x8b847a):M(0x6e4d2f);
  for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,x=Math.sin(a)*R,z=Math.cos(a)*R;
    if(Math.abs(Math.sin(a))<.12&&z>0)continue;
    const w=mesh(new THREE.BoxGeometry(2*Math.PI*R/seg+.2,wallH,stone?1.4:.6),wallMat,x,wallH/2,z);w.rotation.y=a;sc.add(w);
    if(!stone&&i%2===0){const sp=mesh(new THREE.ConeGeometry(.35,.8,4),wallMat,x,wallH+.4,z);sc.add(sp);}
    if(stone&&i%6===3){sc.add(mesh(new THREE.CylinderGeometry(1.6,1.8,wallH+3,8),wallMat,x,(wallH+3)/2,z));sc.add(mesh(new THREE.ConeGeometry(2,2.4,8),M(F.hex),x,wallH+4.2,z));}}
  if(tier>=1){const arch=mesh(new THREE.BoxGeometry(9,1.2,1.6),wallMat,0,wallH+1.2,R);sc.add(arch);for(const sx of[-4,4])sc.add(mesh(new THREE.BoxGeometry(1.4,wallH+1.8,1.8),wallMat,sx,(wallH+1.8)/2,R));}
  // houses
  const rand=rng(11);const nH=6+tier*5;let placed=0,guard=0;
  while(placed<nH&&guard++<400){const a=rand()*Math.PI*2,rr2=21+rand()*11;if(Math.abs(Math.sin(a))<.3)continue;
    const x=Math.sin(a)*rr2,z=Math.cos(a)*rr2;if(colliders.some(c=>Math.hypot(c.x-x,c.z-z)<5.6))continue;
    const w=3+rand()*2.5,d=3+rand()*2,h=2.4+rand()*1.6+(tier>=3?1.6:0);const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=a;
    g.add(mesh(new THREE.BoxGeometry(w,h,d),M(tier>=2?0xb3a48c:0x8a6a48),0,h/2,0));
    const roof=mesh(new THREE.ConeGeometry(Math.max(w,d)*.78,2.2,4),M(tier>=3?0x47506a:0x7b3d2b),0,h+1.1,0);roof.rotation.y=Math.PI/4;g.add(roof);
    g.add(mesh(new THREE.BoxGeometry(.9,1.6,.1),M(0x3a2618),0,.8,-d/2-.02));
    g.add(mesh(new THREE.PlaneGeometry(.6,.6),new THREE.MeshBasicMaterial({color:0xffc477}),w*.25,h*.62,-d/2-.03));
    g.children[g.children.length-1].rotation.y=Math.PI;
    sc.add(g);colliders.push({x,z,r:Math.max(w,d)*.62});placed++;}
  // keep
  const keepMat=M(tier>=2?0x948b80:0x7a5a3a),kh=7+tier*3.2;
  sc.add(mesh(new THREE.CylinderGeometry(3.2,3.6,kh,10),keepMat,0,kh/2,-27));
  sc.add(mesh(new THREE.ConeGeometry(3.8,3.5,10),M(F.hex),0,kh+1.75,-27));
  colliders.push({x:0,z:-27,r:4.2});
  if(tier>=1)for(const sx of[-6.5,6.5]){const h2=kh*.7;sc.add(mesh(new THREE.CylinderGeometry(2,2.3,h2,8),keepMat,sx,h2/2,-25));sc.add(mesh(new THREE.ConeGeometry(2.5,2.8,8),M(F.hex),sx,h2+1.4,-25));colliders.push({x:sx,z:-25,r:2.6});}
  if(tier>=3){sc.add(mesh(new THREE.BoxGeometry(10,kh*.45,6),keepMat,0,kh*.225,-22));colliders.push({x:-3,z:-21,r:3.4},{x:3,z:-21,r:3.4});}
  if(tier>=4){const crown=mesh(new THREE.TorusGeometry(1.2,.18,6,16),M(0xffd27a,{emissive:0xffb840,emissiveIntensity:1.2}),0,kh+4.6,-27);crown.rotation.x=Math.PI/2;sc.add(crown);anim.crown=crown;}
  // banners
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8,x=Math.sin(a)*15.5,z=Math.cos(a)*15.5;
    sc.add(mesh(new THREE.CylinderGeometry(.07,.07,4.4,6),M(0x2d2420),x,2.2,z));
    const cl=mesh(new THREE.PlaneGeometry(.9,1.6),M(F.hex,{side:THREE.DoubleSide}),x,3.4,z);cl.rotation.y=a;cl.position.x+=Math.cos(a)*.48;cl.position.z-=Math.sin(a)*.48;sc.add(cl);}
  // vendor stalls
  function stall(id,x,z){const V=VENDORS[id];const g=new THREE.Group();g.position.set(x,0,z);g.lookAt(0,0,0);
    g.add(mesh(new THREE.BoxGeometry(2.8,1.05,1),M(0x5a3d26),0,.52,0));
    for(const[sx,sz]of[[-1.3,-1],[1.3,-1],[-1.3,.45],[1.3,.45]])g.add(mesh(new THREE.CylinderGeometry(.08,.08,2.8,6),M(0x3d2a1a),sx,1.4,sz));
    const aw=mesh(new THREE.BoxGeometry(3.2,.08,2.2),M(V.awning),0,2.85,-.3);aw.rotation.x=-.18;g.add(aw);
    const npc=makeNPC(V.awning);npc.position.set(0,0,-1.2);g.add(npc);
    if(id==='smith'){const anv=mesh(new THREE.BoxGeometry(.5,.3,.3),M(0x333338,{metalness:.6}),.8,1.2,.1);g.add(anv);}
    if(id==='alch')for(let i=0;i<3;i++)g.add(mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshStandardMaterial({color:[0x7bc043,0x9b6bff,0xe2552b][i],emissive:[0x7bc043,0x9b6bff,0xe2552b][i],emissiveIntensity:.6}),-.7+i*.35,1.18,.1));
    sc.add(g);const lab=makeLabel(V.name,`Level ${S.vendors[id]}`);lab.position.set(x,3.9,z);sc.add(lab);
    colliders.push({x,z,r:1.6});interact.push({x,z,r:3.8,label:()=>`Trade with the ${V.name}`,action:()=>openVendor(id)});}
  stall('smith',-11,-3);stall('alch',-7,-10.5);stall('armor',7,-10.5);stall('prov',11,-3);
  // hatchery
  {const x=-11,z=8;sc.add(mesh(new THREE.CylinderGeometry(2.6,2.9,.6,16),M(0x5c534c),x,.3,z));
    const nest=mesh(new THREE.TorusGeometry(.8,.25,6,14),M(0x4a3626),x,.75,z);nest.rotation.x=Math.PI/2;sc.add(nest);
    sc.add(mesh(new THREE.SphereGeometry(2.4,20,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xffc89a,transparent:true,opacity:.2,roughness:.1,depthWrite:false}),x,.6,z));
    if(S.hatchery){const e=makeEgg(S.hatchery.element);e.position.set(x,1.35,z);sc.add(e);anim.egg=e;}
    const pl=new THREE.PointLight(0xffa860,S.hatchery?2.2:.7,12);pl.position.set(x,2.5,z);sc.add(pl);
    const lab=makeLabel('Hatchery',S.hatchery?'Incubating':(S.carriedEgg?'Bring the egg here':'Empty'));lab.position.set(x,4.2,z);sc.add(lab);
    colliders.push({x,z,r:2.8});interact.push({x,z,r:4.8,label:()=>S.carriedEgg?'Place the egg in the Hatchery':'Tend the Hatchery',action:()=>openPanel(P_hatch)});}
  // roost
  {const x=11,z=8;sc.add(mesh(new THREE.CylinderGeometry(3,3.3,1,10),M(0x6b625a),x,.5,z));
    sc.add(mesh(new THREE.DodecahedronGeometry(1.1,0),M(0x4e4741),x+1.4,1.5,z-1));
    const d=activeDragon();
    if(d){const dm=makeDragon(ELEMENTS[d.element].color,.45+.55*d.growth/100,d.element);dm.position.set(x,1+.95*dm.scale.x,z);dm.lookAt(0,dm.position.y,0);sc.add(dm);anim.dragon=dm;}
    const lab=makeLabel('Dragon Roost',d?`${d.name} · ${Math.floor(d.growth)}% grown`:'No dragon yet');lab.position.set(x,4.6,z);sc.add(lab);
    colliders.push({x,z,r:3.2});interact.push({x,z,r:5,label:()=>'Visit the Dragon Roost',action:()=>openPanel(P_roost)});}
  // gate
  {const gp=makePortal(F.hex);gp.position.set(0,0,15);sc.add(gp);anim.gate=gp;
    const lab=makeLabel('Mission Gate','Missions · Practice range');lab.position.set(0,6.2,15);sc.add(lab);
    colliders.push({x:-2.6,z:15,r:.5},{x:2.6,z:15,r:.5});interact.push({x:0,z:15,r:4.2,label:()=>'Open the mission board',action:()=>openPanel(P_gate)});}
  // war table
  {const x=0,z=-15;sc.add(mesh(new THREE.BoxGeometry(3.6,1,2.4),M(0x4a3222),x,.5,z));
    REGIONS.forEach((r,i)=>{const o=S.regions[i];sc.add(mesh(new THREE.BoxGeometry(1,.12,1.6),M(FACTIONS[o].hex),x-1.15+i*1.15,1.06,z));});
    const lab=makeLabel('War Table','Region control');lab.position.set(x,3.3,z);sc.add(lab);
    colliders.push({x,z,r:1.9});interact.push({x,z,r:3.8,label:()=>'Study the War Table',action:()=>openPanel(P_war)});}
  // holy tree: combine holy bark and set it into weapon sockets
  {const x=5.5,z=10;const g=new THREE.Group();g.position.set(x,0,z);g.add(mesh(new THREE.CylinderGeometry(.3,.5,3,8),M(0xd8c79a,{emissive:0x5a4a20,emissiveIntensity:.35}),0,1.5,0));
    g.add(mesh(new THREE.IcosahedronGeometry(1.7,1),new THREE.MeshStandardMaterial({color:0xf2e6a8,emissive:0xd8b850,emissiveIntensity:.55,flatShading:true}),0,3.8,0));sc.add(g);
    const lab=makeLabel('Holy Tree','Holy bark · weapon sockets',.6);lab.position.set(x,6.2,z);sc.add(lab);
    colliders.push({x,z,r:1});interact.push({x,z,r:3.2,label:()=>'Visit the Holy Tree',action:()=>openPanel(P_tree)});}
  const center=new THREE.PointLight(0xffb070,.9,40);center.position.set(0,8,0);sc.add(center);
  return{kind:'hub',scene:sc,colliders,interact,radius:33,
    update(dt,t){if(anim.gate){anim.gate.userData.disc.material.opacity=.45+Math.sin(t*2)*.12;}
      if(anim.egg){const s=1+Math.sin(t*3)*.04;anim.egg.scale.set(s,1.35*s,s);}
      if(anim.dragon){flap(anim.dragon,t,1.4,.25);anim.dragon.children[0].scale.y=.8+Math.sin(t*1.6)*.02;}
      if(anim.crown)anim.crown.rotation.z+=dt*.5;},
    onAttack(){}};
}
